import { WorkReadiness } from "./WorkReadiness";
import { OwnerMfaRecovery } from "./OwnerMfaRecovery";
import { CommercialInbox } from "./CommercialInbox";
import { PropertyFiles } from "./PropertyFiles";
import { ScheduleCalendar } from "./ScheduleCalendar";
import { AssessmentAvailability } from "./AssessmentAvailability";
import { ClientContacts } from "./ClientContacts";
import { ClientWorkspace, PropertyWorkspace } from "./AccountWorkspace";
import { motifForPage } from "./motifs";
import { InspectionReports } from "./InspectionReports";
import React, { useEffect, useRef, useState } from "react";
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
  LogOut,
  Download,
  RefreshCw,
  Plus,
  ArrowUpRight,
  Leaf,
  Menu,
  MessageSquare,
  CheckCircle2,
  ShieldCheck,
  Plug,
  SlidersHorizontal,
  ChevronDown,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  getMyWorkOrders,
  listAccountMfaPolicies,
  syncFieldEvents,
  updateAccountMfaPolicy,
} from "@workspace/api-client-react/dashboard";
import * as offline from "./offline";
import "./style.css";
import { ServiceAgreements } from "./ServiceAgreements";
import {
  canAccessRoute,
  DASHBOARD_PAGES,
  defaultRouteForRole,
  NAVIGATION_GROUPS,
  pathForRoute,
  routeFromPath,
  type DashboardPageRoute,
  type DashboardRoute,
  type NavigationGroup,
  type RecordRoute,
  type SettingsSection,
} from "./dashboard-routes";
const auth = createAuthClient({ plugins: [twoFactorClient()] });
async function api(path: string, body?: unknown, method: "POST" | "PATCH" = "POST") {
  const r = await fetch("/api/v1" + path, {
    method: body === undefined ? "GET" : method,
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
  mfaRequired?: boolean;
};
type NavItem = DashboardPageRoute & {
  icon: typeof LayoutDashboard;
};
const icons: Record<DashboardPageRoute["view"] | "Settings:security" | "Settings:integrations" | "Settings:preferences", typeof LayoutDashboard> = {
  Overview: LayoutDashboard,
  Properties: MapPin,
  Clients: Users,
  Schedule: CalendarDays,
  "My Day": ClipboardList,
  Sales: FileText,
  Agreements: FileText,
  Billing: Wallet,
  Requests: MessageSquare,
  Recurring: RefreshCw,
  Projects: ClipboardList,
  Inspections: CheckCircle2,
  Expenses: Wallet,
  Settings: Users,
  "Settings:security": ShieldCheck,
  "Settings:integrations": Plug,
  "Settings:preferences": SlidersHorizontal,
};
const nav: NavItem[] = DASHBOARD_PAGES.map((page) => ({
  ...page,
  icon:
    page.settingsSection && page.settingsSection !== "people"
      ? icons[`Settings:${page.settingsSection}` as keyof typeof icons]
      : icons[page.view],
}));
function routeFromLocation() {
  return routeFromPath(location.pathname);
}
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
  const initialRoute = routeFromLocation();
  const initialPage =
    initialRoute.kind === "page" ? initialRoute.page : defaultRouteForRole(null).page;
  const focusedWorkId = useRef<string | null>(null);
  const recordOpenAttempted = useRef<string | null>(null);
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
    [view, setViewState] = useState(initialPage.view),
    [settingsSection, setSettingsSection] = useState<SettingsSection>(
      initialPage.settingsSection || "people",
    ),
    [recordRoute, setRecordRoute] = useState<RecordRoute | undefined>(
      initialRoute.kind === "page" ? initialRoute.record : undefined,
    ),
    [routeMissing, setRouteMissing] = useState(initialRoute.kind === "not-found"),
    [data, setData] = useState<any>({}),
    [form, setForm] = useState<string | null>(null),
    [selected, setSelected] = useState<any>(null),
    [isOnline, setOnline] = useState(navigator.onLine),
    [count, setCount] = useState(0),
    [menu, setMenu] = useState(false);
  const [authMode, setAuthMode] = useState("login"),
    [mfa, setMfa] = useState<any>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  useEffect(() => setPasswordVisible(false), [authMode]);
  const applyRoute = (
    route: Extract<DashboardRoute, { kind: "page" }>,
    historyMode: "push" | "replace" | "none" = "push",
  ) => {
    setRouteMissing(false);
    setViewState(route.page.view);
    setSettingsSection(route.page.settingsSection || "people");
    setRecordRoute(route.record);
    const path = pathForRoute(route);
    if (historyMode === "push" && location.pathname !== path) {
      history.pushState(route.record ? { p1DashboardRecord: true } : null, "", path);
    }
    if (historyMode === "replace" && location.pathname !== path) {
      history.replaceState(null, "", path);
    }
  };
  const navigate = (nextView: DashboardPageRoute["view"], section?: SettingsSection) => {
    const destination = nav.find(
      (item) =>
        item.view === nextView &&
        (nextView !== "Settings" || item.settingsSection === (section || "people")),
    );
    if (!destination) return;
    applyRoute({ kind: "page", page: destination });
  };
  const setView = (nextView: DashboardPageRoute["view"]) => navigate(nextView);
  const navigateRecord = (page: DashboardPageRoute, record: RecordRoute) => {
    applyRoute({ kind: "page", page, record });
  };
  async function session() {
    try {
      const [b, p] = await Promise.all([
        api("/setup"),
        api("/me").catch(() => null),
      ]);
      setBoot(b);
      setPerson(p);
      if (p) {
        const federation = new URLSearchParams(location.search).get(
          "federation",
        );
        if (federation === "1" && !p.mfaRequired) {
          const response = await fetch("/api/v1/federation/resume", {
            method: "POST",
          });
          const continuation = await response.json();
          if (!response.ok)
            throw new Error(continuation.error || "Unable to continue sign-in");
          location.assign(continuation.redirect);
          return;
        }
        localStorage.setItem(
          "p1-last-account",
          JSON.stringify({ id: p.id, name: p.name, role: p.role }),
        );
      }
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
  useEffect(() => {
    const onPopState = () => {
      const next = routeFromLocation();
      if (next.kind === "not-found") {
        setRouteMissing(true);
        setRecordRoute(undefined);
      } else {
        applyRoute(next, "none");
      }
      setMenu(false);
      setForm(null);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  async function refresh() {
    if (!person?.role || person.mfaRequired) return;
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
                "inspections",
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
                ...(person.role === "owner" ? ["account-mfa-policies"] : []),
                "leads",
                "assessment-slots",
                ...(["owner", "manager", "dispatch"].includes(person.role)
                  ? ["recurring-services", "recurring-jobs", "projects", "inspections"]
                  : []),
                ...(["owner", "manager", "sales"].includes(person.role)
                  ? ["agreement-templates"]
                  : []),
              ];
      const values = await Promise.all(
        [...new Set(paths)].map(async (p) => [
          p,
          p === "work-orders"
            ? await getMyWorkOrders()
            : p === "account-mfa-policies"
              ? await listAccountMfaPolicies()
              : await api("/" + p),
        ]),
      );
      const d = Object.fromEntries(values);
      let work = d["work-orders"] || [];
      if (focusedWorkId.current) {
        try {
          const detail = await api("/work-orders/" + focusedWorkId.current);
          work = [detail, ...work.filter((w: any) => w.id !== detail.id)];
        } catch {
          focusedWorkId.current = null;
          setNotice(
            "Selected work could not be refreshed. Open it again to retry.",
          );
        }
      }
      setData({ ...d, work });
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
    focusedWorkId.current = null;
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
        closeForm();
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
      if (form === "project") await api("/projects", { ...b, propertyIds: formData.getAll("propertyIds").map(String) });
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
          address: b.address,
          phone: b.phone,
          primaryContact: {
            firstName: b.primaryFirstName,
            lastName: b.primaryLastName,
            email: b.primaryEmail,
            position: b.primaryPosition,
            phone: b.primaryPhone,
          },
        });
      if (form === "edit-client")
        await api("/clients/" + selected.id, {
          name: b.name,
          address: b.address,
          phone: b.phone,
          email: selected.email || null,
          version: Number(selected.version),
          primaryContact: {
            firstName: b.primaryFirstName,
            lastName: b.primaryLastName,
            email: b.primaryEmail,
            position: b.primaryPosition,
            phone: b.primaryPhone,
          },
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
        await api("/jobs/internal", {
          propertyId: b.propertyId,
          title: b.title,
          scope: b.scope,
          reason: b.reason,
          assignedTo: b.assignedTo || undefined,
          scheduledAt: b.scheduledAt
            ? new Date(b.scheduledAt).toISOString()
            : undefined,
        });
      if (form === "lead") await api("/leads", b);
      if (["estimate", "estimate-request"].includes(form || "")) {
        const lineItems = String(b.lineItems || "")
          .split("\n")
          .filter(Boolean)
          .map((line) => {
            const [description, quantity, price, unit] = line.split("|").map((part) => part.trim());
            return { description, quantity: Number(quantity), unitPriceCents: Math.round(Number(price) * 100), unit: unit || undefined };
          });
        if (!lineItems.length || lineItems.some((item) => !item.description || !item.quantity || item.unitPriceCents < 0))
          throw new Error("Enter each line as description | quantity | unit price | optional unit");
        const monthlyPeriods = () => {
          const result: any[] = [];
          if (!b.startsOn || !b.endsOn || !b.monthlyAmount) return result;
          let start = b.startsOn;
          while (start <= b.endsOn && result.length < 120) {
            const day = new Date(start + "T00:00:00Z");
            const monthEnd = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
            result.push({ startsOn: start, endsOn: monthEnd < b.endsOn ? monthEnd : b.endsOn, amountCents: Math.round(Number(b.monthlyAmount) * 100) });
            start = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
          }
          return result;
        };
        const recurring = b.kind === "recurring" ? {
          cadence: b.cadence,
          intervalCount: Number(b.intervalCount),
          startsOn: b.startsOn,
          endsOn: b.endsOn,
          localTime: b.localTime || "08:00",
          billingMode: b.billingMode,
          unitAmountCents: b.billingMode === "per_visit" ? Math.round(Number(b.unitAmount) * 100) : null,
          periods: b.billingMode === "fixed_monthly" ? monthlyPeriods() : [],
        } : undefined;
        await api(form === "estimate-request" ? "/requests/" + selected.id + "/estimates" : "/estimates", { propertyId: b.propertyId, title: b.title, scope: b.scope, terms: b.terms || "", kind: b.kind, projectId: b.projectId || undefined, lineItems, recurring, agreementTemplateId: b.kind === "recurring" ? b.agreementTemplateId : undefined });
      }
      if (form === "send-estimate")
        await api("/estimates/" + selected.id + "/send", {
          recipientContactIds: formData.getAll("recipientContactIds").map(String),
        });
      if (form === "activate-recurring")
        await api("/recurring-jobs/" + selected.id + "/activate", {
          assignedTo: b.assignedTo,
          nextDate: b.nextDate,
          localTime: b.localTime,
        });
      if (form === "agreement-template")
        await api("/agreement-templates", { name: b.name, body: b.body });
      if (form === "billing")
        await api("/billing", {
          ...b,
          operationId: billingOperationId,
          amountCents: Math.round(Number(b.amount) * 100),
        });
      if (form === "request") await api("/requests", { ...b, source: person?.role === "client" ? "portal" : "manual" });
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
  const passwordField = (label: string) => (
    <label>
      {label}
      <span className="password-field">
        <input
          name="password"
          type={passwordVisible ? "text" : "password"}
          autoComplete={
            authMode === "signup" || authMode === "new-password"
              ? "new-password"
              : "current-password"
          }
          required
        />
        <button
          type="button"
          className="password-toggle"
          aria-label={passwordVisible ? "Hide password" : "Show password"}
          aria-pressed={passwordVisible}
          onClick={() => setPasswordVisible((visible) => !visible)}
        >
          {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
    </label>
  );
  const propertySelect = () => (
    <label>
      Property
      <select name="propertyId" required defaultValue={form === "estimate-request" ? selected?.property_id : undefined}>
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
    if (name === "send-estimate" && row)
      void api("/estimates/" + row.id + "/recipient-options")
        .then((recipients) => setData((current: any) => ({ ...current, estimateRecipients: recipients })))
        .catch((reason) => setError(reason.message));
  };
  const propertyPage = nav.find((item) => item.view === "Properties")!;
  const schedulePage = nav.find((item) => item.view === "Schedule")!;
  const myDayPage = nav.find((item) => item.view === "My Day")!;
  const agreementPage = nav.find((item) => item.view === "Agreements")!;
  const openPropertyWorkspace = (property: { id: string }) =>
    navigateRecord(propertyPage, { kind: "property", id: property.id, tab: "overview" });
  const clientPage = nav.find((item) => item.view === "Clients")!;
  const openClientWorkspace = (client: { id: string }) =>
    navigateRecord(clientPage, { kind: "client", id: client.id, tab: "overview" });
  const openWorkOrder = async (
    id: string,
    page = view === "My Day" ? myDayPage : schedulePage,
    updateRoute = true,
  ) => {
    await run(async () => {
      const detail = await api("/work-orders/" + id);
      focusedWorkId.current = id;
      setData((old: any) => ({
        ...old,
        work: [detail, ...(old.work || []).filter((w: any) => w.id !== id)],
      }));
      if (updateRoute) {
        navigateRecord(page, { kind: "work-order", id });
      }
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const target = document.getElementById("work-" + id);
          target?.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
              ? "auto"
              : "smooth",
            block: "center",
          });
          target?.focus({ preventScroll: true });
        }),
      );
    });
  };
  const closeForm = () => {
    if (form === "timeline" && recordRoute?.kind === "property") {
      if (history.state?.p1DashboardRecord) {
        history.back();
      } else {
        applyRoute({ kind: "page", page: propertyPage }, "replace");
        setForm(null);
      }
      return;
    }
    setForm(null);
  };
  const staff = Boolean(
      person && person.role !== "client" && person.role !== "crew",
    ),
    manager = ["owner", "manager"].includes(person?.role || ""),
    ops = ["owner", "manager", "dispatch"].includes(person?.role || "");
  const allowedNav = nav.filter((item) =>
    canAccessRoute({ kind: "page", page: item }, person?.role),
  );
  const activePage = nav.find(
    (item) =>
      item.view === view &&
      (item.view !== "Settings" || item.settingsSection === settingsSection),
  );
  const locationRoute = routeFromLocation();
  const routeForbidden =
    Boolean(person?.role) &&
    locationRoute.kind === "page" &&
    !canAccessRoute(locationRoute, person?.role);
  const routeUnavailable = routeMissing || routeForbidden;
  const [expandedGroups, setExpandedGroups] = useState<Set<NavigationGroup>>(
    () => new Set(["Workspace"]),
  );
  useEffect(() => {
    if (!routeUnavailable && activePage) {
      setExpandedGroups((current) =>
        current.has(activePage.group)
          ? current
          : new Set([...current, activePage.group]),
      );
    }
  }, [activePage, routeUnavailable]);
  useEffect(() => {
    const current = routeFromLocation();
    if (
      person?.role &&
      current.kind === "page" &&
      !canAccessRoute(current, person.role)
    ) {
      applyRoute(defaultRouteForRole(person.role), "replace");
      setNotice("That area is not available for this workspace role.");
    }
  }, [person?.role, view, settingsSection, recordRoute?.id]);
  const activeNav = (item: NavItem) =>
    !routeUnavailable &&
    view === item.view &&
    (item.view !== "Settings" || settingsSection === item.settingsSection);
  const accountWorkspace =
    recordRoute?.kind === "client" || recordRoute?.kind === "property";
  useEffect(() => {
    if (!recordRoute) {
      recordOpenAttempted.current = null;
      return;
    }
    const key = `${recordRoute.kind}:${recordRoute.id}`;
    if (recordOpenAttempted.current === key) return;
    if (recordRoute.kind === "work-order") {
      recordOpenAttempted.current = key;
      void openWorkOrder(
        recordRoute.id,
        view === "My Day" ? myDayPage : schedulePage,
        false,
      );
    }
  }, [recordRoute?.kind, recordRoute?.id, view]);
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
              passwordField(
                authMode === "signup"
                  ? "Choose a password (at least 12 characters)"
                  : "Password",
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
  if (person.mfaRequired)
    return <OwnerMfaRecovery key={person.id} email={person.email} enabled={person.twoFactorEnabled} actions={auth.twoFactor} onComplete={session} onSignOut={logout} />;
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
              <button className="primary">Activate owner account</button>
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
        <nav aria-label="Dashboard navigation">
          {NAVIGATION_GROUPS.map((group) => {
            const entries = allowedNav.filter((item) => item.group === group);
            if (!entries.length) return null;
            const expanded = expandedGroups.has(group);
            const groupId = `nav-group-${group.toLowerCase()}`;
            return (
              <section className="nav-group" key={group} aria-label={group}>
                <button
                  className="nav-group-trigger"
                  aria-expanded={expanded}
                  aria-controls={groupId}
                  onClick={() =>
                    setExpandedGroups((current) => {
                      const next = new Set(current);
                      if (next.has(group)) next.delete(group);
                      else next.add(group);
                      return next;
                    })
                  }
                >
                  <span>{group}</span>
                  <ChevronDown size={15} aria-hidden="true" />
                </button>
                <div id={groupId} className="nav-group-items" hidden={!expanded}>
                  {entries.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.path}
                        className={activeNav(item) ? "active" : ""}
                        aria-current={activeNav(item) ? "page" : undefined}
                        onClick={() => {
                          navigate(item.view, item.settingsSection);
                          setMenu(false);
                        }}
                      >
                        <Icon size={19} />
                        {item.label}
                        {item.view === "Requests" && data.requests?.length > 0 && (
                          <b>{data.requests.length}</b>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
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
            Workspace <span>/</span>{" "}
            <strong>
              {view === "Settings"
                ? nav.find((item) => item.settingsSection === settingsSection)?.label
                : view}
            </strong>
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
        <main className={view === "Overview" ? "content desk-workspace-preview" : "content"}>
          {!accountWorkspace && <div className="page-heading page-hero" style={{ "--page-motif": motifForPage(view, settingsSection) } as React.CSSProperties}>
            <div>
              <p className="eyebrow">P1 · PROPERTY OPERATIONS</p>
              <h1>
                {routeUnavailable
                  ? "Page unavailable"
                  : view === "Overview"
                  ? "A clear view of the day."
                  : view === "Settings"
                    ? nav.find((item) => item.settingsSection === settingsSection)?.label
                    : view}
              </h1>
              <p className="muted">
                {routeUnavailable
                  ? "This link does not match an available dashboard destination."
                  : view === "Overview"
                  ? "Your properties, people, and next priorities."
                  : view === "My Day"
                    ? "Your assignments and field notes, wherever work takes you."
                    : view === "Settings"
                      ? "Control access, account security, connections and workspace defaults."
                      : "Keep the details connected to the work."}
              </p>
            </div>
            {!routeUnavailable && <div className="heading-actions">
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
                  <Plus size={17} /> Internal or emergency Job
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
            </div>}
          </div>}
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
          {recordRoute?.kind === "client" ? (
            <ClientWorkspace
              id={recordRoute.id}
              tab={recordRoute.tab}
              request={api}
              onTab={(tab) =>
                navigateRecord(clientPage, { kind: "client", id: recordRoute.id, tab })
              }
              onProperty={(id) =>
                navigateRecord(propertyPage, { kind: "property", id, tab: "overview" })
              }
            />
          ) : recordRoute?.kind === "property" ? (
            <PropertyWorkspace
              id={recordRoute.id}
              tab={recordRoute.tab}
              request={api}
              canOpenClient={staff}
              role={person.role}
              onTab={(tab) =>
                navigateRecord(propertyPage, { kind: "property", id: recordRoute.id, tab })
              }
              onClient={(id) =>
                navigateRecord(clientPage, { kind: "client", id, tab: "overview" })
              }
            />
          ) : routeUnavailable ? (
            <section className="panel route-unavailable" aria-labelledby="route-unavailable-title">
              <div className="panel-heading">
                <h2 id="route-unavailable-title">This dashboard link is unavailable</h2>
              </div>
              <div className="panel-body">
                <p className="muted">
                  {routeForbidden
                    ? "This area is not available for your workspace role. Your account permissions and data have not changed."
                    : "Check the link or return to your workspace. Your account permissions and data have not changed."}
                </p>
                <button onClick={() => navigate(defaultRouteForRole(person.role).page.view)}>
                  Return to workspace
                </button>
              </div>
            </section>
          ) : <>
          {view === "Agreements" && (
            <>
              <ServiceAgreements
                role={person.role}
                userId={person.id}
                selectedAgreementId={
                  recordRoute?.kind === "agreement" ? recordRoute.id : undefined
                }
                onSelect={(id) =>
                  navigateRecord(agreementPage, { kind: "agreement", id })
                }
              />
              {manager && <section className="panel"><div className="panel-heading"><h2>Agreement templates</h2><button onClick={() => openForm("agreement-template")}><Plus size={16} /> New template</button></div><Table rows={data["agreement-templates"] || []} columns={["name", "version", "updated_at"]} empty="No reusable agreement templates yet." /></section>}
            </>
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
                    "Scheduled Jobs",
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
                        <button
                          className="quiet-action"
                          onClick={() => void openWorkOrder(w.id, schedulePage)}
                        >
                          Open Job
                        </button>
                      </div>
                    ))
                  ) : (
                    <Empty
                      title="A fresh start for your operations"
                      text="Add a client and property, then schedule your first Job."
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
                  onOpen={openPropertyWorkspace}
                />
              </section>
            </>
          )}
          {view === "Properties" && (
            <section className="panel">
              <PropertyCards
                properties={data.properties || []}
                onOpen={openPropertyWorkspace}
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
                      {[client.billing_address, client.phone]
                        .filter(Boolean)
                        .join(" · ")}
                    </small>
                    {client.primary_contact_name && (
                      <small>
                        {[
                          client.primary_contact_name,
                          client.primary_contact_position,
                          client.primary_contact_email,
                          client.primary_contact_phone,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </small>
                    )}
                  </div>
                  {staff && (
                    <div className="row-actions">
                      <button className="primary" onClick={() => openClientWorkspace(client)}>
                        Open account <ArrowUpRight size={15} />
                      </button>
                      <button onClick={() => openForm("edit-client", client)}>
                        Edit client
                      </button>
                      <button onClick={() => openForm("contacts", client)}>
                        Manage contacts
                      </button>
                    </div>
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
                  request={api}
                  onChanged={refresh}
                  work={data.work || []}
                  staff={data.staff || []}
                  canManage={ops}
                  onSelect={(id) => {
                    void openWorkOrder(id, schedulePage);
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
                        {ops && view === "Schedule" && <WorkReadiness key={w.id + ":" + w.version} work={{...w, prerequisites: w.prerequisites || []}} online={isOnline} onChanged={refresh} />}
                      </article>
                    ))
                ) : (
                  <Empty
                    title={
                      view === "My Day"
                        ? "No work scheduled for this date"
                        : "No Jobs yet"
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
              {["owner", "manager", "sales"].includes(person.role || "") && <CommercialInbox staff={data.staff || []} />}
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
                        onClick={() => openForm("send-estimate", e)}
                      >
                        Send to client
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
              <div className="panel-heading">
                <div>
                  <h2>Recurring Jobs</h2>
                  <p className="muted">Approved recurring work awaiting activation and active Job programs.</p>
                </div>
              </div>
              <Table
                rows={data["recurring-jobs"] || []}
                columns={[
                  "title",
                  "client_name",
                  "property_name",
                  "cadence",
                  "next_date",
                  "agreement_status",
                  "next_visit",
                  "paused",
                ]}
                empty="No recurring Jobs yet. Create one from an approved recurring estimate."
              />
              {(data["recurring-jobs"] || []).filter((job: any) => job.paused && job.agreement_status === "draft").map((job: any) => (
                <div className="schedule-row" key={"activate-" + job.id}>
                  <span><strong>{job.title}</strong><small>Client-approved; waiting for dispatch activation.</small></span>
                  <button onClick={() => openForm("activate-recurring", job)}>Schedule and activate</button>
                </div>
              ))}
            </section>
          )}
          {view === "Projects" && (
            <section className="panel">
              <p className="muted">Projects group related Jobs across participating clients. Client portals remain limited to their own Jobs and documents.</p>
              <Table
                rows={data.projects || []}
                columns={["name", "client_names", "property_names", "scope", "status"]}
                empty="No projects yet."
              />
            </section>
          )}
          {view === "Inspections" && (
            <InspectionReports
              inspections={data.inspections || []}
              canPublish={manager}
              onPublish={(id) =>
                void run(async () => {
                  await api("/inspections/" + id + "/publish", {});
                  await refresh();
                })
              }
            />
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
              {(data.requests || []).map((request: any) => (
                <div className="schedule-row" key={request.id}>
                  <div><strong>{request.property_name}</strong><small>{request.description}</small></div>
                  <span className="badge">{request.status.replaceAll("_", " ")}</span>
                  {["new", "estimating"].includes(request.status) && ["owner", "manager", "sales"].includes(person.role || "") && <button onClick={() => openForm("estimate-request", request)}>Generate estimate</button>}
                </div>
              ))}
              {!data.requests?.length && <p className="empty">No service requests. New requests will appear here.</p>}
            </section>
          )}
          {view === "Settings" && settingsSection === "security" && (
            <section className="panel">
              <div className="panel-heading">
                <h2>Two-factor authentication</h2>
                <span className="badge">
                  {person.twoFactorEnabled ? "Enabled" : "Not enabled"}
                </span>
              </div>
              <p className="muted">
                Protect this account with an authenticator app. It is optional
                unless a super admin requires it for your account.
              </p>
              {!person.twoFactorEnabled && !mfa && (
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
                        setNotice("Two-factor authentication is enabled.");
                      });
                    }}
                  >
                    {field("code", "Authenticator code")}
                    <button className="primary">Verify authenticator</button>
                  </form>
                </>
              )}
              {person.twoFactorEnabled && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const b = new FormData(e.currentTarget);
                    void run(async () => {
                      const r = await auth.twoFactor.disable({
                        password: String(b.get("password")),
                      });
                      if (r.error) throw new Error(r.error.message);
                      setMfa(null);
                      await session();
                      setNotice("Two-factor authentication is disabled.");
                    });
                  }}
                >
                  {field("password", "Current password", "password")}
                  <button>Disable authenticator</button>
                </form>
              )}
            </section>
          )}
          {view === "Settings" && settingsSection === "people" && (
              <section className="panel">
                <div className="panel-heading">
                  <h2>People & access</h2>
                  <button onClick={() => openForm("invite")}>
                    <Plus size={16} /> Invite a person
                  </button>
                </div>
                <Table
                  rows={data.staff || []}
                  columns={["name", "role", "mfaRequired"]}
                  empty="No staff records."
                />
                {person.role === "owner" &&
                  (data["account-mfa-policies"] || []).length > 0 && (
                  <div className="stacked-actions">
                    <h3>Two-factor requirements for every account</h3>
                    {(data["account-mfa-policies"] || []).map((member: any) => (
                      <div className="row-actions" key={member.id}>
                        <span>
                          {member.name} · {member.role} · {member.email} —{" "}
                          {member.mfaRequired ? "Required" : "Optional"}
                        </span>
                        <button
                          onClick={() =>
                            void run(async () => {
                              await updateAccountMfaPolicy(member.id, {
                                required: !member.mfaRequired,
                              });
                              // When an owner applies the requirement to their
                              // own unassured session, immediately re-read the
                              // policy so the enrollment gate replaces settings.
                              if (member.id === person.id) await session();
                              else await refresh();
                            })
                          }
                        >
                          Make {member.mfaRequired ? "optional" : "required"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
          )}
          {view === "Settings" && settingsSection === "integrations" && (
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
          )}
          {view === "Settings" && settingsSection === "preferences" && (
            <section className="panel settings-preferences">
              <div className="panel-heading">
                <h2>Workspace preferences</h2>
              </div>
              <div className="settings-summary">
                <div>
                  <small>Operating time zone</small>
                  <strong>America/New_York</strong>
                  <p>Schedules and availability use the P1 operating time zone.</p>
                </div>
                <div>
                  <small>Workspace role</small>
                  <strong>{person.role}</strong>
                  <p>Available navigation and actions reflect this role and current account assurance.</p>
                </div>
                <div>
                  <small>Connection</small>
                  <strong>{isOnline ? "Online" : "Offline workspace"}</strong>
                  <p>Offline field work synchronizes only after your identity and connection are verified.</p>
                </div>
              </div>
            </section>
          )}
          </>}
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
                  : form === "client"
                    ? "Add client"
                    : form === "edit-client"
                      ? "Edit client"
                  : form === "field"
                    ? "Record field work"
                    : form === "book"
                      ? "Book assessment"
                      : "Add " + form}
              </h2>
              <button onClick={closeForm} aria-label="Close dialog">
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
                <PropertyFiles
                  propertyId={selected.property.id}
                  canPublish={manager}
                  request={api}
                />
                {selected.timeline.length ? (
                  selected.timeline.map((e: any) => (
                    <div className="timeline-row" key={e.id}>
                      <span className="badge">
                        {e.kind}
                        {e.conflict ? " · needs review" : ""}
                      </span>
                      <p>
                        {e.kind === "inspection"
                          ? `${Array.isArray(e.payload.findings) ? e.payload.findings.length : 0} inspection observation${Array.isArray(e.payload.findings) && e.payload.findings.length === 1 ? "" : "s"}`
                          : e.payload.text || e.payload.action || "Work recorded"}
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
                    {field("name", "Project name")}
                    <label>
                      Participating properties
                      <select name="propertyIds" multiple required size={Math.min(8, Math.max(3, (data.properties || []).length))}>
                        {(data.properties || []).map((property: any) => <option key={property.id} value={property.id}>{property.name}</option>)}
                      </select>
                    </label>
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
                    {field("name", "Business name")}
                    {field("address", "Business address")}
                    {field("phone", "Business phone", "tel")}
                    <fieldset>
                      <legend>Primary contact</legend>
                      {field("primaryFirstName", "First name")}
                      {field("primaryLastName", "Last name")}
                      {field("primaryEmail", "Email", "email")}
                      {field("primaryPosition", "Position")}
                      {field("primaryPhone", "Phone", "tel")}
                    </fieldset>
                  </>
                )}
                {form === "edit-client" && (
                  <>
                    <label>
                      Business name
                      <input name="name" required defaultValue={selected.name} />
                    </label>
                    <label>
                      Business address
                      <input
                        name="address"
                        required
                        defaultValue={selected.billing_address || ""}
                      />
                    </label>
                    <label>
                      Business phone
                      <input
                        name="phone"
                        type="tel"
                        required
                        defaultValue={selected.phone || ""}
                      />
                    </label>
                    <fieldset>
                      <legend>Primary contact</legend>
                      <label>
                        First name
                        <input
                          name="primaryFirstName"
                          required
                          defaultValue={
                            selected.primary_contact_first_name ||
                            selected.primary_contact_name?.split(" ")[0] ||
                            ""
                          }
                        />
                      </label>
                      <label>
                        Last name
                        <input
                          name="primaryLastName"
                          required
                          defaultValue={
                            selected.primary_contact_last_name ||
                            selected.primary_contact_name
                              ?.split(" ")
                              .slice(1)
                              .join(" ") ||
                            ""
                          }
                        />
                      </label>
                      <label>
                        Email
                        <input
                          name="primaryEmail"
                          type="email"
                          required
                          defaultValue={selected.primary_contact_email || ""}
                        />
                      </label>
                      <label>
                        Position
                        <input
                          name="primaryPosition"
                          required
                          defaultValue={selected.primary_contact_position || ""}
                        />
                      </label>
                      <label>
                        Phone
                        <input
                          name="primaryPhone"
                          type="tel"
                          required
                          defaultValue={selected.primary_contact_phone || ""}
                        />
                      </label>
                    </fieldset>
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
                    {field("title", "Internal or emergency Job title")}
                    <label>
                      Scope
                      <textarea name="scope" />
                    </label>
                    <label>
                      Why is this Job exempt from estimate approval?
                      <textarea name="reason" required />
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
                {["estimate", "estimate-request"].includes(form || "") && (
                  <>
                    {propertySelect()}
                    {data.projects?.length > 0 && <label>Project (optional)<select name="projectId"><option value="">Not part of a Project</option>{(data.projects || []).map((project: any) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>}
                    {field("title", "Estimate title")}
                    <label>
                      Scope to approve
                      <textarea name="scope" required />
                    </label>
                    <label>
                      Line items — one per line: description | quantity | unit price | optional unit
                      <textarea name="lineItems" required placeholder="Mowing | 1 | 250.00 | visit" />
                    </label>
                    <label>
                      Client-facing terms
                      <textarea name="terms" />
                    </label>
                    <label>
                      Job type
                      <select name="kind">
                        <option value="one_time">One-time Job</option>
                        <option value="recurring">Recurring Job</option>
                      </select>
                    </label>
                    <fieldset>
                      <legend>Recurring Job details (required only for recurring estimates)</legend>
                      <label>Agreement template<select name="agreementTemplateId"><option value="">Choose a template</option>{(data["agreement-templates"] || []).map((template: any) => <option key={template.id} value={template.id}>{template.name} · v{template.version}</option>)}</select></label>
                      <label>Frequency<select name="cadence"><option value="weekly">Weeks</option><option value="monthly">Months</option></select></label>
                      {field("intervalCount", "Every X weeks/months", "number", false)}
                      {field("startsOn", "Agreement start", "date", false)}
                      {field("endsOn", "Agreement end", "date", false)}
                      {field("localTime", "Default Job time", "time", false)}
                      <label>Billing basis<select name="billingMode"><option value="per_visit">Per visit</option><option value="fixed_monthly">Fixed monthly</option></select></label>
                      {field("unitAmount", "Per-visit agreement rate (USD)", "number", false)}
                      {field("monthlyAmount", "Monthly agreement amount (USD)", "number", false)}
                    </fieldset>
                  </>
                )}
                {form === "send-estimate" && (
                  <>
                    <p>Send <strong>{selected.title}</strong> to one or more client contacts.</p>
                    <label>Recipients<select name="recipientContactIds" multiple required size={Math.min(6, Math.max(2, (data.estimateRecipients || []).length))}>{(data.estimateRecipients || []).map((contact: any) => <option key={contact.id} value={contact.id} disabled={!contact.email || !contact.email_enabled}>{contact.name} {contact.email ? `· ${contact.email}` : "· no email"}{!contact.email_enabled ? " · email disabled" : ""}</option>)}</select></label>
                  </>
                )}
                {form === "activate-recurring" && (
                  <>
                    <p>Activate <strong>{selected.title}</strong> after setting its first visit and default team member.</p>
                    <label>Default assigned person<select name="assignedTo" required><option value="">Choose a team member</option>{(data.staff || []).filter((staffMember: any) => staffMember.role !== "client").map((staffMember: any) => <option key={staffMember.id} value={staffMember.id}>{staffMember.name}</option>)}</select></label>
                    {field("nextDate", "First visit", "date")}
                    {field("localTime", "Default visit time", "time")}
                  </>
                )}
                {form === "agreement-template" && (
                  <>
                    {field("name", "Template name")}
                    <label>Agreement terms<textarea name="body" required /></label>
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
function EstimateApproval() {
  const token = decodeURIComponent(location.pathname.split("/").at(-1) || "");
  const [document, setDocument] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    void fetch("/api/public/estimates/" + encodeURIComponent(token))
      .then(async (response) => {
        const value = await response.json();
        if (!response.ok) throw new Error(value.error || "Estimate is unavailable");
        setDocument(value);
      })
      .catch((reason) => setError(reason.message));
  }, [token]);
  const decide = async (status: "approved" | "declined") => {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/public/estimates/" + encodeURIComponent(token) + "/decision", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error || "Unable to record your decision");
      setNotice(status === "approved" ? "Thank you. Your estimate has been approved and P1 will schedule the Job." : "Your decision has been recorded. P1 will follow up if needed.");
      setDocument(null);
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  };
  return <main className="auth-shell"><section className="auth-card estimate-approval"><img src="/p1-logo.png" alt="P1 Land Management" className="brand-logo" /><h1>Estimate review</h1>{error && <p className="error">{error}</p>}{notice && <p className="notice">{notice}</p>}{!document && !error && <p>Loading estimate…</p>}{document && <><p><strong>{document.title}</strong></p><p>{document.client_name} · {document.property_name}</p><p>{document.address}</p><p>{document.scope}</p><div className="table-wrap"><table><thead><tr><th>Description</th><th>Quantity</th><th>Rate</th></tr></thead><tbody>{document.line_items.map((item: any) => <tr key={item.position}><td>{item.description}</td><td>{item.quantity} {item.unit || ""}</td><td>{money(item.unit_price_cents)}</td></tr>)}</tbody></table></div><h2>{money(document.amount_cents)}</h2><p>Valid through {new Date(document.expires_at).toLocaleDateString("en-US")}</p>{document.terms && <p className="muted">{document.terms}</p>}<p><a href={`/api/public/estimates/${encodeURIComponent(token)}/pdf`}>Download PDF</a></p><div className="heading-actions"><button className="primary" disabled={busy} onClick={() => void decide("approved")}>Approve estimate</button><button disabled={busy} onClick={() => void decide("declined")}>Decline</button></div></>}</section></main>;
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
createRoot(document.getElementById("root")!).render(location.pathname.startsWith("/estimate-approval/") ? <EstimateApproval /> : <App />);
if ("serviceWorker" in navigator && import.meta.env.PROD)
  void navigator.serviceWorker.register("/sw.js");
