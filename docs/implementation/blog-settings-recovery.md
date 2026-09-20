# Blog settings recovery and presentation increment

The native Blog settings controller retains the existing taxonomy, comment settings,
and moderation API contracts and Blog capability. No public comment interface is
introduced and no publication version or compare-and-swap guarantee is claimed.

## Implemented

- Taxonomy creation requires a successfully loaded authoritative option list.
  Failed loads offer an explicit retry. A response-lost create retains the draft
  and blocks another create until staff reload, inspect the list, and explicitly
  confirm the item was not created. Selecting an existing item is the recovery
  path when it did succeed; no match is inferred by name.
- Taxonomy save results are normalized to editable input fields. Category parent
  choices still exclude descendants. Deletion describes immutable published
  labels accurately rather than promising to rewrite all articles.
- Pending mutations block internal tab/filter navigation; dirty drafts retain
  the existing confirmation behavior. Browser unload prompts remain subject to
  normal browser behavior.
- Categories and tags have separate groups, hierarchical names and subcategory
  labels. Comment settings restore Participation Rules and Spam Protection
  grouping. Moderation displays existing API counts and creation timestamps.
- Initial comment settings and moderation failures offer retry. Failed comment reads hide stale rows and empty-result messaging. Count refreshes use abort-fenced effects, including after mutations. Existing controls,
  slug/sort/type editing and tool deep links remain available.

## Validation

Six focused React adapter tests cover initial-load gating/retry, repeated-save
input normalization and hierarchical labels, response-lost create recovery,
moderation pending navigation/counts/date, settings failure/draft retention, and failed-filter stale-row suppression/retry.
Run from `platform/p1-core`:

```
npx vitest run --config client/src/components/shared/blog-settings-native-adapter.vitest.config.ts
```

This increment uses the current native shell styling and the original settings
information grouping. It does not claim a complete shared extraction of the
retained admin card primitives or visual pixel parity. That remains a visual
integration/review step. Existing non-versioned endpoint concurrency behavior is
unchanged; a later editor can still overwrite another editor's settings.
