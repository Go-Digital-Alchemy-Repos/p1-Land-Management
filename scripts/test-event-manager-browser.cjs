const { chromium } = require(
  process.cwd() + "/platform/p1-core/node_modules/@playwright/test",
);
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1400, height: 1000 },
      timezoneId: "America/New_York",
    });
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    let deny = false,
      fail = true,
      saved,
      created,
      duplicates = 0;
    let directoryFail = true,
      referenceFail = false,
      venueSaved,
      venueWrites = 0,
      deleted = 0;
    let formsFail = true;
    let attendanceWrites = 0,
      attendeeLoadFails = true,
      attendanceFails = true;
    let attendee = {
      id: "person",
      eventId: "event",
      fullName: "Example Guest",
      email: "guest@example.test",
      phone: null,
      status: "confirmed",
      paymentStatus: "paid",
      notes: "<script>unsafe()</script>",
      attended: false,
      checkedInAt: null,
      registeredAt: "2026-09-17T12:00:00Z",
      canceledAt: null,
    };
    let venues = [
      {
        id: "venue",
        name: "Field venue",
        slug: "field-venue",
        address: "100 Example Lane",
        city: "Greenville",
        region: "SC",
        parkingInfo: "North entrance",
        latitude: "34.85",
        longitude: "-82.39",
        isVirtual: false,
      },
    ];
    let organizers = [
      {
        id: "organizer",
        name: "Host team",
        slug: "host-team",
        description: "Saved host bio",
        email: "host@example.test",
        imageUrl: "/uploads/host.png",
      },
    ];
    let event = {
      id: "event",
      title: "Field workshop",
      slug: "field-workshop",
      date: "2026-10-01T13:00:00.123Z",
      endDate: "2026-10-01T14:00:00Z",
      timezone: "America/New_York",
      status: "published",
      visibility: "members_only",
      description: "<p>Saved description</p>",
      venueId: "venue",
      locationName: "Custom event location",
      speakerName: "Custom event speaker",
      registrationEnabled: true,
      registrationFee: 12500,
      registrationType: "paid",
      registrationFormId: "saved-form",
      isRecurring: true,
      recurrencePattern: "weekly",
      recordingUrl: "https://example.test/recording",
      tags: ["saved"],
      createdAt: "2026-09-17T00:00:00Z",
    };
    await page.route("**/api/**", async (route) => {
      const req = route.request(),
        path = new URL(req.url()).pathname;
      let body = [];
      if (path === "/api/v1/marketing/cms/events/registration-forms") {
        if (formsFail)
          return route.fulfill({
            status: 503,
            json: { message: "Synthetic form catalog failure" },
          });
        body = [
          { id: "active-form", name: "Workshop RSVP", slug: "workshop-rsvp" },
        ];
      }

      if (path === "/api/v1/marketing/cms/events/event/attendees") {
        if (attendeeLoadFails)
          return route.fulfill({
            status: 503,
            json: { message: "Attendees temporarily unavailable" },
          });
        body = [attendee];
      }
      if (
        path === "/api/v1/marketing/cms/events/event/attendees/person/checkin"
      ) {
        attendanceWrites++;
        assert.deepEqual(Object.keys(req.postDataJSON()), ["attended"]);
        if (attendanceFails)
          return route.fulfill({
            status: 503,
            json: { message: "Attendance temporarily unavailable" },
          });
        attendee = {
          ...attendee,
          attended: req.postDataJSON().attended,
          checkedInAt: req.postDataJSON().attended
            ? "2026-09-17T13:00:00Z"
            : null,
        };
        body = attendee;
      }

      if (path === "/api/v1/setup")
        body = { initialized: true, configured: true };
      if (path === "/api/v1/me")
        body = {
          id: "synthetic",
          name: "Events editor",
          role: "member",
          capabilities: deny ? [] : ["marketing.content.events"],
          mfaRequired: false,
        };
      if (path === "/api/v1/marketing/cms/events") {
        if (req.method() === "POST") {
          created = req.postDataJSON();
          body = { ...created, id: "new", slug: "new-event" };
        } else body = [event];
      }
      if (path === "/api/v1/marketing/cms/events/event") {
        if (req.method() === "PUT") {
          saved = req.postDataJSON();
          if (fail)
            return route.fulfill({
              status: 503,
              json: { message: "Synthetic save failure" },
            });
          event = { ...event, ...saved };
        }
        body = event;
      }
      if (path === "/api/v1/marketing/cms/events/event/duplicate") {
        duplicates++;
        body = {
          ...event,
          id: "copy",
          title: "Copy of Field workshop",
          status: "draft",
        };
      }
      if (path === "/api/v1/marketing/cms/events/copy")
        body = {
          ...event,
          id: "copy",
          title: "Copy of Field workshop",
          status: "draft",
        };
      if (path === "/api/v1/marketing/cms/events/venues") {
        if (referenceFail)
          return route.fulfill({
            status: 503,
            json: { message: "Reference failure" },
          });
        if (req.method() === "POST") {
          const row = {
            ...req.postDataJSON(),
            id: "new-venue",
            slug: "new-venue",
          };
          venues.push(row);
          body = row;
        } else body = venues;
      }
      if (
        path === "/api/v1/marketing/cms/events/venues/venue" &&
        req.method() === "PUT"
      ) {
        venueWrites++;
        venueSaved = req.postDataJSON();
        if (directoryFail)
          return route.fulfill({
            status: 503,
            json: { message: "Venue save failed" },
          });
        venues[0] = { ...venues[0], ...venueSaved };
        body = venues[0];
      }
      if (
        path === "/api/v1/marketing/cms/events/venues/new-venue" &&
        req.method() === "DELETE"
      ) {
        deleted++;
        venues = venues.filter((row) => row.id !== "new-venue");
        body = { message: "Venue deleted" };
      }
      if (path === "/api/v1/marketing/cms/events/organizers") body = organizers;
      if (
        path === "/api/v1/marketing/cms/events/organizers/organizer" &&
        req.method() === "PUT"
      ) {
        organizers[0] = { ...organizers[0], ...req.postDataJSON() };
        body = organizers[0];
      }
      await route.fulfill({ json: body });
    });
    await page.goto("http://127.0.0.1:4347/marketing/content/events");
    await page
      .getByRole("button", { name: "Manage venues", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Edit Field venue", exact: true })
      .click();
    await page.getByLabel("Name", { exact: true }).fill("Updated venue");
    await page.getByRole("button", { name: "Save venue", exact: true }).click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Venue save failed" })
      .waitFor();
    assert.equal(
      await page.getByLabel("Name", { exact: true }).inputValue(),
      "Updated venue",
    );
    directoryFail = false;
    await page.getByRole("button", { name: "Save venue", exact: true }).click();
    await page.getByText("Venue saved.", { exact: true }).waitFor();
    assert.equal(venueSaved.parkingInfo, "North entrance");
    await page
      .getByRole("button", { name: "Create venue", exact: true })
      .click();
    await page.getByLabel("Name", { exact: true }).fill("New venue");
    await page.getByRole("button", { name: "Save venue", exact: true }).click();
    await page
      .getByRole("button", { name: "Delete New venue", exact: true })
      .waitFor();
    page.once("dialog", (d) => d.dismiss());
    await page
      .getByRole("button", { name: "Delete New venue", exact: true })
      .click();
    assert.equal(deleted, 0);
    page.once("dialog", (d) => {
      assert(d.message().includes("their link"));
      return d.accept();
    });
    await page
      .getByRole("button", { name: "Delete New venue", exact: true })
      .click();
    await page.getByText("Venue deleted.", { exact: true }).waitFor();
    assert.equal(deleted, 1);
    await page
      .getByRole("button", { name: "Back to events", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Manage organizers", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Edit Host team", exact: true })
      .click();
    assert.equal(
      await page
        .getByRole("button", { name: "Choose organizer image", exact: true })
        .count(),
      0,
    );
    await page
      .getByLabel("Email", { exact: true })
      .fill("updated@example.test");
    await page
      .getByRole("button", { name: "Save organizer", exact: true })
      .click();
    await page.getByText("Organizer saved.", { exact: true }).waitFor();
    assert.equal(organizers[0].imageUrl, "/uploads/host.png");
    await page
      .getByRole("button", { name: "Back to events", exact: true })
      .click();
    referenceFail = true;

    await page
      .getByText("10/1/2026, 9:00:00 AM · America/New_York", { exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Edit Field workshop", exact: true })
      .click();
    assert.equal(
      await page.getByLabel("Start date", { exact: true }).inputValue(),
      "2026-10-01T09:00",
    );
    assert.equal(
      await page.getByLabel("Visibility", { exact: true }).inputValue(),
      "members_only",
    );
    await page
      .getByRole("alert")
      .filter({ hasText: "choices could not be loaded" })
      .waitFor();
    assert.equal(
      await page.getByLabel("Shared venue", { exact: true }).inputValue(),
      "venue",
    );
    referenceFail = false;
    await page
      .getByRole("button", { name: "Retry shared records", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Use venue details", exact: true })
      .waitFor();
    assert.equal(
      await page.getByLabel("Location name", { exact: true }).inputValue(),
      "Custom event location",
    );
    page.once("dialog", (d) => d.dismiss());
    await page
      .getByRole("button", { name: "Use venue details", exact: true })
      .click();
    assert.equal(
      await page.getByLabel("Location name", { exact: true }).inputValue(),
      "Custom event location",
    );
    page.once("dialog", (d) => d.accept());
    await page
      .getByRole("button", { name: "Use venue details", exact: true })
      .click();
    assert.equal(
      await page.getByLabel("Location name", { exact: true }).inputValue(),
      "Updated venue",
    );
    await page
      .getByLabel("Shared organizer", { exact: true })
      .selectOption("organizer");
    assert.equal(
      await page.getByLabel("Speaker name", { exact: true }).inputValue(),
      "Custom event speaker",
    );
    page.once("dialog", (d) => d.accept());
    await page
      .getByRole("button", { name: "Use organizer details", exact: true })
      .click();
    assert.equal(
      await page.getByLabel("Speaker name", { exact: true }).inputValue(),
      "Host team",
    );
    assert.equal(venueWrites, 2);
    await page
      .getByRole("button", { name: "Retry registration forms", exact: true })
      .waitFor();
    assert.equal(
      await page.getByLabel("Registration form", { exact: true }).inputValue(),
      "saved-form",
    );
    formsFail = false;
    await page
      .getByRole("button", { name: "Retry registration forms", exact: true })
      .click();
    await page
      .getByLabel("Registration form", { exact: true })
      .selectOption("active-form");
    await page.getByLabel("Capacity", { exact: true }).fill("25");
    await page.getByLabel("Approval", { exact: true }).selectOption("manual");
    await page.getByLabel("Enable waitlist", { exact: true }).check();
    await page
      .getByLabel("Registration opens", { exact: true })
      .fill("2026-09-20T09:00");
    await page
      .getByLabel("Registration closes", { exact: true })
      .fill("2026-09-30T17:00");
    await page.getByLabel("Title", { exact: true }).fill("Updated workshop");
    page.once("dialog", (d) => d.dismiss());
    await page.getByRole("button", { name: "Save event", exact: true }).click();
    assert.equal(saved, undefined);
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Save event", exact: true }).click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Synthetic save failure" })
      .waitFor();
    assert.equal(
      await page.getByLabel("Title", { exact: true }).inputValue(),
      "Updated workshop",
    );
    assert.equal(saved.date, "2026-10-01T13:00:00.123Z");
    assert.equal(saved.description, event.description);
    assert.deepEqual(saved.tags, ["saved"]);
    assert.equal(saved.registrationFee, 12500);
    assert.equal(saved.registrationFormId, "active-form");
    assert.equal(saved.capacity, 25);
    assert.equal(saved.registrationApprovalMode, "manual");
    assert.equal(saved.waitlistEnabled, true);
    assert.equal(saved.registrationOpensAt, "2026-09-20T13:00:00.000Z");
    assert.equal(saved.registrationClosesAt, "2026-09-30T21:00:00.000Z");
    assert.equal(saved.recurrencePattern, "weekly");
    assert.equal(saved.recordingUrl, event.recordingUrl);
    assert(!Object.hasOwn(saved, "id"));
    assert(!Object.hasOwn(saved, "createdAt"));
    fail = false;
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Save event", exact: true }).click();
    await page.getByText("Event saved.", { exact: true }).waitFor();
    await page
      .getByLabel("Filter status", { exact: true })
      .selectOption("draft");
    await page.getByText("No matching events.", { exact: true }).waitFor();
    await page.getByLabel("Filter status", { exact: true }).selectOption("all");
    page.once("dialog", (d) => d.accept());
    await page
      .getByRole("button", { name: "Duplicate Updated workshop", exact: true })
      .click();
    await page
      .getByRole("heading", {
        name: "Edit Copy of Field workshop",
        exact: true,
      })
      .waitFor();
    assert.equal(duplicates, 1);
    assert.equal(
      await page.getByLabel("Status", { exact: true }).inputValue(),
      "draft",
    );
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page
      .getByRole("button", { name: "Create event", exact: true })
      .click();
    await page.getByLabel("Title", { exact: true }).fill("New event");
    await page
      .getByLabel("Start date", { exact: true })
      .fill("2026-10-02T10:30");
    await page.getByRole("button", { name: "Save event", exact: true }).click();
    await page.getByText("Event saved.", { exact: true }).waitFor();
    assert.equal(created.status, "draft");
    assert.equal(created.date, "2026-10-02T14:30:00.000Z");
    assert.equal(created.registrationEnabled, false);
    await page
      .getByRole("button", { name: "Create event", exact: true })
      .click();
    await page.getByLabel("Title", { exact: true }).fill("Unsaved");
    page.once("dialog", (d) => d.dismiss());
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    assert.equal(
      await page.getByLabel("Title", { exact: true }).inputValue(),
      "Unsaved",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page
      .getByRole("button", {
        name: "Attendees for Updated workshop",
        exact: true,
      })
      .click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Attendees temporarily unavailable" })
      .waitFor();
    attendeeLoadFails = false;
    await page
      .getByRole("button", { name: "Refresh attendees", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Example Guest", exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByText("<script>unsafe()</script>", { exact: true })
        .count(),
      1,
    );
    await page.getByLabel("Search attendees", { exact: true }).fill("missing");
    await page.getByText("No matching attendees.", { exact: true }).waitFor();
    await page.getByLabel("Search attendees", { exact: true }).fill("");
    page.once("dialog", (d) => d.dismiss());
    await page
      .getByRole("button", {
        name: "Mark attended · Example Guest",
        exact: true,
      })
      .click();
    assert.equal(attendanceWrites, 0);
    page.once("dialog", (d) => d.accept());
    await page
      .getByRole("button", {
        name: "Mark attended · Example Guest",
        exact: true,
      })
      .click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Refresh attendees to verify" })
      .waitFor();
    assert(
      await page
        .getByRole("button", {
          name: "Mark attended · Example Guest",
          exact: true,
        })
        .isDisabled(),
    );
    attendanceFails = false;
    await page
      .getByRole("button", { name: "Refresh attendees", exact: true })
      .click();
    page.once("dialog", (d) => d.accept());
    await page
      .getByRole("button", {
        name: "Mark attended · Example Guest",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", {
        name: "Clear attendance · Example Guest",
        exact: true,
      })
      .waitFor();
    assert.equal(attendee.paymentStatus, "paid");
    assert.equal(attendee.status, "confirmed");
    page.once("dialog", (d) => d.accept());
    await page
      .getByRole("button", {
        name: "Clear attendance · Example Guest",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", {
        name: "Mark attended · Example Guest",
        exact: true,
      })
      .waitFor();
    assert.equal(attendee.checkedInAt, null);
    assert.equal(attendanceWrites, 3);
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page
      .getByRole("button", { name: "Back to events", exact: true })
      .click();
    deny = true;
    await page.reload();
    await page.waitForTimeout(500);
    assert.equal(
      await page
        .getByRole("button", { name: "Create event", exact: true })
        .count(),
      0,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Events browser checks passed: dates, draft creation, publication confirmation, save retry, retained settings, duplication, filtering, discard and permission boundaries.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
