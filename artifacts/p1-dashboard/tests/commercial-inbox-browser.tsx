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
const controls = document.createElement("div");
controls.innerHTML = `<label><input id="delay-detail" type="checkbox">Delay detail responses</label><label><input id="delay-save" type="checkbox">Delay save responses</label><button id="release">Release pending response</button><output id="patch-count">PATCH requests: 0</output>`;
document.body.prepend(controls);
let release: (() => void) | undefined,
  patchCount = 0;
document.getElementById("release")!.onclick = () => {
  release?.();
  release = undefined;
};
async function pause(id: string) {
  if ((document.getElementById(id) as HTMLInputElement).checked)
    await new Promise<void>((resolve) => {
      release = resolve;
    });
}
let calls = 0,
  conflict = true;
async function request(path: string, body?: any, method?: string) {
  if (body !== undefined) {
    document.getElementById("patch-count")!.textContent =
      "PATCH requests: " + ++patchCount;
    await pause("delay-save");
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
  if (
    ["/commercial-inquiries/first", "/commercial-inquiries/second"].includes(
      path,
    )
  ) {
    const result = path.endsWith("/first")
      ? { ...first }
      : { ...first, id: "second", reported_company_name: "Second Company" };
    await pause("delay-detail");
    return result;
  }
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
