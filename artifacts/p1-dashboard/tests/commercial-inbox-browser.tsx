import { createRoot } from "react-dom/client";
import { CommercialInbox } from "../src/CommercialInbox";
import "../src/style.css";
const first = {
  id: "first",
  name: "Synthetic Contact",
  reported_company_name: "Synthetic Company",
  reported_property_name: "North site",
  location: "Synthetic address",
  description: "Synthetic site assessment request",
  status: "new",
  version: 1,
  owner_id: null,
  next_action: "Call contact",
  next_action_due_at: null,
  services: ["Land clearing"],
  email: "example@example.test",
  phone: null,
};
let calls = 0,
  conflict = true;
async function request(path: string, body?: any, method?: string) {
  if (body !== undefined) {
    if (method !== "PATCH") throw new Error("Expected PATCH");
    if (conflict) {
      conflict = false;
      throw new Error("Inquiry changed; refresh before saving");
    }
    if (body.expectedVersion !== first.version || !body.nextAction)
      throw new Error("Invalid follow-up");
    first.version++;
    first.next_action = body.nextAction;
    return { ...first };
  }
  if (path === "/commercial-inquiries/first") return { ...first };
  if (path === "/commercial-inquiries/second")
    return { ...first, id: "second", reported_company_name: "Second Company" };
  const query = new URL(path, "https://example.test").searchParams;
  if (query.has("status") && query.has("cursor"))
    throw new Error("Old cursor survived filter change");
  calls++;
  document.title = "Commercial inbox fixture · list requests " + calls;
  return query.has("cursor")
    ? {
        items: [
          { ...first, id: "second", reported_company_name: "Second Company" },
        ],
        nextCursor: null,
      }
    : {
        items: [{ ...first }],
        nextCursor: query.has("status") ? null : "synthetic-next",
      };
}
createRoot(document.getElementById("root")!).render(
  <CommercialInbox
    staff={[{ id: "manager", name: "Synthetic Manager", role: "manager" }]}
    request={request}
  />,
);
