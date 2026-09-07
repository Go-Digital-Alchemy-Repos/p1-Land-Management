# Forms And Entries

The Forms area now handles both reusable form building and long-term submission storage.

## Form Builder

Use `Admin > Forms > Form Builder` to manage the form itself.

- Build forms with standard and advanced fields.
- Use the right sidebar to add fields when nothing is selected.
- Select a field on the canvas to edit its settings.
- Active forms can be embedded into pages, widgets, and modal CTA buttons.
- Each form can control its own Mailchimp tag routing when Mailchimp sync is enabled.

## Form Entries

Use `Admin > Forms > Form Entries` to review stored submissions.

- Select an active form from the left panel.
- Entries first appear as a compact list with the submitter name, email, and message preview.
- Click an entry to open the full detail view.
- Use `Back to Form Entries` to return to the list without changing forms.
- Export the selected form's entries as CSV when needed.
- Delete entries only when there is a clear retention reason.

## Standalone Form Links

Every active form can expose a shareable public link.

- The standalone form page shows only the logo and the form on a plain white page.
- Use this for campaigns, text-message outreach, email sharing, or QR-code destinations.
- Inactive forms should not be shared publicly.

## Submission Notifications

Forms can notify more than one system user.

- Notification recipients are managed in `Admin > User Manager`.
- Users can be assigned to one form, many forms, or all active forms.
- Email delivery is a notification channel, not the system of record. Entries still remain stored in the CMS.

### Delivery and recovery

An accepted managed-form submission saves its entry and delivery jobs together. CRM intake, contact
messages, Mailchimp updates, and each notification recipient are processed independently. A failed
email does not prevent the CRM or contact message from being recorded. Delivery is asynchronous;
the success message confirms acceptance, not that every provider has already delivered.

Jobs retry with backoff, up to five attempts. An inactive email template is recorded as skipped.
If CRM is disabled, its queued intake does not write CRM records; it retries and can eventually
appear as failed. Enable CRM before explicitly retrying that failed job. An enabled Mailchimp
effect with missing provider configuration also fails visibly rather than silently disappearing.

Operators with server/database access can inspect and retry failed jobs from the correct client
environment:

```sh
npx tsx server/scripts/manage-form-effect-jobs.ts list
npx tsx server/scripts/manage-form-effect-jobs.ts retry <failed-job-id>
```

The listing excludes submission content and recipient addresses. Fix the configuration or delivery
problem before retrying. The retry command accepts only a failed job, preserves its original
destination/content snapshot, and does not replay other completed effects. There is no automatic
replay of historical submissions. External providers can receive a duplicate if delivery succeeds
just before the worker loses its connection or stops; external delivery is at least once.

Deleting an entry also removes its delivery jobs under the database cascade. Review retention and
pending delivery before deleting entries. Event registration and its attached form submission still
have separate transaction boundaries; durable form delivery does not make the entire registration
flow atomic.

## Editing Safety

Forms participate in the editor lock system.

- One admin or editor can actively edit a form at a time.
- A second user may still open the form in read-only mode.
- Admins can take over a lock if necessary.
