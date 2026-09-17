import QRCode from "qrcode";
import {
  Camera,
  CheckCircle2,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Result<T = unknown> = {
  data?: T | null;
  error?: { message?: string } | null;
};
type Enrollment = { totpURI: string; backupCodes: string[] };
type EnableResult = Enrollment | { method: "otp" };

export type AccountProfileActions = {
  updateUser: (input: { name: string }) => Promise<Result>;
  changePassword: (input: {
    currentPassword: string;
    newPassword: string;
    revokeOtherSessions: boolean;
  }) => Promise<Result>;
  enableTwoFactor: (input: {
    password: string;
    method: "totp";
  }) => Promise<Result<EnableResult>>;
  verifyTotp: (input: { code: string }) => Promise<Result>;
  disableTwoFactor: (input: { password: string }) => Promise<Result>;
};

export function AccountProfile({
  account,
  actions,
  onRefresh,
}: {
  account: {
    name: string;
    email: string;
    role: string | null;
    avatarUrl?: string | null;
    twoFactorEnabled: boolean;
  };
  actions: AccountProfileActions;
  onRefresh: () => Promise<void>;
}) {
  const [avatarUrl, setAvatarUrl] = useState(account.avatarUrl || "");
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [qrCode, setQrCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => setAvatarUrl(account.avatarUrl || ""), [account.avatarUrl]);
  useEffect(() => {
    let active = true;
    if (!enrollment) {
      setQrCode("");
      return;
    }
    void QRCode.toDataURL(enrollment.totpURI, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 224,
      color: { dark: "#173d31", light: "#f8f7f2" },
    })
      .then((url) => active && setQrCode(url))
      .catch(
        () =>
          active &&
          setError("Unable to create the QR code. Use the setup key below."),
      );
    return () => {
      active = false;
    };
  }, [enrollment]);

  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function uploadAvatar(file: File | undefined) {
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError("Choose a JPEG, PNG, or WebP image under 5 MiB.");
      return;
    }
    await run(async () => {
      const response = await fetch("/api/v1/profile/avatar", {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Unable to upload avatar");
      await onRefresh();
      setAvatarUrl(result.avatarUrl);
      setNotice("Profile photo updated.");
    });
  }

  return (
    <div className="account-profile">
      {(error || notice) && (
        <p
          className={error ? "error" : "notice"}
          role={error ? "alert" : "status"}
        >
          {error || notice}
        </p>
      )}
      <section
        className="profile-identity data-surface"
        aria-labelledby="profile-identity-title"
      >
        <div className="profile-avatar-wrap">
          {avatarUrl ? (
            <img
              className="profile-avatar"
              src={avatarUrl}
              alt="Your profile"
            />
          ) : (
            <span
              className="profile-avatar profile-avatar-fallback"
              aria-hidden="true"
            >
              {account.name.slice(0, 1)}
            </span>
          )}
          <button
            type="button"
            className="avatar-change"
            onClick={() => input.current?.click()}
            disabled={busy}
          >
            <Camera size={15} aria-hidden="true" /> Change photo
          </button>
          <input
            ref={input}
            className="visually-hidden"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              void uploadAvatar(event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
        </div>
        <div>
          <p className="eyebrow">ACCOUNT PROFILE</p>
          <h2 id="profile-identity-title">{account.name}</h2>
          <p className="muted">
            {account.email} · {account.role || "Member"}
          </p>
        </div>
        <label
          className="avatar-dropzone"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void uploadAvatar(event.dataTransfer.files[0]);
          }}
        >
          <Upload size={18} aria-hidden="true" />
          <span>Drop a photo here or browse</span>
          <small>JPEG, PNG, or WebP · 5 MiB maximum</small>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              void uploadAvatar(event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </section>

      <div className="profile-grid">
        <section className="panel" aria-labelledby="profile-details-title">
          <div className="panel-heading">
            <div>
              <h2 id="profile-details-title">Profile details</h2>
              <p>Keep the name your team sees up to date.</p>
            </div>
          </div>
          <form
            className="profile-form"
            onSubmit={(event) => {
              event.preventDefault();
              const name = String(
                new FormData(event.currentTarget).get("name") || "",
              ).trim();
              void run(async () => {
                if (!name) throw new Error("Enter your name.");
                const result = await actions.updateUser({ name });
                if (result.error)
                  throw new Error(
                    result.error.message || "Unable to update profile",
                  );
                await onRefresh();
                setNotice("Profile details saved.");
              });
            }}
          >
            <label>
              Display name
              <input
                name="name"
                defaultValue={account.name}
                autoComplete="name"
                required
                disabled={busy}
              />
            </label>
            <label>
              Email address
              <input value={account.email} readOnly aria-readonly="true" />
            </label>
            <p className="form-help">
              Email changes require verification. Contact your workspace
              administrator for help.
            </p>
            <button className="primary" disabled={busy}>
              Save profile
            </button>
          </form>
        </section>

        <section className="panel" aria-labelledby="profile-password-title">
          <div className="panel-heading">
            <div>
              <h2 id="profile-password-title">
                <KeyRound size={18} aria-hidden="true" /> Password
              </h2>
              <p>Use a unique password with at least 12 characters.</p>
            </div>
          </div>
          <form
            className="profile-form"
            onSubmit={(event) => {
              event.preventDefault();
              const values = new FormData(event.currentTarget);
              const currentPassword = String(
                values.get("currentPassword") || "",
              );
              const newPassword = String(values.get("newPassword") || "");
              const confirmPassword = String(
                values.get("confirmPassword") || "",
              );
              void run(async () => {
                if (newPassword !== confirmPassword)
                  throw new Error("New passwords do not match.");
                const result = await actions.changePassword({
                  currentPassword,
                  newPassword,
                  revokeOtherSessions:
                    values.get("revokeOtherSessions") === "on",
                });
                if (result.error)
                  throw new Error(
                    result.error.message || "Unable to change password",
                  );
                event.currentTarget.reset();
                setNotice("Password updated.");
              });
            }}
          >
            <label>
              Current password
              <input
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                disabled={busy}
              />
            </label>
            <label>
              New password
              <input
                name="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={12}
                required
                disabled={busy}
              />
            </label>
            <label>
              Confirm new password
              <input
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={12}
                required
                disabled={busy}
              />
            </label>
            <label className="check-label">
              <input
                name="revokeOtherSessions"
                type="checkbox"
                defaultChecked
              />{" "}
              Sign out other devices after changing my password
            </label>
            <button className="primary" disabled={busy}>
              Update password
            </button>
          </form>
        </section>
      </div>

      <section
        className="panel profile-security"
        aria-labelledby="profile-security-title"
      >
        <div className="panel-heading">
          <div>
            <h2 id="profile-security-title">
              <ShieldCheck size={18} aria-hidden="true" /> Two-factor
              authentication
            </h2>
            <p>
              Use an authenticator app to add a second check when you sign in.
            </p>
          </div>
          <span
            className={account.twoFactorEnabled ? "badge scheduled" : "badge"}
          >
            {account.twoFactorEnabled ? "Enabled" : "Not enabled"}
          </span>
        </div>
        {!account.twoFactorEnabled && !enrollment && (
          <form
            className="profile-form inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              const password = String(
                new FormData(event.currentTarget).get("password") || "",
              );
              void run(async () => {
                const result = await actions.enableTwoFactor({
                  password,
                  method: "totp",
                });
                if (result.error || !result.data || !("totpURI" in result.data))
                  throw new Error(
                    result.error?.message || "Authenticator setup failed",
                  );
                setEnrollment(result.data);
                event.currentTarget.reset();
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
              <LockKeyhole size={16} /> Set up authenticator
            </button>
          </form>
        )}
        {enrollment && (
          <div className="mfa-enrollment" aria-label="Authenticator enrollment">
            <p>
              Scan this QR code with your authenticator app, then enter the
              six-digit code to finish setup.
            </p>
            {qrCode && (
              <img
                className="authenticator-qr"
                src={qrCode}
                alt="QR code for adding this P1 account to an authenticator app"
                width="224"
                height="224"
              />
            )}
            <p>
              Setup key:{" "}
              <code className="secret">
                {new URL(enrollment.totpURI).searchParams.get("secret")}
              </code>
            </p>
            <p>Save these recovery codes privately before continuing:</p>
            <pre className="secret">{enrollment.backupCodes.join("\n")}</pre>
            <form
              className="profile-form inline-form"
              onSubmit={(event) => {
                event.preventDefault();
                const code = String(
                  new FormData(event.currentTarget).get("code") || "",
                );
                void run(async () => {
                  const result = await actions.verifyTotp({ code });
                  if (result.error)
                    throw new Error(
                      result.error.message || "Unable to verify authenticator",
                    );
                  setEnrollment(null);
                  await onRefresh();
                  setNotice("Two-factor authentication is enabled.");
                });
              }}
            >
              <label>
                Authenticator code
                <input
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  disabled={busy}
                />
              </label>
              <button className="primary" disabled={busy}>
                <CheckCircle2 size={16} /> Verify authenticator
              </button>
            </form>
          </div>
        )}
        {account.twoFactorEnabled && (
          <form
            className="profile-form inline-form profile-danger"
            onSubmit={(event) => {
              event.preventDefault();
              const password = String(
                new FormData(event.currentTarget).get("password") || "",
              );
              void run(async () => {
                const result = await actions.disableTwoFactor({ password });
                if (result.error)
                  throw new Error(
                    result.error.message || "Unable to disable authenticator",
                  );
                await onRefresh();
                setNotice("Two-factor authentication is disabled.");
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
            <button disabled={busy}>Disable authenticator</button>
          </form>
        )}
      </section>
    </div>
  );
}
