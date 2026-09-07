import { File, Paths } from "expo-file-system";
/** Development-only synthetic fixture. Never uses production credentials or customer data. */
import React, { useEffect, useState } from "react";
import { ScrollView, Text } from "react-native";
import { fetch } from "expo/fetch";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { openVault } from "../src/native/vault";
export default function DeviceChecks() {
  const [lines, setLines] = useState<string[]>([]);
  useEffect(() => {
    void (async () => {
      const say = (message: string) => {
        console.log("P1_NATIVE_QA " + message);
        setLines((previous) => [...previous, message]);
      };
      if (!__DEV__) throw new Error("Native QA only runs in development");
      let vault: Awaited<ReturnType<typeof openVault>> | undefined;
      try {
        const origin = "https://synthetic-native.example.test",
          account = Crypto.randomUUID();
        vault = await openVault(origin, account);
        const peer = await openVault(origin, account);
        await peer.close();
        say("encrypted database opened; second scoped connection consistent");
        const event = {
          id: Crypto.randomUUID(),
          workOrderId: Crypto.randomUUID(),
          baseVersion: 1,
          kind: "note" as const,
          payload: { text: "Synthetic device durability check" },
          capturedAt: new Date().toISOString(),
        };
        await vault.enqueue(event);
        await vault.enqueue(event);
        if ((await vault.pendingCount()) !== 1)
          throw new Error("duplicate enqueue");
        await vault.close();
        vault = await openVault(origin, account);
        if (
          JSON.stringify((await vault.pending())[0]) !== JSON.stringify(event)
        )
          throw new Error("reopen changed event");
        say(
          "database reopen retained original ID/payload/time; retry deduplicated",
        );
        const photoId = Crypto.randomUUID(),
          temporary = new File(Paths.cache, photoId + ".jpg");
        temporary.create();
        const bytes = new Uint8Array([
          255, 216, 255, 224, 0, 4, 1, 2, 255, 217,
        ]);
        temporary.write(bytes);
        await vault.stagePhoto(
          {
            id: photoId,
            workOrderId: event.workOrderId,
            propertyId: Crypto.randomUUID(),
            mime: "image/jpeg",
            classification: "general",
            capturedAt: event.capturedAt,
          },
          temporary.uri,
        );
        if (temporary.exists)
          throw new Error("cleartext temporary remains after commit");
        await vault.close();
        vault = await openVault(origin, account);
        const photos = await vault.photos();
        if (
          photos.length !== 1 ||
          Array.from(photos[0].bytes).join(",") !== Array.from(bytes).join(",")
        )
          throw new Error("photo bytes changed across reopen");
        await vault.acknowledgePhoto(photoId);
        say(
          "encrypted photo BLOB survived reopen; temporary removed only after commit",
        );
        const scope = vault.scope,
          keyName = `p1.db.${scope}`,
          key = await SecureStore.getItemAsync(keyName);
        if (!key) throw new Error("key not in securestore");
        await vault.close();
        vault = undefined;
        await SecureStore.deleteItemAsync(keyName);
        let locked = false;
        try {
          await openVault(origin, account);
        } catch {
          locked = true;
        } finally {
          await SecureStore.setItemAsync(keyName, key, {
            keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          });
        }
        if (!locked) throw new Error("missing key did not lock");
        say("missing key locked existing DB without replacing data");
        vault = await openVault(origin, account);
        if ((await vault.pendingCount()) !== 1)
          throw new Error("recovered queue missing");
        await vault.recordResults([{ id: event.id, status: "accepted" }]);
        await vault.close();
        await vault.destroy();
        vault = undefined;
        say(
          "same-account key recovery preserved queued work; accepted cleanup succeeded",
        );
        // Emulator host bridge only; production transports still require their pinned HTTPS origin.
        const local = "http://10.0.2.2:4199";
        const seeded = await fetch(local + "/seed", { credentials: "include" });
        if (!seeded.headers.get("set-cookie")?.includes("synthetic_qa_cookie"))
          throw new Error("challenge response header unavailable");
        const included = await (
          await fetch(local + "/echo", { credentials: "include" })
        ).json();
        if (!included.cookie) throw new Error("cookie seed failed");
        const omitted = await (
          await fetch(local + "/echo", { credentials: "omit" })
        ).json();
        if (omitted.cookie) throw new Error("cookie omission failed");
        say(
          "native response Set-Cookie readable; shared-cookie omission verified",
        );
        let denied = false;
        try {
          await fetch(local + "/redirect", {
            credentials: "omit",
            redirect: "error",
            headers: { Authorization: "Bearer synthetic-not-a-credential" },
          });
        } catch {
          denied = true;
        }
        if (!denied) throw new Error("redirect followed");
        const after = await (
          await fetch(local + "/echo", { credentials: "omit" })
        ).json();
        if (after.sink !== 0)
          throw new Error("redirect sink received a request");
        say("native redirect rejected; sink received zero requests");
        say("PASS");
      } catch (error) {
        say("FAIL " + (error instanceof Error ? error.message : String(error)));
      } finally {
        await vault?.close();
      }
    })();
  }, []);
  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 50 }}>
      <Text style={{ fontSize: 24 }}>Synthetic native acceptance</Text>
      {lines.map((line, index) => (
        <Text key={index} style={{ paddingVertical: 8 }}>
          {line}
        </Text>
      ))}
    </ScrollView>
  );
}
