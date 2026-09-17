import { hasCapability, type Capability, type CapabilitySubject } from "@workspace/api-zod/business-access";

/** Each area loads its own data. Reference lists are separate, minimized API responses. */
export function dataLoadPlan(subject: CapabilitySubject): { paths: string[]; references: boolean } {
  if (subject.role === "crew") return { paths: ["work-orders", "properties"], references: false };
  if (subject.role === "client") return { paths: ["work-orders", "properties", "clients", "estimates", "billing", "quickbooks/invoices", "requests", "assessment-slots", "inspections"], references: false };
  const paths = new Set<string>();
  let references = false;
  const add = (grant: Capability, values: string[], needsReferences = true) => {
    if (!hasCapability(subject, grant)) return;
    for (const value of values) paths.add(value);
    references ||= needsReferences;
  };
  add("workspace.my-day", ["work-orders"], false);
  add("customers.clients", ["clients"]);
  add("customers.properties", ["properties", "property-types"]);
  add("customers.requests", ["requests"]);
  add("operations.schedule", ["work-orders", "assessment-slots"]);
  add("operations.recurring", ["recurring-services", "recurring-jobs"]);
  add("operations.projects", ["projects"]);
  add("operations.inspections", ["inspections"]);
  add("revenue.sales", ["estimates", "agreement-templates"]);
  add("revenue.agreements", ["estimates", "agreement-templates"]);
  add("revenue.agreement-templates.manage", ["agreement-templates"], false);
  add("revenue.billing", ["billing", "estimates", "quickbooks/invoices"]);
  add("revenue.expenses", ["expenses"]);
  if (subject.role === "owner") { paths.add("integrations"); paths.add("account-mfa-policies"); }
  return { paths: [...paths], references };
}
