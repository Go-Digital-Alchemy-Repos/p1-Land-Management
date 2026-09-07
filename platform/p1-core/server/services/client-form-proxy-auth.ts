import { constantTimeSecretEquals } from "../utils/constant-time-secret";

export interface ClientFormProxyAuthorizationInput {
  requestedStackId: string;
  presentedToken: string | undefined;
  targetStackId?: string | undefined;
  expectedToken?: string | undefined;
}

export type ClientFormProxyAuthorization =
  | { allowed: true }
  | { allowed: false; configured: false }
  | { allowed: false; configured: true };

export function authorizeClientFormProxy(
  input: ClientFormProxyAuthorizationInput,
): ClientFormProxyAuthorization {
  const targetStackId = input.targetStackId?.trim();
  const expectedToken = input.expectedToken?.trim();
  if (!targetStackId || !expectedToken) {
    return { allowed: false, configured: false };
  }

  if (input.requestedStackId !== targetStackId || !input.presentedToken) {
    return { allowed: false, configured: true };
  }

  return constantTimeSecretEquals(input.presentedToken, expectedToken)
    ? { allowed: true }
    : { allowed: false, configured: true };
}
