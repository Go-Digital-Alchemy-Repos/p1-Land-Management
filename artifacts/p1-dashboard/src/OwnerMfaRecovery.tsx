import { useState } from "react";
type Result<T = unknown> = {
  data?: T | null;
  error?: { message?: string } | null;
};
export type OwnerMfaActions = {
  enable: (input: {
    password: string;
    method: "totp";
  }) => Promise<
    Result<{ totpURI: string; backupCodes: string[] } | { method: "otp" }>
  >;
  verifyTotp: (input: { code: string }) => Promise<Result>;
  verifyBackupCode: (input: { code: string }) => Promise<Result>;
};
export function OwnerMfaRecovery({
  email,
  enabled,
  actions,
  onComplete,
  onSignOut,
  accountLabel = "account",
}: {
  email: string;
  enabled: boolean;
  actions: OwnerMfaActions;
  onComplete: () => Promise<void>;
  onSignOut: () => Promise<void>;
  accountLabel?: string;
}) {
  const [enrollment, setEnrollment] = useState<{
    totpURI: string;
    backupCodes: string[];
  } | null>(null);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [recovery, setRecovery] = useState(false);
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="activation">
      <div className="brand">
        <img src="/icon.svg" alt="P1" width="48" height="36" /> ACCOUNT SECURITY
      </div>
      <h1>
        {enabled ? "Verify your authenticator." : `Secure your ${accountLabel}.`}
      </h1>
      <p>
        Signed in as {email}. This account requires a verified authenticator for
        this session.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!enabled && !enrollment && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const password = String(new FormData(form).get("password"));
            void run(async () => {
              const result = await actions.enable({ password, method: "totp" });
              if (result.error)
                throw new Error(
                  result.error.message || "Authenticator setup failed",
                );
              if (!result.data || !("totpURI" in result.data))
                throw new Error(
                  "Authenticator setup did not return enrollment details",
                );
              setEnrollment(result.data);
              form.reset();
            });
          }}
        >
          <label>
            Current password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={busy}
            />
          </label>
          <button className="primary" disabled={busy}>
            Set up authenticator
          </button>
        </form>
      )}
      {enrollment && (
        <section aria-label="Authenticator enrollment">
          <p>Add this secret to your authenticator app:</p>
          <code className="secret">
            {new URL(enrollment.totpURI).searchParams.get("secret")}
          </code>
          <p>Save these recovery codes privately before continuing:</p>
          <pre className="secret">{enrollment.backupCodes.join("\n")}</pre>
        </section>
      )}
      {(enabled || enrollment) && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const code = String(new FormData(e.currentTarget).get("code"));
            void run(async () => {
              const result = await (recovery
                ? actions.verifyBackupCode({ code })
                : actions.verifyTotp({ code }));
              if (result.error)
                throw new Error(result.error.message || "Verification failed");
              await onComplete();
            });
          }}
        >
          <label>
            {recovery ? "Recovery code" : "Authenticator code"}
            <input
              name="code"
              autoComplete="one-time-code"
              inputMode={recovery ? "text" : "numeric"}
              required
              disabled={busy}
            />
          </label>
          <button className="primary" disabled={busy}>
            Verify and open dashboard
          </button>
          {enabled && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setRecovery(!recovery)}
            >
              {recovery ? "Use authenticator" : "Use a recovery code"}
            </button>
          )}
        </form>
      )}
      <button
        className="text-button"
        disabled={busy}
        onClick={() => void run(onSignOut)}
      >
        Sign out
      </button>
    </main>
  );
}
