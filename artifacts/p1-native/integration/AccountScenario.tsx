/** Actual Application component with isolated synthetic adapters; no production credentials. */
import React from "react";
import { Application, type ApplicationServices } from "../App";
import { OfflineRevocation } from "../src/core/offline-revocation";
import { BusinessTransport } from "../src/core/transport";
import type { Vault } from "../src/native/vault";
const boundaryCase = process.env.EXPO_PUBLIC_P1_NATIVE_QA_CASE;
const origin = "https://synthetic-native.example.test";
let stage: "A" | "locked" | "B" = "A",
  reads = 0,
  token: string | null = "synthetic-A";
const calls: string[] = [];
function record(value: string) {
  calls.push(value);
  console.log("P1_ACCOUNT_QA " + value);
}
function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}
const transport = new BusinessTransport(origin, async (input) => {
  const path = new URL(String(input)).pathname;
  if (path === "/api/v1/me") {
    if (stage === "A" && ++reads > 1 && boundaryCase !== "session")
      stage = "locked";
    return json({
      id: stage === "B" ? "B" : "A",
      name: stage === "B" ? "Synthetic B" : "Synthetic A",
      email: "synthetic@example.test",
      role: stage === "locked" ? "owner" : "crew",
      ownerMfaRequired: stage === "locked",
      twoFactorEnabled: true,
    });
  }
  if (path === "/api/v1/schedule") return json({ items: [], nextCursor: null });
  if (path === "/api/v1/field/sync") return json({ results: [] });
  throw new Error("Unexpected synthetic endpoint");
});
function resource(accountId: string): Vault {
  const recordUse = (action: string) => {
    record(accountId + ":" + action);
    if (accountId === "A" && stage !== "A")
      throw new Error("A resource accessed after MFA lock");
  };
  return {
    outbox: async () => {
      recordUse("outbox");
      return {
        items: [],
        nextCursor: null,
        total: 0,
        pending: 0,
        conflicts: 0,
      };
    },
    scope: accountId,
    origin,
    accountId,
    close: async () => record(accountId + ":close"),
    pendingCount: async () => {
      recordUse("pending");
      return 0;
    },
    storageStatus: async () => {
      recordUse("storage");
      return {
        queuedPhotoCount: 0,
        queuedPhotoBytes: 0,
        availableBytes: 1024 * 1024 * 1024,
        totalBytes: 64 * 1024 * 1024 * 1024,
        severity: "normal" as const,
      };
    },
    requirePhotoStorage: async () => recordUse("photo-storage"),
    download: async () => recordUse("download"),
    downloaded: async () => {
      recordUse("read");
      return [];
    },
    enqueue: async () => recordUse("queue"),
    pending: async () => {
      recordUse("sync");
      return [];
    },
    recordResults: async () => recordUse("ack"),
    rememberTemporaryPhoto: async () => recordUse("remember-photo"),
    stageRememberedPhoto: async () => {
      recordUse("stage-photo");
      return "staged" as const;
    },
    recoverTemporaryPhotos: async () => {
      recordUse("recover-photos");
      return { recovered: 0, cleaned: 0, missing: 0, missingIds: [] };
    },
    stagePhoto: async () => recordUse("photo"),
    pendingPhotoIds: async () => {
      recordUse("photos");
      return [];
    },
    loadPendingPhoto: async () => {
      recordUse("load-photo");
      return null;
    },
    acknowledgePhoto: async () => recordUse("photo-ack"),
    destroy: async () => {
      recordUse("destroy");
      if (boundaryCase === "logout")
        throw new Error("Injected database cleanup failure");
    },
  };
}
const offlinePolicy = new OfflineRevocation({
  mark: async () => record("offline:deny-marker"),
  marked: async () => stage === "locked",
  unmark: async () => {},
  deleteEntry: async () => {
    record("offline:delete-failed");
    throw new Error("Injected SecureStore delete failure");
  },
});
const services: ApplicationServices = {
  origin,
  transport,
  offlineStore: {
    rememberCrew: async () => {
      await offlinePolicy.verified(origin);
    },
    forgetCrew: async () => {
      await offlinePolicy.revoke(origin);
    },
    recallCrew: async () => {
      try {
        await offlinePolicy.assertAllowed(origin);
      } catch (error) {
        record("offline:unlock-denied");
        throw error;
      }
      throw new Error("Synthetic fixture has no downloaded snapshot");
    },
  },
  auth: {
    restore: async () => token,
    getToken: () => token,
    clear: async () => {
      token = null;
      record("auth:clear");
    },
    call: async (action) => {
      if (action === "sign-out") {
        record("server:signout");
        return { challenge: false, result: {} };
      }
      if (action === "get-session") {
        if (boundaryCase === "session" && reads > 1) {
          record("session:null");
          return { challenge: false, result: null };
        }
        const id = stage === "B" ? "B" : "A";
        return {
          challenge: false,
          result: {
            user: { id },
            session: {
              userId: id,
              expiresAt: new Date(Date.now() + 3600000).toISOString(),
            },
          },
        };
      }
      stage = "B";
      token = "synthetic-B";
      record("auth:B");
      return { challenge: false, result: {} };
    },
  },
  openVault: async (_origin, accountId) => {
    record("open:" + accountId);
    return resource(accountId);
  },
};
export default function AccountScenario() {
  return <Application services={services} />;
}
