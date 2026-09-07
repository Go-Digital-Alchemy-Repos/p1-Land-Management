# ADR-002: JWT Authentication with HTTP-Only Cookies

## Status

Accepted

## Context

We needed to choose an authentication mechanism for the SPA. Options considered:

1. Session-based auth with server-side session store
2. JWT in localStorage
3. JWT in HTTP-only cookies

## Decision

We chose **JWT tokens stored in HTTP-only cookies**. The implementation:

- Tokens are signed with `SESSION_SECRET` using `jsonwebtoken`
- Tokens contain `userId`, `email`, and `role`
- Tokens expire after 7 days
- Cookie settings: `httpOnly: true`, `secure: true` (production), `sameSite: lax`, `path: /`
- The cookie name is `corePlatform_token`

## Consequences

- **Positive**: Tokens are not accessible to client-side JavaScript (XSS protection)
- **Positive**: Automatically sent with every request (no manual header management)
- **Positive**: Stateless — no server-side session store needed
- **Negative**: CSRF risk mitigated via origin checking middleware rather than CSRF tokens
- **Negative**: Token revocation requires waiting for expiry (no server-side invalidation list)
- **Trade-off**: `sameSite: lax` allows top-level navigation requests but blocks cross-site POST requests
