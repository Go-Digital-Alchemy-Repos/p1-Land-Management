# Commercial inquiry inbox

Local implementation checkpoint ce90f1e plus the async interaction follow-up. Not deployed or accepted yet. Receiver/backend contract is reviewed commit66338b0. Only owner, manager and sales see this inbox in Sales; backend independently enforces these roles. Commercial intake does not grant portal access or create operational client/property identities.

The list consumes `{items,nextCursor}` in pages of50 and resets the filter-bound cursor on status, owner or overdue changes. Selected detail remains separate from loaded pages. Follow-up uses PATCH with the current record version, active sales owner, next action and optional due date. Due-date input explicitly uses the device timezone. A successful mutation reloads the selected detail and first page; errors retain the draft until explicit reload.

Detail selection, reload and save share a synchronous busy gate. Controls remain disabled until the in-flight operation finishes, preventing a slow selection from competing with a save of the previous inquiry. Async detail/save results are generation-fenced after unmount. Requests for an old list filter cannot update its replacement list.

## Browser regression fixture

Run the dashboard Vite development server and open `/tests/commercial-inbox-browser.html`. All content and requests are synthetic; there are no production mutations.

1. Select Synthetic Company, load more inquiries, and confirm selection remains Synthetic Company with Second Company added.
2. Enter a different next action and save. First fixture PATCH intentionally fails with a conflict. The draft stays visible. Explicit reload restores the saved action. A subsequent save uses PATCH and refreshes the detail and first page.
3. Change the status filter. Fixture rejects stale cursor use, so a clean list without error proves cursor reset.
4. Select Synthetic Company, load Second Company, enable Delay detail responses, then select Second Company. The previous form, save, reload and both selection buttons must be disabled; PATCH requests remain0 on a fresh fixture. Release the response: selection becomes Second Company and receives focus.
5. Disable detail delay, enable save delay and submit. Selection/reload/form controls must stay disabled while pending. Release the response; the controlled error restores interaction with the draft intact.
6. At390×844 verify readable filters, stacked list/detail and no horizontal clipping; reset browser viewport afterward.

These sequences were exercised through browser controls. Initial ce90f1e isolated source passed nine dashboard tests, five commercial backend tests, migration replay through0010, both TypeScript checks and production builds. The follow-up requires independent review before staging. Physical-device acceptance and a live Core-to-dashboard submission remain separate gates.
