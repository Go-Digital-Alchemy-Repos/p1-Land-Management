export type SupportGuidance = Readonly<{
  title: string;
  detail: string;
}>;

/** Support text is intentionally local: it never exposes an account, token or capture. */
export const NATIVE_SUPPORT_GUIDANCE: readonly SupportGuidance[] = [
  {
    title: "Invitation and password",
    detail:
      "P1 Field uses your invited P1 account. Ask your P1 office administrator to resend setup or password-reset instructions; this app does not create or reset accounts.",
  },
  {
    title: "Authenticator access",
    detail:
      "Use your authenticator code or one of your recovery codes. Do not share a password, code or recovery code with anyone.",
  },
  {
    title: "Expired access",
    detail:
      "Offline work expires with the verified session. Reconnect and sign in with the same assigned account before attempting a sync.",
  },
  {
    title: "Protected device storage",
    detail:
      "Do not uninstall the app, clear its data or switch accounts while saved work is pending. A lost device encryption key cannot be reconstructed by signing in again.",
  },
  {
    title: "When to contact the office",
    detail:
      "If the app shows a saved-capture reference, report that reference to the office. It identifies the local capture without exposing its contents or confirming server acceptance.",
  },
];
