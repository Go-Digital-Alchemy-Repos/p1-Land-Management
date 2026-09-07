/** Compatibility bridge: either reviewed /me flag requires assurance, for every role. */
export function requiresAccountMfa(identity: {
  mfaRequired?: boolean;
  ownerMfaRequired?: boolean;
}) {
  return identity.mfaRequired === true || identity.ownerMfaRequired === true;
}
