# Client Site Preview Bridge v1.0

The preview bridge lets the authenticated Core Platform editor display client-site content without
giving the editor control over the client renderer, routes, behavior, or CSS.

Core Platform loads and validates the client manifest, verifies the running Core version, confirms that
the requested component is allowed in the requested route, and builds a strict version `1.0` preview
message. `ClientSitePreviewFrame` sends that message only to the iframe URL's exact origin.

The client site separately checks the sender against its configured admin origin, requires the expected
client, route, and component identifiers, and validates the component content before rendering. Unknown
protocol versions, components, fields, origins, and arbitrary JSX are rejected.

After its message listener is ready, the client sends a versioned readiness message to the exact trusted
admin origin. Core verifies the iframe window, origin, and identifiers before sending content. This
handshake avoids losing the first preview update during iframe startup.

The bridge remains preview-only. Persistence and publication use the separate runtime content API described
in ADR 006, so iframe messages cannot publish or modify stored content.

## Publish Model

The Better Farms pilot uses runtime API publication. Saving creates an immutable draft revision; publishing
copies the current validated draft into a separate published snapshot. Restoring history creates a new draft
revision and never rewrites an existing revision. Public reads return only the published snapshot through the
same-origin `/api` proxy and support ETag revalidation.
