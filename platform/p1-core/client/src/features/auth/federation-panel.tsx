import { PageLayout } from "@/components/layout/page-layout";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
export function useFederationStatus() {
  return useQuery<{ enabled: boolean }>({
    queryKey: ["/api/auth/federation/status"],
    staleTime: 0,
  });
}
export function FederationPanel({ setup = false }: { setup?: boolean }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const setupStatus = useQuery<{ needsSetup: boolean }>({
    queryKey: ["/api/setup/status"],
    enabled: setup,
  });
  const confirming = new URLSearchParams(window.location.search).get("federation") === "confirm";
  const detail = useQuery<{ localEmail: string; canonicalEmail: string }>({
    queryKey: ["/api/auth/federation/confirmation"],
    enabled: confirming,
    retry: false,
  });
  async function submit(path: string, body: unknown, form?: HTMLFormElement) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await apiRequest("POST", "/api/auth/federation/" + path, body);
      const result = await response.json();
      form?.reset();
      if (result.continuePath !== "/admin" && result.continuePath !== "/api/auth/federation/start")
        throw Error("Invalid sign-in continuation");
      window.location.assign(result.continuePath);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in unavailable");
      setBusy(false);
    }
  }
  if (setup && (!setupStatus.data || !setupStatus.data.needsSetup))
    return (
      <PageLayout>
        <section className="container max-w-lg py-12">
          <p>
            {setupStatus.isLoading
              ? "Checking setup availability…"
              : "Fresh administrator setup is unavailable."}
          </p>
          <a href="/admin/login">Return to sign-in</a>
        </section>
      </PageLayout>
    );
  return (
    <PageLayout>
      <section className="container max-w-lg py-12">
        <img src="/admin/p1-symbol.svg" alt="P1" width="64" height="64" />
        <h1 className="text-3xl font-bold my-4">
          {setup
            ? "Connect the first CMS administrator"
            : confirming
              ? "Confirm your account link"
              : "Sign in to P1 CMS"}
        </h1>
        {error && <p role="alert">{error}</p>}
        {confirming ? (
          <section>
            <p>
              Linking preserves the CMS account’s existing permissions. Matching email addresses
              alone do not grant access.
            </p>
            {detail.error && (
              <p role="alert">Link confirmation expired or unavailable. Start again.</p>
            )}
            {detail.data && (
              <>
                <p>CMS account: {detail.data.localEmail}</p>
                <p>Dashboard identity: {detail.data.canonicalEmail}</p>
                <button disabled={busy} onClick={() => void submit("confirm", { confirm: true })}>
                  Confirm this account link
                </button>
              </>
            )}
            <a href="/admin/login">Cancel and return to sign-in</a>
          </section>
        ) : setup ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              void submit(
                "bootstrap-intent",
                { proof: String(new FormData(form).get("proof")) },
                form,
              );
            }}
          >
            <p>
              Use the one-time deployment proof supplied for this setup window, then verify your P1
              Dashboard owner account. No new password is created here.
            </p>
            <label className="block">
              One-time setup proof
              <input
                className="block border p-2 w-full"
                name="proof"
                type="password"
                autoComplete="off"
                required
                disabled={busy}
              />
            </label>
            <button disabled={busy}>Continue with Dashboard owner</button>
          </form>
        ) : (
          <>
            <a href="/api/auth/federation/start" className="block my-6 underline">
              Sign in with P1 Dashboard
            </a>
            <details>
              <summary>Link an existing CMS account</summary>
              <p>
                Prove your existing CMS credentials, then confirm the Dashboard identity to link.
                This step does not open CMS access by itself.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget,
                    data = new FormData(form);
                  void submit(
                    "link-intent",
                    { email: String(data.get("email")), password: String(data.get("password")) },
                    form,
                  );
                }}
              >
                <label className="block">
                  Existing CMS email
                  <input
                    className="block border p-2 w-full"
                    name="email"
                    type="email"
                    autoComplete="username"
                    required
                    disabled={busy}
                  />
                </label>
                <label className="block">
                  Existing CMS password
                  <input
                    className="block border p-2 w-full"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    disabled={busy}
                  />
                </label>
                <button disabled={busy}>Prove existing account and continue</button>
              </form>
            </details>
          </>
        )}
      </section>
    </PageLayout>
  );
}
