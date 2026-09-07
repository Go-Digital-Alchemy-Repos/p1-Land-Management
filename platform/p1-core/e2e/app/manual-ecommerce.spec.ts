import { expect, test } from "@playwright/test";
import pg from "pg";

function fixtureDatabase() {
  const value = process.env.BROWSER_TEST_DATABASE_URL;
  if (!value) throw new Error("Explicit browser test database required");
  const url = new URL(value);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.pathname !== "/core_browser_test" ||
    url.search ||
    url.hash
  )
    throw new Error("Only isolated loopback browser database is allowed");
  return new pg.Pool({
    connectionString: value,
    max: 1,
    connectionTimeoutMillis: 10000,
    query_timeout: 15000,
    statement_timeout: 10000,
  });
}

test("offline manual order, paid replay, manual refund and fulfillment guards", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const database = fixtureDatabase();
  try {
    await page.goto("/auth/login");
    await page.getByTestId("input-email").fill("browser-admin@example.test");
    await page.getByTestId("input-password").fill("CoreBrowserTest!2026");
    await page.getByTestId("button-login").click();
    await expect(page).not.toHaveURL(/\/auth\/login/);
    const before = Number(
      (
        await database.query(
          "SELECT inventory_quantity FROM ecommerce_product_variants WHERE id='browser-manual-variant'",
        )
      ).rows[0].inventory_quantity,
    );
    await page.goto("/admin/ecommerce/orders");
    await page.getByRole("button", { name: "Create order", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: /Browser offline customer/ }).click();
    await dialog.getByRole("button", { name: "Next", exact: true }).click();
    await dialog.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "Browser offline product", exact: true }).click();
    await dialog.getByRole("button", { name: "Next", exact: true }).click();
    await dialog.getByRole("button", { name: "Next", exact: true }).click();
    await dialog.getByRole("button", { name: "Next", exact: true }).click();
    await dialog.getByRole("button", { name: "Mark paid externally", exact: true }).click();
    await dialog.getByRole("combobox").click();
    await page.getByRole("option", { name: "Cash", exact: true }).click();
    await dialog
      .getByPlaceholder("Receipt or terminal reference")
      .fill("synthetic-offline-receipt");
    const created = page.waitForResponse(
      (r) => r.url().endsWith("/orders/manual-draft") && r.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "Create", exact: true }).click();
    const response = await created;
    expect(response.status(), await response.text()).toBe(201);
    const order = await response.json();
    expect(order.paymentStatus).toBe("paid");
    await expect(dialog).not.toBeVisible();
    const replay = await Promise.all(
      [1, 2].map(() =>
        page.request.post(`/api/admin/ecommerce/orders/${order.id}/mark-paid`, {
          data: { method: "cash", reference: "synthetic-offline-receipt" },
        }),
      ),
    );
    for (const result of replay) expect(result.status(), await result.text()).toBe(200);
    const effects = await database.query(
      "SELECT count(*)::int AS count,sum(delta)::int AS delta FROM ecommerce_inventory_adjustments WHERE order_id=$1 AND reason='order_paid'",
      [order.id],
    );
    expect(effects.rows[0]).toEqual({ count: 1, delta: -1 });
    expect(
      Number(
        (
          await database.query(
            "SELECT inventory_quantity FROM ecommerce_product_variants WHERE id='browser-manual-variant'",
          )
        ).rows[0].inventory_quantity,
      ),
    ).toBe(before - 1);
    const settled = (
      await database.query(
        "SELECT payment_status,manual_payment_method FROM ecommerce_orders WHERE id=$1",
        [order.id],
      )
    ).rows[0];
    expect(settled.payment_status).toBe("paid");
    expect(settled.manual_payment_method).toBe("cash");
    expect(
      Number(
        (
          await database.query(
            "SELECT count(*) FROM ecommerce_notification_jobs WHERE order_id=$1 AND type='order_confirmation'",
            [order.id],
          )
        ).rows[0].count,
      ),
    ).toBe(1);
    await page.goto("/admin/ecommerce/refunds");
    await page.getByPlaceholder("Order ID", { exact: true }).fill(order.id);
    await page.getByPlaceholder("Amount", { exact: true }).fill("5.00");
    const refunded = page.waitForResponse(
      (r) => r.url().endsWith("/ecommerce/refunds") && r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Create refund", exact: true }).click();
    const refund = await refunded;
    expect(refund.status()).toBe(201);
    await expect(
      page.getByRole("status").filter({ hasText: "Refund request recorded." }),
    ).toHaveText("Refund request recorded.");
    await page.getByPlaceholder("Amount", { exact: true }).fill("25.00");
    const overRefund = page.waitForResponse(
      (r) => r.url().endsWith("/ecommerce/refunds") && r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Create refund", exact: true }).click();
    const tooMuch = await overRefund;
    expect(tooMuch.status()).toBe(400);
    await expect(
      page.getByRole("alert").filter({ hasText: "Refund amount exceeds refundable balance" }),
    ).toContainText("Refund amount exceeds refundable balance");
    const rows = (
      await database.query("SELECT amount,status,source FROM ecommerce_refunds WHERE order_id=$1", [
        order.id,
      ])
    ).rows;
    expect(rows).toEqual([{ amount: 500, status: "processed", source: "manual" }]);
    const details = await (
      await page.request.get(`/api/admin/ecommerce/orders/${order.id}`)
    ).json();
    const shipped = await page.request.post(
      `/api/admin/ecommerce/orders/${order.id}/fulfillments`,
      {
        data: {
          fulfillment: { status: "shipped", trackingNumber: "SYNTHETIC" },
          items: [{ orderItemId: details.items[0].id, quantity: 1 }],
        },
      },
    );
    expect(shipped.status(), await shipped.text()).toBe(201);
    const duplicateShipment = await page.request.post(
      `/api/admin/ecommerce/orders/${order.id}/fulfillments`,
      {
        data: {
          fulfillment: { status: "shipped" },
          items: [{ orderItemId: details.items[0].id, quantity: 1 }],
        },
      },
    );
    expect(duplicateShipment.status()).toBe(400);
    const draftResponse = await page.request.post("/api/admin/ecommerce/orders/manual-draft", {
      data: {
        customerId: "browser-manual-customer",
        items: [
          { productId: "browser-manual-product", variantId: "browser-manual-variant", quantity: 1 },
        ],
        paymentAction: "save_draft",
      },
    });
    expect(draftResponse.status()).toBe(201);
    const draft = await draftResponse.json();
    const unpaidShip = await page.request.put(`/api/admin/ecommerce/orders/${draft.id}`, {
      data: { status: "shipped" },
    });
    expect(unpaidShip.status()).toBe(400);
    const draftDetails = await (
      await page.request.get(`/api/admin/ecommerce/orders/${draft.id}`)
    ).json();
    expect(draftDetails.items).toHaveLength(1);
    const paidBeforeCancellation = await page.request.post(
      `/api/admin/ecommerce/orders/${draft.id}/mark-paid`,
      { data: { method: "cash", reference: "synthetic-cancellation-guard" } },
    );
    expect(paidBeforeCancellation.status()).toBe(200);
    const capturedCancellation = await page.request.put(`/api/admin/ecommerce/orders/${draft.id}`, {
      data: { status: "cancelled" },
    });
    expect(capturedCancellation.status()).toBe(400);
    expect(await capturedCancellation.json()).toMatchObject({
      message: "Captured payments must be fully refunded before an order is cancelled",
    });
    const fullRefund = await page.request.post("/api/admin/ecommerce/refunds", {
      data: { orderId: draft.id, amount: draft.totalAmount, source: "manual", type: "full" },
    });
    expect(fullRefund.status()).toBe(201);
    const cancelled = await page.request.put(`/api/admin/ecommerce/orders/${draft.id}`, {
      data: { status: "cancelled" },
    });
    expect(cancelled.status()).toBe(200);
    const cancelledShip = await page.request.post(
      `/api/admin/ecommerce/orders/${draft.id}/fulfillments`,
      {
        data: {
          fulfillment: { status: "shipped" },
          items: [{ orderItemId: draftDetails.items[0].id, quantity: 1 }],
        },
      },
    );
    expect(cancelledShip.status()).toBe(400);
    expect(await cancelledShip.json()).toMatchObject({
      message: "Only paid orders can be shipped",
    });
    // Valid cancelled orders are unpaid/refunded: the payment guard runs before the status guard.
    const cancelledDetails = await (
      await page.request.get(`/api/admin/ecommerce/orders/${draft.id}`)
    ).json();
    expect(cancelledDetails).toMatchObject({ status: "cancelled", paymentStatus: "refunded" });
    const reactivated = await page.request.put(`/api/admin/ecommerce/orders/${draft.id}`, {
      data: { status: "paid" },
    });
    expect(reactivated.status()).toBe(400);
    expect(await reactivated.json()).toMatchObject({
      message: "Cancelled orders cannot be reactivated",
    });
    expect(tooMuch.status()).toBe(400);
  } finally {
    await database.end();
  }
});
