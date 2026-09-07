import { withDownloadedChecklist } from "./src/core/checklist";
import { logoutAccount } from "./src/core/logout";
import { AuthRequestFailure } from "./src/core/auth";
import {
  rememberCrew,
  recallCrew,
  forgetCrew,
} from "./src/native/offline-entry";
import { AccountVault } from "./src/core/account-vault";
import type { PhotoUploadReceipt } from "../../lib/api-client-react/src/dashboard/models/photoUploadReceipt";
import { Properties } from "./src/screens/Properties";
import { fetch as nativeFetch } from "expo/fetch";
import type { DashboardMe } from "../../lib/api-client-react/src/dashboard/models/dashboardMe";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Button,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import * as Crypto from "expo-crypto";
import type { SchedulePage } from "../../lib/api-client-react/src/dashboard/models/schedulePage";
import type { WorkOrder } from "../../lib/api-client-react/src/dashboard/models/workOrder";
import type { FieldOperation } from "@workspace/api-zod/dashboard";
import { BusinessTransport, RequestFailure } from "./src/core/transport";
import { syncOperations } from "./src/core/sync";
import { NativeAuth } from "./src/native/auth";
import { openVault, type Vault } from "./src/native/vault";
import { capturePhoto } from "./src/native/capture";
const origin =
  process.env.EXPO_PUBLIC_P1_API_ORIGIN ||
  "https://p1-dashboard-staging-dashboard-staging.up.railway.app";
const auth = new NativeAuth(origin),
  transport = new BusinessTransport(origin, nativeFetch as typeof fetch);
