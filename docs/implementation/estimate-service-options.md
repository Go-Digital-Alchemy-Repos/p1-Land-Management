# Estimate service choices — September 21, 2026

Fresh production browser QA found an empty Services group on `/forms/p1-estimate`.
The managed form defined a checkbox without options. This fix seeds the exact six
labels and submitted values already used by the public contact page, and repairs
only empty or omitted options on the managed `services` checkbox.

Existing custom choices, field IDs, unrelated fields and settings remain intact.
No schema, submission-effect, recipient, public layout or image changes are made.
The existing managed-form initialization applies the repair. Populated choices
are left unchanged on subsequent runs.

Root reviewed the change and independently ran all 12 system-form tests and the
Core type check successfully. The tests cover canonical contact-page parity,
fresh seed, existing-form repair, customization preservation and repeat behavior.
Deployment and fresh live form verification remain separate checks.

Rollback should use a reviewed revert commit, never a reset or force push. The
added valid choices need not be removed from stored forms when reverting code;
they use existing supported submission values.
