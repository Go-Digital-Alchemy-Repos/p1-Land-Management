import { ScheduleCalendar } from "./ScheduleCalendar";
import { AssessmentAvailability } from "./AssessmentAvailability";
import { ClientContacts } from "./ClientContacts";
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";
import {
  LayoutDashboard,
  MapPin,
  Users,
  CalendarDays,
  ClipboardList,
  FileText,
  Wallet,
  Settings,
  LogOut,
  Download,
  RefreshCw,
  Plus,
  ArrowUpRight,
  Leaf,
  Menu,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";
import {
  getMyWorkOrders,
  syncFieldEvents,
} from "@workspace/api-client-react/dashboard";
import * as offline from "./offline";
import "./style.css";
const auth = createAuthClient({ plugins: [twoFactorClient()] });
async function api(path: string, body?: unknown) {
  const r = await fetch("/api/v1" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Request failed");
  return data;
}
type Person = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  twoFactorEnabled: boolean;
};
const nav = [
  ["Overview", LayoutDashboard],
  ["Properties", MapPin],
  ["Clients", Users],
  ["Schedule", CalendarDays],
  ["My Day", ClipboardList],
  ["Sales", FileText],
  ["Billing", Wallet],
  ["Requests", MessageSquare],
  ["Recurring", RefreshCw],
  ["Projects", ClipboardList],
  ["Inspections", CheckCircle2],
  ["Expenses", Wallet],
  ["Settings", Settings],
] as const;
const date = (v: string) =>
  v
    ? new Date(v).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Not scheduled";
const money = (v: number | string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(v) / 100,
  );
function operatingDate(value: string | Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  return ["year", "month", "day"]
    .map((type) => parts.find((part) => part.type === type)?.value)
    .join("-");
}
function App() {
  const [fieldDay, setFieldDay] = useState(() => operatingDate(new Date()));
  const [downloadedAt, setDownloadedAt] = useState<string | null>(null);
  const [persistentStorage, setPersistentStorage] = useState(false);
  const [billingOperationId, setBillingOperationId] = useState(() =>
    crypto.randomUUID(),
  );
  const [person, setPerson] = useState<Person | null>(null),
    [boot, setBoot] = useState<any>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [view, setView] = useState("Overview"),
    [data, setData] = useState<any>({}),
    [form, setForm] = useState<string | null>(null),
    [selected, setSelected] = useState<any>(null),
    [isOnline, setOnline] = useState(navigator.onLine),
    [count, setCount] = useState(0),
    [menu, setMenu] = useState(false);
  const [authMode, setAuthMode] = useState("login"),
    [mfa, setMfa] = useState<any>(null);
  async function session() {
    try {
      const [b, p] = await Promise.all([
        api("/setup"),
        api("/me").catch(() => null),
      ]);
      setBoot(b);
      setPerson(p);
      if (p)
        localStorage.setItem(
          "p1-last-account",
          JSON.stringify({ id: p.id, name: p.name, role: p.role }),
        );
    } catch (e) {
      const cached = localStorage.getItem("p1-last-account");
      if (!navigator.onLine && cached) {
        const p = JSON.parse(cached);
        setPerson(p);
        setView("My Day");
        setNotice(
          "Offline workspace. Reconnect to verify your account and synchronize.",
        );
      } else setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void session();
    const on = () => setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, []);
  async function refresh() {
    if (!person?.role) return;
    setError("");
    try {
      const savedDay = await offline.readDay(person.id);
      setDownloadedAt(savedDay?.savedAt || null);
      setPersistentStorage((await offline.storageStatus()).persistent);
      setCount(
        (await offline.pending(person.id)).length +
          (await offline.pendingPhotos(person.id)).length,
      );
      if (!navigator.onLine) {
        const day = await offline.readDay(person.id);
        setData({ work: day?.data || [], savedAt: day?.savedAt });
        return;
      }
      const paths =
        person.role === "crew"
          ? ["work-orders", "properties"]
          : person.role === "client"
            ? [
                "work-orders",
                "properties",
                "clients",
                "estimates",
                "billing",
                "quickbooks/invoices",
                "requests",
                "assessment-slots",
              ]
            : [
                "work-orders",
                "properties",
                "clients",
                ...(person.role === "finance"
                  ? ["billing", "estimates", "expenses", "quickbooks/invoices"]
                  : []),
                ...(["owner", "manager", "sales"].includes(person.role)
                  ? ["estimates"]
                  : []),
                ...(["owner", "manager"].includes(person.role)
                  ? [
                      "billing",
                      "integrations",
                      "expenses",
                      "quickbooks/invoices",
                    ]
                  : []),
                "requests",
                "staff",
                "leads",
                "assessment-slots",
                ...(["owner", "manager", "dispatch"].includes(person.role)
                  ? ["recurring-services", "projects", "inspections"]
                  : []),
              ];
      const values = await Promise.all(
        [...new Set(paths)].map(async (p) => [
          p,
          p === "work-orders" ? await getMyWorkOrders() : await api("/" + p),
        ]),
      );
      const d = Object.fromEntries(values);
      setData({ ...d, work: d["work-orders"] || [] });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void refresh();
  }, [person?.id, person?.role, isOnline]);
  async function run(fn: () => Promise<void>) {
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function sync() {
    if (!person) return;
    for (const photo of await offline.pendingPhotos(person.id)) {
      const r = await fetch("/api/v1/files/" + photo.id, {
        method: "POST",
        headers: {
          "Content-Type": photo.blob.type,
          "x-p1-property": photo.propertyId,
          "x-p1-work": photo.workOrderId,
          "x-p1-classification": photo.classification,
        },
        body: photo.blob,
      });
      if (!r.ok)
        throw new Error((await r.json()).error || "Photo upload failed");
      await offline.acknowledgePhoto(person.id, photo.id);
    }
    const events = await offline.pending(person.id);
    if (events.length) {
      const r = await syncFieldEvents({ events });
      for (const ack of r.results)
        if (ack.status === "accepted")
          await offline.acknowledge(person.id, ack.id);
      setNotice(
        r.results.some((r: any) => r.status === "conflict")
          ? "Some entries need office review and remain on this device."
          : "All entries synchronized.",
      );
    } else setNotice("Everything is up to date.");
    await refresh();
  }
  async function logout() {
    if (!person) return;
    if (
      (await offline.pending(person.id)).length +
      (await offline.pendingPhotos(person.id)).length
    )
      throw new Error("Synchronize pending field entries before signing out.");
    if (!navigator.onLine) throw new Error("Reconnect to sign out securely.");
    await offline.clearAccount(person.id);
    await auth.signOut();
    localStorage.removeItem("p1-last-account");
    setPerson(null);
    setData({});
  }
  async function authSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget)) as Record<
      string,
      string
    >;
    await run(async () => {
      if (authMode === "reset") {
        const r = await auth.requestPasswordReset({
          email: values.email,
          redirectTo: location.origin + "/?reset=1",
        });
        if (r.error) throw new Error(r.error.message);
        setNotice("If this account exists, a reset email has been queued.");
        return;
      }
      if (authMode === "new-password") {
        const token = new URLSearchParams(location.search).get("token") || "";
        const r = await auth.resetPassword({
          newPassword: values.password,
          token,
        });
        if (r.error) throw new Error(r.error.message);
        history.replaceState(null, "", "/");
        setAuthMode("login");
        setNotice("Password updated. Sign in to continue.");
        return;
      }
      if (authMode === "totp" || authMode === "recovery") {
        const r =
          authMode === "recovery"
            ? await auth.twoFactor.verifyBackupCode({ code: values.totp })
            : await auth.twoFactor.verifyTotp({ code: values.totp });
        if (r.error) throw new Error(r.error.message);
        await session();
        return;
      }
      if (authMode === "signup") {
        const invitation =
          new URLSearchParams(location.search).get("invitation") ||
          values.invitation ||
          "";
        const r = await auth.signUp.email({
          name: values.name,
          email: values.email,
          password: values.password,
          callbackURL: location.origin + "?signin=1",
          fetchOptions: {
            headers: {
              "x-p1-setup-code": values.code || "",
              "x-p1-invitation": invitation,
            },
          },
        });
        if (r.error) throw new Error(r.error.message);
        setNotice(
          "Account created. Verify your email, then sign in to finish activation.",
        );
        setAuthMode("login");
        return;
      }
      const r = await auth.signIn.email({
        email: values.email,
        password: values.password,
      });
      if (r.error) throw new Error(r.error.message);
      if ((r.data as any)?.twoFactorRedirect) {
        setAuthMode("totp");
        return;
      }
      await session();
    });
  }
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (
      boot?.configured &&
      !boot.initialized &&
      !params.has("reset") &&
      !params.has("signin")
    )
      setAuthMode("signup");
  }, [boot?.configured, boot?.initialized]);
  useEffect(() => {
    if (new URLSearchParams(location.search).has("reset"))
      setAuthMode("new-password");
  }, []);
  useEffect(() => {
    if (!form) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector(
      '[role="dialog"]',
    ) as HTMLElement | null;
    const controls = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
        ) || [],
      );
    controls()[0]?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setForm(null);
        return;
      }
      if (event.key === "Tab") {
        const list = controls(),
          first = list[0],
          last = list[list.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [form]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const b = Object.fromEntries(formData) as Record<string, string>;
    await run(async () => {
      if (form === "photo") {
        const file = formData.get("photo") as File;
        if (!file?.size) throw new Error("Choose a photo");
        if (
          !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
          file.size > 15 * 1024 * 1024
        )
          throw new Error("Use a JPEG, PNG, or WebP photo under 15 MB");
        await offline.savePhoto(person!.id, {
          id: crypto.randomUUID(),
          propertyId: selected.property_id,
          workOrderId: selected.id,
          classification: b.classification,
          blob: file,
        });
        setNotice("Photo saved on this device. Sync when connected.");
      }
      if (form === "recurring")
        await api("/recurring-services", {
          ...b,
          intervalCount: Number(b.intervalCount),
        });
      if (form === "project") await api("/projects", b);
      if (form === "expense")
        await api("/expenses", {
          ...b,
          amountCents: Math.round(Number(b.amount) * 100),
        });
      if (form === "inspection")
        await api("/inspections", {
          propertyId: b.propertyId,
          title: b.title,
          findings: [{ label: b.label, condition: b.condition, note: b.note }],
        });
      if (form === "convert")
        await api("/leads/" + selected.id + "/convert", {
          clientId: b.clientId || undefined,
          propertyName: b.propertyName,
          address: b.address,
        });
      if (form === "revise" || form === "change-order")
        await api(
          "/estimates/" +
            selected.id +
            "/" +
            (form === "revise" ? "revise" : "change-order"),
          {
            title: b.title,
            scope: b.scope,
            amountCents: Math.round(Number(b.amount) * 100),
            revision: selected.revision,
          },
        );
      if (form === "client")
        await api("/clients", {
          name: b.name,
          ...(b.email ? { email: b.email } : {}),
          ...(b.phone ? { phone: b.phone } : {}),
        });
      if (form === "property")
        await api("/properties", {
          clientId: b.clientId,
          name: b.name,
          address: b.address,
          acreage: b.acreage ? Number(b.acreage) : undefined,
          accessInstructions: b.accessInstructions,
        });
      if (form === "work")
        await api("/work-orders", {
          propertyId: b.propertyId,
          title: b.title,
          scope: b.scope,
          assignedTo: b.assignedTo || undefined,
          scheduledAt: b.scheduledAt
            ? new Date(b.scheduledAt).toISOString()
            : undefined,
          checklist: b.checklist
            ? b.checklist
                .split("\n")
                .filter(Boolean)
                .map((label) => ({ label, done: false }))
            : [],
        });
      if (form === "lead") await api("/leads", b);
      if (form === "estimate")
        await api("/estimates", {
          ...b,
          amountCents: Math.round(Number(b.amount) * 100),
        });
      if (form === "billing")
        await api("/billing", {
          ...b,
          operationId: billingOperationId,
          amountCents: Math.round(Number(b.amount) * 100),
        });
      if (form === "request") await api("/requests", b);
      if (form === "invite")
        await api("/invitations", { ...b, clientId: b.clientId || undefined });
      if (form === "slot")
        await api("/assessment-slots", {
          startsAt: new Date(b.startsAt).toISOString(),
          endsAt: new Date(b.endsAt).toISOString(),
        });
      if (form === "book")
        await api("/assessment-slots/" + selected.id + "/book", {
          propertyId: b.propertyId,
        });
      if (form === "field") {
        if (!person) return;
        await offline.enqueue(person.id, {
          id: crypto.randomUUID(),
          workOrderId: selected.id,
          baseVersion: selected.version,
          kind: b.kind as offline.FieldOperation["kind"],
          payload: {
            text: b.text,
            ...(b.kind === "checklist"
              ? {
                  items: (selected.checklist || []).map(
                    (item: any, index: number) => ({
                      label: item.label,
                      done: formData.get("check-" + index) === "on",
                    }),
                  ),
                }
              : {}),
            ...(b.action ? { action: b.action as any } : {}),
          },
          capturedAt: new Date().toISOString(),
        });
        setNotice("Saved on this device. Use Sync Now when connected.");
      }
      setForm(null);
      await refresh();
    });
  }
  const field = (
    name: string,
    label: string,
    type = "text",
    required = true,
  ) => (
    <label>
      {label}
      <input name={name} type={type} required={required} />
    </label>
  );
  const propertySelect = () => (
    <label>
      Property
      <select name="propertyId" required>
        <option value="">Choose a property</option>
        {(data.properties || []).map((p: any) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </label>
  );
  const clientSelect = (required = true) => (
    <label>
      Client
      <select name="clientId" required={required}>
        <option value="">Choose a client</option>
        {(data.clients || []).map((p: any) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </label>
  );
  const openForm = (name: string, row?: any) => {
    setSelected(row);
    setForm(name);
  };
  const staff = Boolean(
      person && person.role !== "client" && person.role !== "crew",
    ),
    manager = ["owner", "manager"].includes(person?.role || ""),
    ops = ["owner", "manager", "dispatch"].includes(person?.role || "");
  const allowedNav = nav.filter(([n]) =>
    person?.role === "crew"
      ? ["My Day", "Properties"].includes(n)
      : person?.role === "client"
        ? [
            "Overview",
            "Properties",
            "Schedule",
            "Sales",
            "Billing",
            "Requests",
          ].includes(n)
        : ["Recurring", "Projects", "Inspections"].includes(n)
          ? ops
          : n === "Expenses"
            ? ["owner", "manager", "finance"].includes(person?.role || "")
            : n === "Settings"
              ? manager
              : n === "Billing"
                ? ["owner", "manager", "finance"].includes(person?.role || "")
                : n === "Sales"
                  ? ["owner", "manager", "sales"].includes(person?.role || "")
                  : true,
  );
  if (loading) return <div className="loading">Loading P1 Operations…</div>;
  if (!person)
    return (
      <main className="auth-page">
        <section className="auth-story">
          <div className="brand">
            <img src="/icon.svg" alt="P1" width="48" height="36" /> LAND &
            PROPERTY MANAGEMENT
          </div>
          <p className="eyebrow">PROPERTY OPERATIONS</p>
          <h1>
            Good work.
            <br />
            Well managed.
          </h1>
          <p>
            One place for your properties, your people,
            <br />
            and everything that needs doing.
          </p>
          <div className="contours" aria-hidden="true" />
        </section>
        <section className="auth-card">
          <p className="eyebrow">WELCOME TO P1</p>
          <h2>
            {authMode === "signup"
              ? !boot?.initialized
                ? "Set up your owner account"
                : "Create your account"
              : ["totp", "recovery"].includes(authMode)
                ? "Verify your sign-in"
                : authMode === "reset"
                  ? "Reset password"
                  : authMode === "new-password"
                    ? "Choose a new password"
                    : "Welcome back"}
          </h2>
          <p className="muted">
            {boot && !boot.initialized
              ? boot.configured
                ? authMode === "signup"
                  ? "Use the designated owner email and setup code from your email. Choose a new dashboard password below. Then verify your email and enroll your authenticator to activate ownership."
                  : "Already created your dashboard account? Sign in with the password you chose during setup. Otherwise, start owner setup below."
                : "Owner setup is awaiting configuration. Account creation is currently unavailable."
              : "Sign in to your property operations workspace."}
          </p>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="notice">
              {notice}
            </p>
          )}
          <form onSubmit={authSubmit}>
            {authMode === "signup" && field("name", "Full name")}
            {!["totp", "recovery", "new-password"].includes(authMode) &&
              field("email", "Email address", "email")}
            {!["reset", "totp", "recovery"].includes(authMode) &&
              field(
                "password",
                authMode === "signup"
                  ? "Choose a password (at least 12 characters)"
                  : "Password",
                "password",
              )}
            {authMode === "signup" &&
              (boot?.initialized
                ? field("invitation", "Invitation token", "text", false)
                : field("code", "Owner setup code"))}
            {["totp", "recovery"].includes(authMode) &&
              field(
                "totp",
                authMode === "recovery"
                  ? "Recovery code"
                  : "Authenticator code",
              )}
            <button className="primary" type="submit">
              {authMode === "signup"
                ? "Create account and verify email"
                : "Continue"}{" "}
              <ArrowUpRight size={17} />
            </button>
          </form>
          <div className="auth-links">
            {["totp", "recovery"].includes(authMode) && (
              <button
                onClick={() =>
                  setAuthMode(authMode === "totp" ? "recovery" : "totp")
                }
              >
                {authMode === "totp"
                  ? "Use a recovery code"
                  : "Use authenticator"}
              </button>
            )}
            <button
              onClick={() =>
                setAuthMode(authMode === "login" ? "signup" : "login")
              }
            >
              {authMode === "login"
                ? !boot?.initialized
                  ? "Start owner setup"
                  : "Set up an invited account"
                : "Already created an account? Sign in"}
            </button>
            <button onClick={() => setAuthMode("reset")}>
              Forgot password?
            </button>
          </div>
          <a className="website-link" href="https://www.p1landmanagement.com/">
            ← Back to P1 website
          </a>
        </section>
      </main>
    );
  if (!person.role)
    return (
      <main className="activation">
        <div className="brand">
          <img src="/icon.svg" alt="P1" width="48" height="36" /> ACCOUNT
          ACTIVATION
        </div>
        <h1>Finish your account setup.</h1>
        <p>Signed in as {person.email}</p>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {notice && <p className="notice">{notice}</p>}
        {!boot?.initialized ? (
          <>
            <p>
              Verify your authenticator before activating the owner account.
            </p>
            {!person.twoFactorEnabled && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const b = new FormData(e.currentTarget);
                  void run(async () => {
                    const r = await auth.twoFactor.enable({
                      password: String(b.get("password")),
                    });
                    if (r.error) throw new Error(r.error.message);
                    setMfa(r.data);
                  });
                }}
              >
                {field("password", "Current password", "password")}
                <button className="primary">Set up authenticator</button>
              </form>
            )}
            {mfa && (
              <>
                <p>Add this key to your authenticator app:</p>
                <code className="secret">
                  {new URL(mfa.totpURI).searchParams.get("secret")}
                </code>
                <p>Save your recovery codes privately:</p>
                <pre className="secret">{mfa.backupCodes.join("\n")}</pre>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const b = new FormData(e.currentTarget);
                    void run(async () => {
                      const r = await auth.twoFactor.verifyTotp({
                        code: String(b.get("code")),
                      });
                      if (r.error) throw new Error(r.error.message);
                      setMfa(null);
                      await session();
                    });
                  }}
                >
                  {field("code", "Authenticator code")}
                  <button className="primary">Verify authenticator</button>
                </form>
              </>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const b = new FormData(e.currentTarget);
                void run(async () => {
                  await api("/setup/complete", { code: b.get("code") });
                  await session();
                });
              }}
            >
              {field("code", "Owner setup code")}
              <button className="primary" disabled={!person.twoFactorEnabled}>
                Activate owner account
              </button>
            </form>
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const b = new FormData(e.currentTarget);
              void run(async () => {
                await api("/invitations/accept", { token: b.get("token") });
                await session();
                history.replaceState(null, "", "/");
              });
            }}
          >
            <label>
              Invitation token
              <input
                name="token"
                defaultValue={
                  new URLSearchParams(location.search).get("invitation") || ""
                }
                required
              />
            </label>
            <button className="primary">Accept invitation</button>
          </form>
        )}
        <button className="text-button" onClick={() => void run(logout)}>
          Sign out
        </button>
      </main>
    );
  return (
    <div className="app">
      <aside className={menu ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <img src="/icon.svg" alt="P1" width="48" height="36" />
          <div>
            LAND & PROPERTY<small>OPERATIONS WORKSPACE</small>
          </div>
        </div>
        <p className="nav-caption">WORKSPACE</p>
        <nav>
          {allowedNav.map(([n, Icon]) => (
            <button
              key={n}
              className={view === n ? "active" : ""}
              onClick={() => {
                setView(n);
                setMenu(false);
              }}
            >
              <Icon size={19} />
              {n}
              {n === "Requests" && data.requests?.length > 0 && (
                <b>{data.requests.length}</b>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="season">
            <Leaf size={19} />
            <div>
              Built around the land.<small>P1 Land & Property Management</small>
            </div>
          </div>
          <button onClick={() => void run(logout)}>
            <LogOut size={17} /> Sign out
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button
            className="mobile-menu"
            aria-label="Toggle navigation"
            onClick={() => setMenu(!menu)}
          >
            <Menu />
          </button>
          <div>
            Workspace <span>/</span> <strong>{view}</strong>
          </div>
          <div className="user">
            <span className={isOnline ? "connection" : "connection offline"}>
              {isOnline ? "Connected" : "Offline"}
            </span>
            <span className="avatar">{person.name.slice(0, 1)}</span>
            <div>
              {person.name}
              <small>{person.role}</small>
            </div>
          </div>
        </header>
        <main className="content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">P1 · PROPERTY OPERATIONS</p>
              <h1>{view === "Overview" ? "A clear view of the day." : view}</h1>
              <p className="muted">
                {view === "Overview"
                  ? "Your properties, people, and next priorities."
                  : view === "My Day"
                    ? "Your assignments and field notes, wherever work takes you."
                    : "Keep the details connected to the work."}
              </p>
            </div>
            <div className="heading-actions">
              {view === "Clients" && staff && (
                <button className="primary" onClick={() => openForm("client")}>
                  <Plus size={17} /> Add client
                </button>
              )}
              {view === "Properties" && staff && (
                <button
                  className="primary"
                  onClick={() => openForm("property")}
                >
                  <Plus size={17} /> Add property
                </button>
              )}
              {view === "Schedule" && ops && (
                <button className="primary" onClick={() => openForm("work")}>
                  <Plus size={17} /> New work order
                </button>
              )}
              {view === "Recurring" && ops && (
                <button
                  className="primary"
                  onClick={() => openForm("recurring")}
                >
                  <Plus size={17} /> Recurring service
                </button>
              )}
              {view === "Projects" && manager && (
                <button className="primary" onClick={() => openForm("project")}>
                  <Plus size={17} /> New project
                </button>
              )}
              {view === "Inspections" && ops && (
                <button
                  className="primary"
                  onClick={() => openForm("inspection")}
                >
                  <Plus size={17} /> New inspection
                </button>
              )}
              {view === "Expenses" && (
                <button className="primary" onClick={() => openForm("expense")}>
                  <Plus size={17} /> Record expense
                </button>
              )}
              {view === "Requests" && (
                <button className="primary" onClick={() => openForm("request")}>
                  <Plus size={17} /> Request service
                </button>
              )}
            </div>
          </div>
          {error && (
            <div role="alert" className="error">
              {error}
            </div>
          )}
          {notice && (
            <div role="status" className="notice">
              {notice}
            </div>
          )}
          {view === "Overview" && (
            <>
              <div className="metrics">
                {[
                  [
                    "Properties",
                    data.properties?.length || 0,
                    "In your workspace",
                  ],
                  [
                    "Scheduled work",
                    data.work?.filter((w: any) => w.status === "scheduled")
                      .length || 0,
                    "Ready for the crew",
                  ],
                  [
                    "Awaiting review",
                    data.work?.filter((w: any) => w.status === "completed")
                      .length || 0,
                    "Completion to confirm",
                  ],
                  [
                    "Service requests",
                    data.requests?.filter((r: any) => r.status === "new")
                      .length || 0,
                    "Conversations to follow up",
                  ],
                ].map(([label, value, sub]) => (
                  <section key={label} className="metric">
                    <p>
                      {label}
                      <ArrowUpRight size={17} />
                    </p>
                    <strong>{value}</strong>
                    <small>{sub}</small>
                  </section>
                ))}
              </div>
              <div className="overview-grid">
                <section className="panel">
                  <div className="panel-heading">
                    <h2>On the schedule</h2>
                    <button onClick={() => setView("Schedule")}>
                      View all <ArrowUpRight size={15} />
                    </button>
                  </div>
                  {data.work?.length ? (
                    data.work.slice(0, 5).map((w: any) => (
                      <div className="schedule-row" key={w.id}>
                        <div className="job-icon">
                          <ClipboardList size={20} />
                        </div>
                        <div>
                          <strong>{w.title}</strong>
                          <small>
                            {w.property_name} · {date(w.scheduled_at)}
                          </small>
                        </div>
                        <span className={"badge " + w.status}>
                          {w.status.replaceAll("_", " ")}
                        </span>
                      </div>
                    ))
                  ) : (
                    <Empty
                      title="A fresh start for your operations"
                      text="Add a client and property, then schedule your first work order."
                    />
                  )}
                </section>
                <section className="next-panel">
                  <p className="eyebrow">THE NEXT RIGHT THING</p>
                  <h2>
                    Keep the work
                    <br />
                    moving forward.
                  </h2>
                  <p>
                    Review completed jobs, follow up on requests, and keep every
                    property’s history up to date.
                  </p>
                  <button onClick={() => setView("Requests")}>
                    Open requests <ArrowUpRight size={18} />
                  </button>
                </section>
              </div>
              <section className="panel">
                <div className="panel-heading">
                  <h2>Your properties</h2>
                  <button onClick={() => setView("Properties")}>
                    Explore properties <ArrowUpRight size={15} />
                  </button>
                </div>
                <PropertyCards
                  properties={data.properties || []}
                  onOpen={async (p) => {
                    await run(async () => {
                      setSelected({
                        property: p,
                        timeline: await api(
                          "/properties/" + p.id + "/timeline",
                        ),
                      });
                      setForm("timeline");
                    });
                  }}
                />
              </section>
            </>
          )}
          {view === "Properties" && (
            <section className="panel">
              <PropertyCards
                properties={data.properties || []}
                onOpen={async (p) => {
                  await run(async () => {
                    setSelected({
                      property: p,
                      timeline: await api("/properties/" + p.id + "/timeline"),
                    });
                    setForm("timeline");
                  });
                }}
              />
            </section>
          )}
          {view === "Clients" && (
            <section className="panel">
              {(data.clients || []).map((client: any) => (
                <div className="schedule-row" key={client.id}>
                  <div>
                    <strong>{client.name}</strong>
                    <small>
                      {[client.email, client.phone].filter(Boolean).join(" · ")}
                    </small>
                  </div>
                  {staff && (
                    <button onClick={() => openForm("contacts", client)}>
                      Manage contacts
                    </button>
                  )}
                </div>
              ))}
              {!data.clients?.length && (
                <p className="empty">
                  No clients yet. Add your first client to get started.
                </p>
              )}
            </section>
          )}
          {["Schedule", "My Day"].includes(view) && (
            <>
              {view === "My Day" && (
                <div className="offline-toolbar">
                  <div>
                    <strong>{count} pending field entries</strong>
                    <small>
                      {downloadedAt
                        ? "Downloaded " + date(downloadedAt)
                        : "Download assignments before leaving cell coverage."}
                    </small>
                  </div>
                  <label>
                    Work date
                    <input
                      type="date"
                      value={fieldDay}
                      onChange={(event) => setFieldDay(event.target.value)}
                    />
                  </label>
                  <small>
                    {persistentStorage
                      ? "Persistent storage granted"
                      : "Browser storage may be cleared by this device"}
                  </small>
                  <button
                    disabled={!isOnline}
                    onClick={() =>
                      void run(async () => {
                        await offline.saveDay(
                          person.id,
                          (data.work || []).filter(
                            (work: any) =>
                              work.scheduled_at &&
                              operatingDate(work.scheduled_at) === fieldDay,
                          ),
                        );
                        const saved = await offline.readDay(person.id);
                        setDownloadedAt(saved?.savedAt || null);
                        setPersistentStorage(
                          (await offline.storageStatus()).persistent,
                        );
                        setNotice(
                          "Assignments saved for offline use on this device.",
                        );
                      })
                    }
                  >
                    <Download size={17} /> Download My Day
                  </button>
                  <button disabled={!isOnline} onClick={() => void run(sync)}>
                    <RefreshCw size={17} /> Sync Now
                  </button>
                </div>
              )}
              {view === "Schedule" && (
                <ScheduleCalendar
                  work={data.work || []}
                  staff={data.staff || []}
                  canManage={ops}
                  onSelect={(id) => {
                    const target = document.getElementById("work-" + id);
                    target?.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                    target?.focus({ preventScroll: true });
                  }}
                />
              )}
              <section className="panel">
                {data.work?.some(
                  (work: any) =>
                    view !== "My Day" ||
                    (work.scheduled_at &&
                      operatingDate(work.scheduled_at) === fieldDay),
                ) ? (
                  data.work
                    .filter(
                      (work: any) =>
                        view !== "My Day" ||
                        (work.scheduled_at &&
                          operatingDate(work.scheduled_at) === fieldDay),
                    )
                    .map((w: any) => (
                      <article
                        className="work-card"
                        key={w.id}
                        id={"work-" + w.id}
                        tabIndex={-1}
                      >
                        <div>
                          <span className={"badge " + w.status}>
                            {w.status.replaceAll("_", " ")}
                          </span>
                          <h2>{w.title}</h2>
                          <p>
                            {w.property_name} · {date(w.scheduled_at)}
                          </p>
                          <p className="muted">{w.scope}</p>
                          {person.role !== "client" && (
                            <p className="access">
                              {w.access_instructions ||
                                "No access instructions recorded."}
                            </p>
                          )}
                        </div>
                        <div className="work-actions">
                          {(ops || person.role === "crew") && (
                            <>
                              {view === "My Day" &&
                                w.status === "scheduled" && (
                                  <button
                                    onClick={() =>
                                      void run(async () => {
                                        const pending = await offline.pending(
                                          person.id,
                                        );
                                        if (
                                          !pending.some(
                                            (event) =>
                                              event.workOrderId === w.id &&
                                              event.kind === "time" &&
                                              event.payload.action === "start",
                                          )
                                        ) {
                                          await offline.enqueue(person.id, {
                                            id: crypto.randomUUID(),
                                            workOrderId: w.id,
                                            baseVersion: w.version,
                                            kind: "time",
                                            payload: { action: "start" },
                                            capturedAt:
                                              new Date().toISOString(),
                                          });
                                        }
                                        setNotice(
                                          "Work start saved on this device. Sync Now sends it with your field entries.",
                                        );
                                        await refresh();
                                      })
                                    }
                                  >
                                    Start work
                                  </button>
                                )}
                              <button onClick={() => openForm("field", w)}>
                                Add field entry
                              </button>
                              <button onClick={() => openForm("photo", w)}>
                                Capture photo
                              </button>
                            </>
                          )}
                          {ops &&
                            view !== "My Day" &&
                            (
                              {
                                draft: "scheduled",
                                scheduled: "in_progress",
                                in_progress: "completed",
                                completed: manager ? "reviewed" : null,
                                delayed: "scheduled",
                              } as any
                            )[w.status] && (
                              <button
                                disabled={!isOnline}
                                onClick={() =>
                                  void run(async () => {
                                    await api(
                                      "/work-orders/" + w.id + "/status",
                                      {
                                        status: (
                                          {
                                            draft: "scheduled",
                                            scheduled: "in_progress",
                                            in_progress: "completed",
                                            completed: "reviewed",
                                            delayed: "scheduled",
                                          } as any
                                        )[w.status],
                                        version: w.version,
                                      },
                                    );
                                    await refresh();
                                  })
                                }
                              >
                                {
                                  (
                                    {
                                      draft: "Schedule",
                                      scheduled: "Start work",
                                      in_progress: "Complete",
                                      completed: "Review completion",
                                      delayed: "Reschedule",
                                    } as any
                                  )[w.status]
                                }
                              </button>
                            )}
                          {manager &&
                            w.status === "reviewed" &&
                            !w.published && (
                              <button
                                onClick={() =>
                                  void run(async () => {
                                    await api(
                                      "/work-orders/" + w.id + "/publish",
                                      {},
                                    );
                                    await refresh();
                                  })
                                }
                              >
                                Publish report
                              </button>
                            )}
                        </div>
                      </article>
                    ))
                ) : (
                  <Empty
                    title={
                      view === "My Day"
                        ? "No work scheduled for this date"
                        : "No work orders yet"
                    }
                    text="Scheduled assignments will appear here."
                  />
                )}
              </section>
              {view === "Schedule" && ops && (
                <AssessmentAvailability request={api} onChange={refresh} />
              )}
              {view === "Schedule" && (
                <section className="panel">
                  <div className="panel-heading">
                    <h2>Assessment appointments</h2>
                    {ops && (
                      <button onClick={() => openForm("slot")}>
                        <Plus size={16} /> Add availability
                      </button>
                    )}
                  </div>
                  {(data["assessment-slots"] || []).map((s: any) => (
                    <div className="schedule-row" key={s.id}>
                      <strong>{date(s.starts_at)}</strong>
                      <button onClick={() => openForm("book", s)}>
                        Book assessment
                      </button>
                    </div>
                  ))}
                  {!data["assessment-slots"]?.length && (
                    <p className="empty">
                      No assessment appointments are currently available.
                    </p>
                  )}
                </section>
              )}
            </>
          )}
          {view === "Sales" && (
            <>
              <section className="panel">
                <div className="panel-heading">
                  <h2>Estimates</h2>
                  {staff && (
                    <button onClick={() => openForm("estimate")}>
                      <Plus size={16} /> New estimate
                    </button>
                  )}
                </div>
                {(data.estimates || []).map((e: any) => (
                  <div className="schedule-row" key={e.id}>
                    <div>
                      <strong>{e.title}</strong>
                      <small>
                        {e.property_name} · Revision {e.revision}
                      </small>
                      <p>{e.scope}</p>
                    </div>
                    <strong>{money(e.amount_cents)}</strong>
                    <span className="badge">
                      {e.is_current ? e.status : "superseded"}
                    </span>
                    {staff && e.is_current && (
                      <button
                        onClick={() =>
                          openForm(
                            e.status === "approved" ? "change-order" : "revise",
                            e,
                          )
                        }
                      >
                        {e.status === "approved" ? "Change order" : "Revise"}
                      </button>
                    )}
                    {e.status === "draft" && e.is_current && staff && (
                      <button
                        onClick={() =>
                          void run(async () => {
                            await api("/estimates/" + e.id + "/decision", {
                              status: "sent",
                              revision: e.revision,
                            });
                            await refresh();
                          })
                        }
                      >
                        Make available
                      </button>
                    )}
                    {e.status === "sent" &&
                      e.is_current &&
                      person.role === "client" &&
                      ["approved", "declined"].map((status) => (
                        <button
                          key={status}
                          onClick={() =>
                            void run(async () => {
                              await api("/estimates/" + e.id + "/decision", {
                                status,
                                revision: e.revision,
                              });
                              await refresh();
                            })
                          }
                        >
                          {status === "approved" ? "Approve scope" : "Decline"}
                        </button>
                      ))}
                  </div>
                ))}
                {!data.estimates?.length && (
                  <p className="empty">Your estimates will appear here.</p>
                )}
              </section>
              {staff && (
                <section className="panel">
                  <div className="panel-heading">
                    <h2>Inquiries</h2>
                    <button onClick={() => openForm("lead")}>
                      <Plus size={16} /> Add inquiry
                    </button>
                  </div>
                  {(data.leads || []).map((lead: any) => (
                    <div className="schedule-row" key={lead.id}>
                      <div>
                        <strong>{lead.name}</strong>
                        <small>
                          {lead.location} · {lead.description}
                        </small>
                      </div>
                      <span className="badge">{lead.status}</span>
                      {!lead.converted_property_id &&
                        ["owner", "manager", "sales"].includes(
                          person.role || "",
                        ) && (
                          <button onClick={() => openForm("convert", lead)}>
                            Convert inquiry
                          </button>
                        )}
                    </div>
                  ))}
                  {!data.leads?.length && (
                    <p className="empty">No inquiries recorded.</p>
                  )}
                </section>
              )}
            </>
          )}
          {view === "Billing" && (
            <section className="panel">
              <div className="panel-heading">
                <h2>{staff ? "Billing drafts & invoices" : "Your invoices"}</h2>
                {staff && (
                  <button
                    onClick={() => (
                      setBillingOperationId(crypto.randomUUID()),
                      openForm("billing")
                    )}
                  >
                    <Plus size={16} /> Prepare billing
                  </button>
                )}
              </div>
              {staff && (
                <p className="integration-note">
                  QuickBooks connection is required before invoices can be
                  posted. Drafts do not send or charge customers.
                </p>
              )}
              {(data.billing || []).map((b: any) => (
                <div className="schedule-row" key={b.id}>
                  <div>
                    <strong>{b.title}</strong>
                    <small>
                      {b.property_name} · {b.kind}
                    </small>
                  </div>
                  <strong>{money(b.amount_cents)}</strong>
                  <span className="badge">{b.status}</span>
                  {staff && b.status === "posted" && !b.ownership_verified && (
                    <small role="status">
                      Accounting customer needs reconciliation · hidden from
                      client
                    </small>
                  )}
                  {staff && b.status !== "posted" && (
                    <button
                      onClick={() =>
                        void run(async () => {
                          await api("/billing/" + b.id + "/post", {});
                          await refresh();
                        })
                      }
                    >
                      Post to QuickBooks
                    </button>
                  )}
                  {b.payment_url && (
                    <a href={b.payment_url} target="_blank" rel="noreferrer">
                      Pay invoice
                    </a>
                  )}
                </div>
              ))}
              {(data["quickbooks/invoices"] || []).map((invoice: any) => (
                <div className="schedule-row" key={"qbo-" + invoice.id}>
                  <div>
                    <strong>
                      Invoice {invoice.document_number || invoice.id}
                    </strong>
                    <small>{invoice.client_name}</small>
                    {staff && !invoice.ownership_verified && (
                      <small>
                        Customer mapping needs review · hidden from client
                      </small>
                    )}
                  </div>
                  <strong>{money(invoice.balance_cents)} outstanding</strong>
                  {invoice.payment_url && invoice.ownership_verified && (
                    <a
                      href={invoice.payment_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Pay invoice
                    </a>
                  )}
                </div>
              ))}
              {!data.billing?.length &&
                !data["quickbooks/invoices"]?.length && (
                  <Empty
                    title="Billing, connected to the work"
                    text="Approved estimates provide the basis for deposits, progress billing, and final balances."
                  />
                )}
            </section>
          )}
          {view === "Recurring" && (
            <section className="panel">
              <Table
                rows={data["recurring-services"] || []}
                columns={[
                  "title",
                  "property_name",
                  "cadence",
                  "next_date",
                  "billing_mode",
                  "paused",
                ]}
                empty="No recurring services yet."
              />
            </section>
          )}
          {view === "Projects" && (
            <section className="panel">
              <Table
                rows={data.projects || []}
                columns={["name", "property_name", "scope", "status"]}
                empty="No projects yet."
              />
            </section>
          )}
          {view === "Inspections" && (
            <section className="panel">
              <Table
                rows={data.inspections || []}
                columns={["title", "property_name", "created_at"]}
                empty="No inspections yet."
              />
            </section>
          )}
          {view === "Expenses" && (
            <section className="panel">
              <Table
                rows={(data.expenses || []).map((e: any) => ({
                  ...e,
                  amount: money(e.amount_cents),
                }))}
                columns={[
                  "property_name",
                  "description",
                  "category",
                  "amount",
                  "incurred_on",
                ]}
                empty="No expenses yet."
              />
            </section>
          )}
          {view === "Requests" && (
            <section className="panel">
              <Table
                rows={data.requests || []}
                columns={["property_name", "description", "status"]}
                empty="No service requests. New requests will appear here."
              />
            </section>
          )}
          {view === "Settings" && (
            <>
              <section className="panel">
                <div className="panel-heading">
                  <h2>People & access</h2>
                  <button onClick={() => openForm("invite")}>
                    <Plus size={16} /> Invite a person
                  </button>
                </div>
                <Table
                  rows={data.staff || []}
                  columns={["name", "role"]}
                  empty="No staff records."
                />
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <h2>Integrations</h2>
                  <button
                    onClick={() =>
                      void run(async () => {
                        const r = await api("/quickbooks/connect", {});
                        location.assign(r.url);
                      })
                    }
                  >
                    Connect QuickBooks
                  </button>
                </div>
                <div className="panel-heading">
                  <button
                    onClick={() =>
                      void run(async () => {
                        setSelected(
                          await api("/quickbooks/import-preview", {}),
                        );
                        setForm("import");
                      })
                    }
                  >
                    Preview QuickBooks import
                  </button>
                </div>
                {[
                  [
                    "QuickBooks Online",
                    data.integrations?.quickbooks?.configured,
                  ],
                  ["Mailgun email", data.integrations?.email?.configured],
                  ["Twilio SMS", data.integrations?.sms?.configured],
                ].map(([name, configured]) => (
                  <div className="schedule-row" key={String(name)}>
                    <strong>{name}</strong>
                    <span className="badge">
                      {configured
                        ? "Configured · verification required"
                        : "Not configured"}
                    </span>
                  </div>
                ))}
                <Table
                  rows={data.integrations?.jobs || []}
                  columns={["kind", "status", "attempts", "last_error"]}
                  empty="No pending delivery jobs."
                />
              </section>
            </>
          )}
          <footer className="footer">
            P1 LAND & PROPERTY MANAGEMENT <span>Built for the work ahead.</span>
          </footer>
        </main>
      </div>
      {form && (
        <div className="modal-backdrop">
          <section
            role="dialog"
            aria-modal="true"
            aria-label={
              form === "timeline" ? "Property history" : "Create record"
            }
            className="modal"
          >
            <div className="panel-heading">
              <h2>
                {form === "timeline"
                  ? selected.property.name
                  : form === "field"
                    ? "Record field work"
                    : form === "book"
                      ? "Book assessment"
                      : "Add " + form}
              </h2>
              <button onClick={() => setForm(null)} aria-label="Close dialog">
                ✕
              </button>
            </div>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            {form === "contacts" ? (
              <ClientContacts client={selected} request={api} />
            ) : form === "import" ? (
              <div className="import-preview">
                <p>
                  {selected.customers.length} customers ·{" "}
                  {selected.openInvoices} open invoices
                </p>
                <Table
                  rows={selected.customers.map((c: any) => ({
                    ...c,
                    match: c.existingId
                      ? "Already linked"
                      : c.possibleMatches.length
                        ? "Review duplicate — excluded"
                        : "New client",
                  }))}
                  columns={["name", "email", "match"]}
                  empty="No customers found."
                />
                <button
                  className="primary"
                  onClick={() =>
                    void run(async () => {
                      await api("/quickbooks/import", {
                        previewId: selected.id,
                        customers: selected.customers
                          .filter(
                            (c: any) =>
                              c.existingId || !c.possibleMatches.length,
                          )
                          .map((c: any) => ({
                            quickbooksId: c.quickbooksId,
                            clientId: c.existingId,
                          })),
                      });
                      setForm(null);
                      await refresh();
                    })
                  }
                >
                  Import linked and nonduplicate customers
                </button>
              </div>
            ) : form === "timeline" ? (
              <>
                {selected.timeline.length ? (
                  selected.timeline.map((e: any) => (
                    <div className="timeline-row" key={e.id}>
                      <span className="badge">
                        {e.kind}
                        {e.conflict ? " · needs review" : ""}
                      </span>
                      <p>
                        {e.payload.text || e.payload.action || "Work recorded"}
                      </p>
                      <small>
                        {date(e.captured_at)} · {e.title}
                      </small>
                    </div>
                  ))
                ) : (
                  <Empty
                    title="The property story starts here"
                    text="Reviewed service records and observations will build a history of this property."
                  />
                )}
              </>
            ) : (
              <form onSubmit={submit}>
                {form === "photo" && (
                  <>
                    <label>
                      Photo
                      <input
                        type="file"
                        name="photo"
                        accept="image/jpeg,image/png,image/webp"
                        capture="environment"
                        required
                      />
                    </label>
                    <label>
                      Classification
                      <select name="classification">
                        {["before", "during", "after", "issue", "general"].map(
                          (k) => (
                            <option key={k}>{k}</option>
                          ),
                        )}
                      </select>
                    </label>
                    <p>Photos stay private until reviewed and published.</p>
                  </>
                )}
                {form === "recurring" && (
                  <>
                    {propertySelect()}
                    {field("title", "Service title")}
                    <label>
                      Scope
                      <textarea name="scope" />
                    </label>
                    <label>
                      Frequency
                      <select name="cadence">
                        <option value="weekly">Weeks</option>
                        <option value="monthly">Months</option>
                      </select>
                    </label>
                    {field("intervalCount", "Every X weeks/months", "number")}
                    {field("nextDate", "First visit", "date")}
                    <label>
                      Billing basis
                      <select name="billingMode">
                        <option value="per_visit">Per visit</option>
                        <option value="fixed_monthly">Fixed monthly</option>
                      </select>
                    </label>
                  </>
                )}
                {form === "project" && (
                  <>
                    {propertySelect()}
                    {field("name", "Project name")}
                    <label>
                      Scope
                      <textarea name="scope" required />
                    </label>
                  </>
                )}
                {form === "expense" && (
                  <>
                    {propertySelect()}
                    {field("description", "Description")}
                    {field("category", "Category")}
                    {field("incurredOn", "Date", "date")}
                    <label>
                      Amount (USD)
                      <input
                        name="amount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                      />
                    </label>
                  </>
                )}
                {form === "inspection" && (
                  <>
                    {propertySelect()}
                    {field("title", "Inspection title")}
                    {field("label", "Area or asset observed")}
                    <label>
                      Condition
                      <select name="condition">
                        {[
                          "not_assessed",
                          "good",
                          "monitor",
                          "action_required",
                        ].map((k) => (
                          <option key={k}>{k}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Observation
                      <textarea name="note" required />
                    </label>
                  </>
                )}
                {form === "convert" && (
                  <>
                    {clientSelect(false)}
                    {field("propertyName", "Property name")}
                    {field("address", "Address")}
                    <p>
                      Leave client blank to create a new client from this
                      inquiry.
                    </p>
                  </>
                )}
                {["revise", "change-order"].includes(form) && (
                  <>
                    {field("title", "Title")}
                    <label>
                      Scope
                      <textarea
                        name="scope"
                        required
                        defaultValue={form === "revise" ? selected.scope : ""}
                      />
                    </label>
                    <label>
                      Amount (USD)
                      <input
                        name="amount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                        defaultValue={
                          form === "revise"
                            ? Number(selected.amount_cents) / 100
                            : undefined
                        }
                      />
                    </label>
                  </>
                )}
                {form === "client" && (
                  <>
                    {field("name", "Client name")}
                    {field("email", "Email", "email", false)}
                    {field("phone", "Phone", "tel", false)}
                  </>
                )}
                {form === "property" && (
                  <>
                    {clientSelect()}
                    {field("name", "Property name")}
                    {field("address", "Address")}
                    {field("acreage", "Acreage", "number", false)}
                    <label>
                      Access instructions
                      <textarea name="accessInstructions" />
                    </label>
                  </>
                )}
                {form === "work" && (
                  <>
                    {propertySelect()}
                    {field("title", "Work order title")}
                    <label>
                      Scope
                      <textarea name="scope" />
                    </label>
                    <label>
                      Assigned person
                      <select name="assignedTo">
                        <option value="">Unassigned</option>
                        {(data.staff || []).map((s: any) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    {field(
                      "scheduledAt",
                      "Planned start",
                      "datetime-local",
                      false,
                    )}
                    <label>
                      Checklist — one task per line
                      <textarea name="checklist" />
                    </label>
                  </>
                )}
                {form === "lead" && (
                  <>
                    {field("name", "Name")}
                    {field("email", "Email", "email")}
                    {field("location", "Property location")}
                    <label>
                      What needs doing?
                      <textarea name="description" required />
                    </label>
                  </>
                )}
                {form === "estimate" && (
                  <>
                    {propertySelect()}
                    {field("title", "Estimate title")}
                    <label>
                      Scope to approve
                      <textarea name="scope" required />
                    </label>
                    <label>
                      Amount (USD)
                      <input
                        name="amount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                      />
                    </label>
                  </>
                )}
                {form === "billing" && (
                  <>
                    {propertySelect()}
                    <label>
                      Approved estimate
                      <select name="estimateId" required>
                        <option value="">Choose estimate</option>
                        {(data.estimates || [])
                          .filter((e: any) => e.status === "approved")
                          .map((e: any) => (
                            <option key={e.id} value={e.id}>
                              {e.title}
                            </option>
                          ))}
                      </select>
                    </label>
                    {field("title", "Billing description")}
                    <label>
                      Amount (USD)
                      <input
                        name="amount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                      />
                    </label>
                    <label>
                      Type
                      <select name="kind">
                        {["service", "deposit", "progress", "final"].map(
                          (k) => (
                            <option key={k}>{k}</option>
                          ),
                        )}
                      </select>
                    </label>
                  </>
                )}
                {form === "request" && (
                  <>
                    {propertySelect()}
                    <label>
                      How can we help?
                      <textarea name="description" required />
                    </label>
                  </>
                )}
                {form === "invite" && (
                  <>
                    {field("email", "Email", "email")}
                    <label>
                      Role
                      <select name="role">
                        {[
                          "crew",
                          "client",
                          "dispatch",
                          "sales",
                          "finance",
                          "manager",
                        ].map((k) => (
                          <option key={k}>{k}</option>
                        ))}
                      </select>
                    </label>
                    {clientSelect(false)}
                  </>
                )}
                {form === "slot" && (
                  <>
                    {field(
                      "startsAt",
                      "Start (include travel buffer in slot)",
                      "datetime-local",
                    )}
                    {field("endsAt", "End", "datetime-local")}
                  </>
                )}
                {form === "book" && (
                  <>
                    <p>{date(selected.starts_at)}</p>
                    {propertySelect()}
                  </>
                )}
                {form === "field" && (
                  <>
                    <p>{selected.title}</p>
                    <label>
                      Entry type
                      <select name="kind">
                        <option value="note">Note</option>
                        <option value="issue">Property issue</option>
                        <option value="time">Time event</option>
                        <option value="checklist">Checklist</option>
                        <option value="complete">Completion submission</option>
                      </select>
                    </label>
                    <label>
                      Time action (time events)
                      <select name="action">
                        <option value="">Not a time event</option>
                        <option value="start">Start</option>
                        <option value="stop">Stop</option>
                        <option value="travel">Travel</option>
                        <option value="break">Break</option>
                      </select>
                    </label>
                    <label>
                      Notes
                      <textarea name="text" required />
                    </label>
                    {selected.checklist?.map((item: any, index: number) => (
                      <label key={index} className="check-item">
                        <input
                          type="checkbox"
                          name={"check-" + index}
                          defaultChecked={item.done}
                        />
                        {item.label}
                      </label>
                    ))}
                    <p className="muted">
                      Saved locally first. Completion requires office review
                      after synchronization.
                    </p>
                  </>
                )}
                <button className="primary" type="submit">
                  {form === "field" ? "Save on this device" : "Save"}{" "}
                  <CheckCircle2 size={17} />
                </button>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <Leaf size={28} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function PropertyCards({
  properties,
  onOpen,
}: {
  properties: any[];
  onOpen: (p: any) => void;
}) {
  return properties.length ? (
    <div className="property-grid">
      {properties.map((p) => (
        <button className="property-card" key={p.id} onClick={() => onOpen(p)}>
          <div className="property-art">
            <MapPin size={26} />
            <span>{p.acreage ? `${p.acreage} ACRES` : "PROPERTY RECORD"}</span>
          </div>
          <div className="property-info">
            <h3>
              {p.name} <ArrowUpRight size={18} />
            </h3>
            <p>{p.address}</p>
            <small>View property history</small>
          </div>
        </button>
      ))}
    </div>
  ) : (
    <Empty
      title="Every property has a story"
      text="Add your first property to start connecting schedules, service records, and client communication."
    />
  );
}
function Table({
  rows,
  columns,
  empty,
}: {
  rows: any[];
  columns: string[];
  empty: string;
}) {
  return rows.length ? (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{c.replaceAll("_", " ")}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || i}>
              {columns.map((c) => (
                <td key={c}>{String(r[c] ?? "—")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <p className="empty">{empty}</p>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
if ("serviceWorker" in navigator && import.meta.env.PROD)
  void navigator.serviceWorker.register("/sw.js");
