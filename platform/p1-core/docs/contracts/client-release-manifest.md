# Client Release Manifest v3.0

The client release manifest is a versioned, secret-free release record. It ties one client stack to its
candidate Core and site revisions, the distinct public and administrative origins, backup provenance,
release gates, and business/technical/operations approvals.

Validate a record before release review:

```bash
npm run release:manifest:validate -- docs/pilots/<client>/client-release-manifest.example.json
```

To enforce the go/no-go outcome, use the readiness command. It prints the exact pending required gates,
backup state, and missing approval roles, then exits nonzero until the record is eligible for release:

```bash
npm run release:readiness -- docs/pilots/<client>/client-release-manifest.example.json
```

Version `3.0` is the only accepted schema version. It adds the required `content` release gate: a release
cannot be approved until the client has approved representative or actual copy, identities and rights claims,
and the visual and accessibility review with evidence. Versions `1.0` and `2.0` records must be migrated by
adding that gate before validation; the validator fails closed instead of interpreting an omitted content
review as optional.

Every record lists the complete standard gate set. `draft` records can accurately show pending gates. An
`approved` record must have an exact-match verified backup whose manifest stack ID matches `clientStackId`, a
passed duplicate-environment restore drill, every required gate passed with evidence, and one reference for
each required approval role. A legacy backup accepted for a duplicate-environment recovery exercise is
recorded as `legacy-explicit` and cannot support an approved release. The record stores references only;
do not put provider credentials, database URLs, or access tokens in it.

The release manifest records a review outcome. Passing the content schema check only proves the record has
the review and its evidence; it does not establish the client approval. The manifest does not provision
Railway, mutate DNS, restore a database, or authorize deployment.