export type ApplicationServices = {
  origin: string;
  auth: Pick<NativeAuth, "restore" | "getToken" | "call" | "clear">;
  transport: BusinessTransport;
  openVault: typeof openVault;
  offlineStore?: {
    rememberCrew: typeof rememberCrew;
    recallCrew: typeof recallCrew;
    forgetCrew: typeof forgetCrew;
  };
};
export default function App() {
  return <Application services={{ origin, auth, transport, openVault }} />;
}
export function Application({ services }: { services: ApplicationServices }) {
  const { origin, auth, transport, openVault } = services;
  const {
    rememberCrew: rememberOffline,
    recallCrew: recallOffline,
    forgetCrew: forgetOffline,
  } = services.offlineStore || { rememberCrew, recallCrew, forgetCrew };
  const [offline, setOffline] = useState(false);
  const [person, setPerson] = useState<DashboardMe | null>(null),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [code, setCode] = useState(""),
    [challenge, setChallenge] = useState(false),
    [recovery, setRecovery] = useState(false);
  const [work, setWork] = useState<WorkOrder[]>([]),
    [selected, setSelected] = useState<WorkOrder | null>(null),
    [note, setNote] = useState(""),
    [notice, setNotice] = useState("Sign in with your invited P1 account."),
    [busy, setBusy] = useState(false),
    [pending, setPending] = useState(0);
  const [enrollment, setEnrollment] = useState(false),
    [setup, setSetup] = useState<{
      totpURI?: string;
      backupCodes?: string[];
    } | null>(null);
  const [day, setDay] = useState(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
  );
  const vault = useRef(new AccountVault<Vault>()).current,
    busyRef = useRef(false);
  async function detachVault() {
    const close = vault.detach();
    setWork([]);
    setSelected(null);
    setPending(0);
    setNote("");
    await close;
  }
  function requireBoundVault() {
    if (!person || person.role !== "crew")
      throw new Error("Protected work is locked for this account.");
    return vault.require(origin, person.id);
  }
  async function run(action: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await action();
    } catch (error) {
      if (
        (error instanceof RequestFailure ||
          error instanceof AuthRequestFailure) &&
        [401, 403].includes(error.status)
      ) {
        transport.bind(null);
        setPerson(null);
        setWork([]);
        setSelected(null);
        setOffline(false);
        const detached = detachVault();
        const cleanup = await Promise.allSettled([
          detached,
          forgetOffline(origin),
          auth.clear(),
        ]);
        if (cleanup.some((result) => result.status === "rejected")) {
          setNotice(
            "Protected work is locked. Device storage cleanup failed; reconnect to recover it.",
          );
          return;
        }
      }
      setNotice(
        error instanceof Error
          ? error.message
          : "Action failed. Saved work remains on this device.",
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  async function verify() {
    const token = auth.getToken();
    if (!token) throw new Error("Sign in to continue.");
    transport.bind({ accountId: person?.id || "identity-check", token });
    const current = await transport.request<DashboardMe>("/api/v1/me");
    if (!current.role) throw new RequestFailure(403);
    if (current.ownerMfaRequired) {
      transport.bind(null);
      setPerson(null);
      setOffline(false);
      const detached = detachVault();
      const cleanup = await Promise.allSettled([
        detached,
        forgetOffline(origin),
      ]);
      if (cleanup.some((result) => result.status === "rejected"))
        throw new Error(
          "Protected work is locked. Device storage cleanup failed; reconnect to recover it.",
        );
      setEnrollment(true);
      throw new Error(
        "Verify owner MFA for this session before loading business data.",
      );
    }
    setEnrollment(false);
    setSetup(null);
    if (person && person.id !== current.id) throw new RequestFailure(401);
    if (
      vault.current &&
      (current.role !== "crew" ||
        vault.current.origin !== origin ||
        vault.current.accountId !== current.id)
    )
      await detachVault();
    transport.bind({ accountId: current.id, token });
    if (current.role === "crew" && !vault.current)
      vault.attach(await openVault(origin, current.id));
    if (current.role === "crew") {
      const response = await auth.call("get-session", undefined);
      if (
        response.challenge ||
        response.result?.user?.id !== current.id ||
        response.result?.session?.userId !== current.id ||
        typeof response.result.session.expiresAt !== "string"
      )
        throw new AuthRequestFailure(401);
      await rememberOffline(
        origin,
        current.id,
        current.name,
        auth.getToken()!,
        response.result.session.expiresAt,
      );
      transport.bind({ accountId: current.id, token: auth.getToken()! });
    } else await forgetOffline(origin);
    setOffline(false);
    setPerson(current);
    return current;
  }
  async function loadDay() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day))
      throw new Error("Choose a date in YYYY-MM-DD format.");
    const rows: WorkOrder[] = [];
    let cursor: string | null = null;
    do {
      const page: SchedulePage = await transport.request(
        `/api/v1/schedule?from=${day}&through=${day}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
      );
      rows.push(...page.items);
      cursor = page.nextCursor;
    } while (cursor);
    return rows;
  }
  async function refresh() {
    await verify();
    setWork(await loadDay());
    setSelected(null);
    setNotice("Current authorized work loaded.");
    if (vault.current) setPending(await vault.current.pendingCount());
  }
  useEffect(() => {
    void run(async () => {
      if (await auth.restore()) await refresh();
    });
    return () => {
      transport.bind(null);
      void vault.current?.close();
    };
  }, []);
  useEffect(() => {
    if (!offline) return;
    let active = true;
    const check = async () => {
      try {
        const token = auth.getToken();
        if (!token) throw new Error("Offline session is unavailable.");
        await recallOffline(origin, token);
      } catch {
        if (active) {
          transport.bind(null);
          setPerson(null);
          setOffline(false);
          await detachVault();
          setNotice(
            "Offline access expired. Reconnect to recover protected work.",
          );
        }
      }
    };
    const timer = setInterval(() => void check(), 30000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void check();
    });
    return () => {
      active = false;
      clearInterval(timer);
      subscription.remove();
    };
  }, [offline]);
  async function signIn() {
    const result = await auth.call(
      challenge
        ? recovery
          ? "two-factor/verify-backup-code"
          : "two-factor/verify-totp"
        : "sign-in/email",
      challenge ? { code } : { email: email.trim(), password },
    );
    setPassword("");
    setCode("");
    setChallenge(result.challenge);
    if (result.challenge) {
      setNotice("Enter an authenticator or recovery code.");
      return;
    }
    await refresh();
  }
  async function queue(
    kind: FieldOperation["kind"],
    payload: FieldOperation["payload"],
  ) {
    requireBoundVault();
    if (offline) await recallOffline(origin, auth.getToken()!);
    if (!vault.current || !selected?.version || person?.role !== "crew")
      throw new Error("Download assigned crew work before saving.");
    if (
      !(await vault.current.downloaded()).some(
        (w) => w.id === selected.id && w.version === selected.version,
      )
    )
      throw new Error("Download this assignment before saving entries.");
    await vault.current.enqueue({
      id: Crypto.randomUUID(),
      workOrderId: selected.id,
      baseVersion: selected.version,
      kind,
      payload,
      capturedAt: new Date().toISOString(),
    });
    setPending(await vault.current.pendingCount());
    setNote("");
    setNotice("Saved securely. Sync when connected.");
  }
  async function sync() {
    await verify();
    requireBoundVault();
    if (!vault.current) return;
    for (const photo of await vault.current.photos()) {
      const m = JSON.parse(photo.manifest);
      const ack = await transport.request<PhotoUploadReceipt>(
        `/api/v1/files/${photo.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": m.mime,
            "x-p1-property": m.propertyId,
            "x-p1-work": m.workOrderId,
            "x-p1-classification": m.classification,
          },
          body: photo.bytes as unknown as BodyInit,
        },
      );
      if (ack.id !== photo.id || ack.status !== "accepted")
        throw new Error("Upload acknowledgment mismatch. Photo remains saved.");
      await vault.current.acknowledgePhoto(photo.id);
    }
    await syncOperations(vault.current, (events) =>
      transport.request("/api/v1/field/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events }),
      }),
    );
    setPending(await vault.current.pendingCount());
    setNotice("Sync finished. Remaining items need retry or office review.");
  }
  async function logout() {
    const previous = vault.current;
    await logoutAccount({
      pendingCount: async () => (previous ? previous.pendingCount() : 0),
      signOut: () => auth.call("sign-out", {}),
      detach: () => {
        transport.bind(null);
        setOffline(false);
        setPerson(null);
        setChallenge(false);
        setEnrollment(false);
        setSetup(null);
        return detachVault();
      },
      revokeOffline: () => forgetOffline(origin),
      clearAuth: () => auth.clear(),
      destroy: async () => {
        await previous?.destroy();
      },
    });
    setNotice("Signed out.");
  }
  const action = (title: string, fn: () => Promise<void>) => (
    <View style={s.button}>
      <Button title={title} disabled={busy} onPress={() => void run(fn)} />
    </View>
  );
  const photo = async (camera: boolean) => {
    requireBoundVault();
    if (offline) await recallOffline(origin, auth.getToken()!);
    if (!selected || !vault.current) return;
    if (
      !(await vault.current.downloaded()).some(
        (row) => row.id === selected.id && row.version === selected.version,
      )
    )
      throw new Error("Download this assignment before capturing photos.");
    if (
      await capturePhoto(
        vault.current,
        selected.id,
        selected.property_id,
        camera,
      )
    ) {
      setPending(await vault.current.pendingCount());
      setNotice("Photo saved securely.");
    }
  };
  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.safe}>
        <ScrollView
          contentContainerStyle={s.page}
          keyboardShouldPersistTaps="handled"
        >
          <Text accessibilityRole="header" style={s.title}>
            P1 Field
          </Text>
          <Text>Land &amp; Property Management</Text>
          <Text accessibilityLiveRegion="polite" style={s.notice}>
            {notice}
          </Text>
          {busy && <ActivityIndicator accessibilityLabel="Working" />}
          {!person && enrollment ? (
            <View>
              <Text accessibilityRole="header" style={s.heading}>
                Owner verification
              </Text>
              <Text>
                Use your existing authenticator or recovery code. If you have
                not enrolled, set up an authenticator below.
              </Text>
              <TextInput
                accessibilityLabel="Authenticator or recovery code"
                value={code}
                onChangeText={setCode}
                style={s.input}
              />
              {action("Verify authenticator", async () => {
                await auth.call("two-factor/verify-totp", { code });
                setCode("");
                await refresh();
              })}
              {action("Verify recovery code", async () => {
                await auth.call("two-factor/verify-backup-code", { code });
                setCode("");
                await refresh();
              })}
              <TextInput
                accessibilityLabel="Password for authenticator setup"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                style={s.input}
              />
              {action("Set up authenticator", async () => {
                const response = await auth.call("two-factor/enable", {
                  password,
                });
                setPassword("");
                if (!response.challenge) setSetup(response.result);
              })}
              {setup && (
                <View>
                  <Text>Authenticator setup URI (keep private)</Text>
                  <Text selectable>{setup.totpURI}</Text>
                  <Text>
                    Save these recovery codes securely before leaving this
                    screen.
                  </Text>
                  {setup.backupCodes?.map((value) => (
                    <Text key={value} selectable>
                      {value}
                    </Text>
                  ))}
                </View>
              )}
              {action("Cancel sign-in", async () => {
                transport.bind(null);
                await detachVault();
                setPerson(null);
                setChallenge(false);
                await auth.clear();
                setEnrollment(false);
                setSetup(null);
                setPassword("");
                setCode("");
              })}
            </View>
          ) : !person ? (
            <View>
              {!challenge ? (
                <>
                  <Text>Email</Text>
                  <TextInput
                    accessibilityLabel="Email"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    value={email}
                    onChangeText={setEmail}
                    style={s.input}
                  />
                  <Text>Password</Text>
                  <TextInput
                    accessibilityLabel="Password"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    style={s.input}
                  />
                </>
              ) : (
                <>
                  <Text>{recovery ? "Recovery" : "Authenticator"} code</Text>
                  <TextInput
                    accessibilityLabel="Verification code"
                    value={code}
                    onChangeText={setCode}
                    style={s.input}
                  />
                  {action(
                    recovery ? "Use authenticator" : "Use recovery code",
                    async () => {
                      setRecovery(!recovery);
                      setCode("");
                    },
                  )}
                </>
              )}
              {action(challenge ? "Verify sign-in" : "Sign in", signIn)}
              {!challenge &&
                action("Open downloaded crew work offline", async () => {
                  const token = auth.getToken() || (await auth.restore());
                  if (!token)
                    throw new Error("Sign in online before offline access.");
                  const entry = await recallOffline(origin, token);
                  await detachVault();
                  const saved = await openVault(origin, entry.accountId, true);
                  vault.attach(saved);
                  const rows = await saved.downloaded();
                  setWork(rows);
                  setPerson({
                    id: entry.accountId,
                    name: entry.displayName,
                    email: "",
                    role: "crew",
                    mfaRequired: false,
                    ownerMfaRequired: false,
                  });
                  setOffline(true);
                  transport.bind(null);
                  setPending(await saved.pendingCount());
                  setNotice(
                    `Offline downloaded work. Access expires ${new Date(entry.expiresAt).toLocaleString()}. Reconnect before syncing.`,
                  );
                })}
            </View>
          ) : (
            <>
              <Text style={s.heading}>
                {person.name} · {person.role}
              </Text>
              <Text>Work date · America/New_York</Text>
              <TextInput
                accessibilityLabel="Work date YYYY-MM-DD"
                value={day}
                onChangeText={setDay}
                style={s.input}
              />
              {action("Refresh work", refresh)}
              {action("Sign out", logout)}
              {person.role !== "crew" && (
                <Properties
                  key={person.id + ":" + person.role}
                  transport={transport}
                  busy={busy}
                  run={run}
                />
              )}
              {person.role === "crew" && (
                <>
                  {action("Download assignments", async () => {
                    await verify();
                    const rows = await loadDay();
                    await vault.current!.download(rows);
                    setWork(rows);
                    setNotice("Assignments downloaded.");
                  })}
                  {action("Open downloaded work", async () => {
                    setWork(await vault.current!.downloaded());
                    setSelected(null);
                    setNotice(
                      "Downloaded work. Refresh online to verify current assignments.",
                    );
                  })}
                  {action(`Sync now · ${pending} pending`, sync)}
                </>
              )}
              {selected ? (
                <View>
                  <Text style={s.heading}>{selected.title}</Text>
                  <Text>
                    {selected.property_name} · {selected.status}
                  </Text>
                  <Text>{selected.scope}</Text>
                  {action("Back to work list", async () => setSelected(null))}
                  {person.role === "crew" && (
                    <>
                      <TextInput
                        accessibilityLabel="Field note or issue"
                        multiline
                        value={note}
                        onChangeText={setNote}
                        style={s.input}
                      />
                      {action("Save note", () => queue("note", { text: note }))}
                      {action("Report issue", () =>
                        queue("issue", { text: note }),
                      )}
                      {action("Start time", () =>
                        queue("time", { action: "start" }),
                      )}
                      {action("Stop time", () =>
                        queue("time", { action: "stop" }),
                      )}
                      {action("Submit completion for review", () =>
                        queue("complete", {}),
                      )}
                      {(selected.checklist || []).map((item, index) => (
                        <View key={index}>
                          {action(
                            `${item.done ? "Checked" : "Unchecked"}: ${item.label}`,
                            async () => {
                              const items = (selected.checklist || []).map(
                                (entry, at) =>
                                  at === index
                                    ? { ...entry, done: !entry.done }
                                    : entry,
                              );
                              await queue("checklist", { items });
                              setSelected({ ...selected, checklist: items });
                            },
                          )}
                        </View>
                      ))}
                      {action("Take project photo", () => photo(true))}
                      {action("Choose project photo", () => photo(false))}
                    </>
                  )}
                </View>
              ) : (
                work.map((row) => (
                  <View key={row.id} style={s.card}>
                    <Text style={s.heading}>{row.title}</Text>
                    <Text>
                      {row.property_name} ·{" "}
                      {row.scheduled_at
                        ? new Date(row.scheduled_at).toLocaleDateString()
                        : "Unscheduled"}
                    </Text>
                    {action("Open " + row.title, async () => {
                      try {
                        const current = await transport.request<WorkOrder>(
                          "/api/v1/work-orders/" + row.id,
                        );
                        setSelected(
                          vault.current
                            ? withDownloadedChecklist(
                                current,
                                await vault.current.downloaded(),
                              )
                            : current,
                        );
                      } catch (error) {
                        if (error instanceof RequestFailure || !vault.current)
                          throw error;
                        const saved = (await vault.current.downloaded()).find(
                          (item) => item.id === row.id,
                        );
                        if (!saved) throw error;
                        setSelected(saved);
                        setNotice(
                          "Offline downloaded assignment. Saved entries require server acceptance.",
                        );
                      }
                    })}
                  </View>
                ))
              )}
              {!work.length && <Text>No authorized work is available.</Text>}
            </>
          )}
          <Text style={s.footer}>
            Development build · Foreground sync. Office review and billing
            remain in the web dashboard.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f7f6" },
  page: {
    padding: 20,
    gap: 12,
    maxWidth: 760,
    width: "100%",
    alignSelf: "center",
  },
  title: { fontSize: 32, fontWeight: "800", color: "#183e2a" },
  heading: { fontSize: 19, fontWeight: "600" },
  notice: { padding: 14, backgroundColor: "#e3ede7", color: "#183e2a" },
  input: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#62776a",
    fontSize: 17,
    backgroundColor: "white",
    marginVertical: 8,
    minHeight: 48,
  },
  button: { minHeight: 44, justifyContent: "center", marginVertical: 5 },
  card: {
    padding: 14,
    borderWidth: 1,
    borderColor: "#ced9d1",
    backgroundColor: "white",
  },
  footer: { marginTop: 20, color: "#485a4d" },
});
