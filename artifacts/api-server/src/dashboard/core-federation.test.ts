import assert from "node:assert/strict";
import { test } from "node:test";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import express from "express";
import {
  coreFederationApi,
  coreFederationIngress,
  pkceS256,
} from "./core-federation";
import { pool } from "./database";

test("Core federation uses RFC 7636 S256 PKCE", () => {
  assert.equal(
    pkceS256("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
    "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
  );
});

test("Core federation private ingress rejects browser-shaped requests", async () => {
  const app = express();
  app.use("/api/integrations/core/v1", coreFederationIngress);
  app.use((error: unknown, _req: express.Request, res: express.Response) =>
    res.status((error as { status?: number }).status || 500).json({}),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/integrations/core/v1/federation/token`;
  try {
    for (const headers of [
      { cookie: "p1-dashboard.session_token=browser" },
      { origin: "https://dashboard.p1landmanagement.com" },
    ])
      assert.equal(
        (await fetch(url, { method: "POST", headers, body: "{}" })).status,
        403,
      );
    assert.equal(
      (await fetch(url + "?browser=true", { method: "POST", body: "{}" }))
        .status,
      403,
    );
    assert.equal(
      (
        await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: randomBytes(4097).toString("hex"),
        })
      ).status,
      413,
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

const base = process.env.DASHBOARD_TEST_ORIGIN;
test(
  "Core federation refuses the insecure-issuer test flag outside loopback test mode",
  { skip: !base },
  async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousTestFlag =
      process.env.CORE_FEDERATION_TEST_ALLOW_INSECURE_ORIGIN;
    process.env.NODE_ENV = "production";
    process.env.CORE_FEDERATION_TEST_ALLOW_INSECURE_ORIGIN = "true";
    const app = express();
    app.use("/api/v1", coreFederationApi);
    app.use(
      (
        error: unknown,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction,
      ) =>
        res.status((error as { status?: number }).status || 500).json({
          error: (error as Error).message,
        }),
    );
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    try {
      const response = await fetch(
        `http://127.0.0.1:${(server.address() as { port: number }).port}/api/v1/federation/authorize`,
      );
      assert.equal(response.status, 500);
      assert.equal(
        ((await response.json()) as { error: string }).error,
        "Dashboard federation issuer is invalid",
      );
    } finally {
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
      if (previousTestFlag === undefined)
        delete process.env.CORE_FEDERATION_TEST_ALLOW_INSECURE_ORIGIN;
      else
        process.env.CORE_FEDERATION_TEST_ALLOW_INSECURE_ORIGIN =
          previousTestFlag;
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  },
);
test(
  "Core federation binds code exchange to the dashboard session and MFA policy",
  { skip: !base },
  async () => {
    const userId = randomUUID();
    const sessionId = randomUUID();
    const token = randomUUID();
    const sessionCookie =
      "p1-dashboard.session_token=" +
      encodeURIComponent(
        token +
          "." +
          createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
            .update(token)
            .digest("base64"),
      );
    const clientId = process.env.CORE_FEDERATION_CLIENT_ID!;
    const redirectUri = process.env.CORE_FEDERATION_REDIRECT_URI!;
    const clientAuthorization =
      "Basic " +
      Buffer.from(
        clientId + ":" + process.env.CORE_FEDERATION_CLIENT_SECRET_CURRENT!,
      ).toString("base64");
    const verifier = randomBytes(32).toString("base64url");
    const state = randomBytes(32).toString("base64url");
    const authorize = new URL(base + "/api/v1/federation/authorize");
    authorize.searchParams.set("client_id", clientId);
    authorize.searchParams.set("redirect_uri", redirectUri);
    authorize.searchParams.set("state", state);
    authorize.searchParams.set("code_challenge", pkceS256(verifier));
    authorize.searchParams.set("code_challenge_method", "S256");
    authorize.searchParams.set("purpose", "p1-core-cms-v1");
    try {
      await pool.query(
        'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
        [userId, "Federation synthetic", userId + "@example.test"],
      );
      await pool.query(
        "INSERT INTO staff_profile(user_id,role,mfa_required) VALUES($1,'owner',false)",
        [userId],
      );
      await pool.query(
        'INSERT INTO session(id,"expiresAt",token,"userId") VALUES($1,now()+interval \'1 hour\',$2,$3)',
        [sessionId, token, userId],
      );
      const continuation = await fetch(authorize, {
        redirect: "manual",
      });
      assert.equal(continuation.status, 303);
      assert.equal(continuation.headers.get("location"), "/?federation=1");
      assert.equal(continuation.headers.get("referrer-policy"), "no-referrer");
      const continuationCookie = (
        continuation.headers.get("set-cookie") || ""
      ).split(";", 1)[0];
      assert.match(
        continuationCookie,
        /^p1-core-federation=[A-Za-z0-9_-]{43}$/,
      );
      const resume = () =>
        fetch(base + "/api/v1/federation/resume", {
          method: "POST",
          headers: {
            cookie: sessionCookie + "; " + continuationCookie,
            origin: base!,
          },
        });
      const resumed = await resume();
      assert.equal(resumed.status, 200);
      assert.equal((await resume()).status, 401);
      const location = new URL(
        ((await resumed.json()) as { redirect: string }).redirect,
      );
      assert.equal(location.origin + location.pathname, redirectUri);
      assert.equal(location.searchParams.get("state"), state);
      const code = location.searchParams.get("code")!;
      assert.match(code, /^[A-Za-z0-9_-]{43}$/);

      const exchange = async () =>
        fetch(base + "/api/integrations/core/v1/federation/token", {
          method: "POST",
          headers: {
            authorization: clientAuthorization,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            code,
            code_verifier: verifier,
            purpose: "p1-core-cms-v1",
          }),
        });
      assert.equal(
        (
          await fetch(base + "/api/integrations/core/v1/federation/token", {
            method: "POST",
            headers: {
              authorization: clientAuthorization,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              code,
              code_verifier: randomBytes(32).toString("base64url"),
              purpose: "p1-core-cms-v1",
            }),
          })
        ).status,
        401,
      );
      const tokenResponse = await exchange();
      assert.equal(tokenResponse.status, 200);
      const grant = (await tokenResponse.json()) as { grantId: string };
      assert.match(grant.grantId, /^[0-9a-f-]{36}$/);
      assert.equal((await exchange()).status, 401);

      const introspect = () =>
        fetch(base + "/api/integrations/core/v1/federation/introspect", {
          method: "POST",
          headers: {
            authorization: clientAuthorization,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            grant_id: grant.grantId,
            purpose: "p1-core-cms-v1",
            require_owner_attestation: true,
          }),
        });
      assert.equal((await introspect()).status, 200);
      await pool.query(
        "UPDATE staff_profile SET mfa_required=true WHERE user_id=$1",
        [userId],
      );
      assert.equal((await introspect()).status, 403);
      await pool.query(
        "UPDATE staff_profile SET mfa_required=false WHERE user_id=$1",
        [userId],
      );
      assert.equal((await introspect()).status, 200);
      await pool.query("DELETE FROM session WHERE id=$1", [sessionId]);
      assert.equal((await introspect()).status, 401);

      const previousSecret = process.env.CORE_FEDERATION_CLIENT_SECRET_PREVIOUS;
      const previousSecretExpiry =
        process.env.CORE_FEDERATION_CLIENT_SECRET_PREVIOUS_EXPIRES_AT;
      const expiredSecret = randomBytes(32).toString("base64url");
      process.env.CORE_FEDERATION_CLIENT_SECRET_PREVIOUS = expiredSecret;
      process.env.CORE_FEDERATION_CLIENT_SECRET_PREVIOUS_EXPIRES_AT = new Date(
        Date.now() - 1_000,
      ).toISOString();
      const rotationApp = express();
      rotationApp.use(coreFederationIngress);
      rotationApp.use(
        (
          error: unknown,
          _req: express.Request,
          res: express.Response,
          _next: express.NextFunction,
        ) =>
          res.status((error as { status?: number }).status || 500).json({
            error: (error as Error).message,
          }),
      );
      const rotationServer = rotationApp.listen(0, "127.0.0.1");
      await new Promise<void>((resolve) =>
        rotationServer.once("listening", resolve),
      );
      const rotationBase = `http://127.0.0.1:${(rotationServer.address() as { port: number }).port}/federation/introspect`;
      try {
        const introspectRotation = (authorization: string) =>
          fetch(rotationBase, {
            method: "POST",
            headers: { authorization, "content-type": "application/json" },
            body: JSON.stringify({
              grant_id: grant.grantId,
              purpose: "p1-core-cms-v1",
            }),
          });
        const currentResult = await introspectRotation(clientAuthorization);
        assert.equal(currentResult.status, 401);
        assert.equal(
          ((await currentResult.json()) as { error: string }).error,
          "Federation grant is inactive",
        );
        const previousResult = await introspectRotation(
          "Basic " +
            Buffer.from(clientId + ":" + expiredSecret).toString("base64"),
        );
        assert.equal(previousResult.status, 401);
        assert.equal(
          ((await previousResult.json()) as { error: string }).error,
          "Federation client authentication failed",
        );
      } finally {
        await new Promise<void>((resolve) =>
          rotationServer.close(() => resolve()),
        );
        if (previousSecret === undefined)
          delete process.env.CORE_FEDERATION_CLIENT_SECRET_PREVIOUS;
        else
          process.env.CORE_FEDERATION_CLIENT_SECRET_PREVIOUS = previousSecret;
        if (previousSecretExpiry === undefined)
          delete process.env.CORE_FEDERATION_CLIENT_SECRET_PREVIOUS_EXPIRES_AT;
        else
          process.env.CORE_FEDERATION_CLIENT_SECRET_PREVIOUS_EXPIRES_AT =
            previousSecretExpiry;
      }

      await pool.query(
        'INSERT INTO session(id,"expiresAt",token,"userId") VALUES($1,now()+interval \'1 hour\',$2,$3)',
        [sessionId, token, userId],
      );
      await pool.query(
        "UPDATE staff_profile SET mfa_required=true WHERE user_id=$1",
        [userId],
      );
      const denied = await fetch(authorize, {
        headers: { cookie: sessionCookie },
        redirect: "manual",
      });
      assert.equal(denied.status, 303);
      assert.equal(denied.headers.get("location"), "/?federation=1");
      assert.equal(denied.headers.get("referrer-policy"), "no-referrer");
      assert.match(
        denied.headers.get("set-cookie") || "",
        /p1-core-federation=[A-Za-z0-9_-]{43}/,
      );
      for (let attempt = 0; attempt < 8; attempt++)
        assert.equal(
          (
            await fetch(authorize, {
              headers: { cookie: sessionCookie },
              redirect: "manual",
            })
          ).status,
          303,
        );
      assert.equal(
        (
          await fetch(authorize, {
            headers: { cookie: sessionCookie },
            redirect: "manual",
          })
        ).status,
        429,
      );
    } finally {
      await pool.query(
        "DELETE FROM core_federation_browser_request WHERE state=$1",
        [state],
      );
      await pool.query("DELETE FROM audit_event WHERE user_id=$1", [userId]);
      await pool.query("DELETE FROM staff_profile WHERE user_id=$1", [userId]);
      await pool.query('DELETE FROM "user" WHERE id=$1', [userId]);
    }
  },
);
