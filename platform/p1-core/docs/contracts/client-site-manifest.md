# Client Site Onboarding Manifest v1.0

The client site manifest is the versioned, secret-free handoff between an imported React site and a
single-client Core Platform deployment. The canonical Zod schema and structured validation API live in
[`shared/client-site-manifest.ts`](../../shared/client-site-manifest.ts).

The manifest records client identity, immutable source revision, compatibility ranges, public and admin
origins, same-origin `/api` routing, build/start commands, routes and navigation, assets, semantic theme
metadata, exact editable field descriptors and defaults, Puck registrations, forms, integrations, modules,
and references to secrets held by the deployment environment. Core generates editor controls and validates
submitted content from those field descriptors; undeclared leaf fields are rejected.

## Compatibility

Version `1.0` is the only accepted schema version. Readers fail closed on unknown versions. Component,
theme, registry, content, and Core Platform compatibility use semantic versions so a release gate can
compare the site bundle with the target platform before deployment. A draft manifest may use reserved
`.example` origins and `decision-required` as its Puck publish mode; neither is production approval.

## Secret Boundary

Secret values never belong in this file. Declare an environment-variable name in `secretReferences`, then
refer to its ID from forms, integrations, or modules through `secretRefs`. The schema rejects undeclared
references, secret-shaped property names, common provider secret formats, database URLs with embedded
credentials, and unknown object properties. Validation output contains paths and messages without echoing
input values.

## Validation

Run the fail-closed validator from the repository root:

```sh
npm run manifest:validate -- docs/pilots/better-farms/client-site-manifest.example.json
```

Exit code `0` means the manifest is valid. Exit code `1` means the JSON was read but violates the
contract. Exit code `2` means usage, file access, or JSON parsing failed. Successful output includes only
the schema version and client stack ID; failure output includes structured error paths, codes, and safe
messages.

The structural validator does not prove that a separately checked-out site still contains every declared
source file. Verify that cross-repository boundary with the site checkout path:

```sh
npm run site:contract:verify -- docs/pilots/better-farms/client-site-manifest.example.json /path/to/Better-Farms
```

This checks every declared route component, asset source, theme token source, and Puck renderer while
rejecting references outside the supplied checkout. It performs no build, network request, source change,
or deployment.

The [Better Farms example](../pilots/better-farms/client-site-manifest.example.json) is an adapter-facing
fixture based on source revision `ee14d6746cc14cb4b441eecf6598aaaf0e18e975`. It documents current site
routes, assets, and the approved runtime API publishing mode. It does not authorize deployment.

The accompanying [client migration intake](client-migration-intake.md) carries the separate scope,
source-access, recovery, and release decisions that must be approved before this draft manifest can support
a client migration.

See the [Client Site Preview Bridge](client-site-preview.md) for the versioned cross-origin preview
protocol and [ADR 006](../adr/006-runtime-client-site-content.md) for publication behavior.
