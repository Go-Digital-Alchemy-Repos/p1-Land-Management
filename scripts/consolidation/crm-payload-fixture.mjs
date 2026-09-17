import { payloadShapes } from "./prepare-crm-payloads.mjs";
export const at = "2020-02-29T12:34:56.123456Z";
export function fixture() {
  const common = {
    id: "source-lead",
    name: "Private name",
    email: "private@example.test",
    phone: null,
    company: "Company",
    source: "form",
    formData: {
      nested: { html: "<b>Literal</b>", unknownField: [1, null, false] },
    },
    metadata: { legacy: "preserve" },
    ownerId: "source-user",
    nextFollowUpAt: at,
    createdAt: at,
    updatedAt: at,
  };
  const lead = {
    ...common,
    message: "  Original message\n",
    stage: "won",
    externalId: "external",
    formSubmissionId: "submission",
  };
  const client = Object.fromEntries(
    Object.keys(payloadShapes.clients).map((k) => [k, null]),
  );
  Object.assign(client, common, {
    id: "source-client",
    sourceLeadId: lead.id,
    clientType: "business",
    preferredContactMethod: "email",
    onboardingStatus: "legacy-custom",
    status: "active",
    accountOwnerId: "missing-user",
    internalTags: ["first", "second"],
    primaryEmail: "other@example.test",
    billingEmail: "billing@example.test",
    addressLine1: "Private address",
  });
  const note = {
    id: "note",
    body: "  Original note <script>literal</script>\n",
    createdById: "source-user",
    createdAt: at,
  };
  const task = {
    id: "task",
    title: "  Completed task  ",
    dueAt: at,
    completed: true,
    assignedToId: "missing-user",
    createdById: null,
    createdAt: at,
    updatedAt: at,
  };
  return {
    schemaVersion: 1,
    sourceInstanceId: "core-a",
    records: {
      leads: [lead],
      clients: [client],
      leadNotes: [{ ...note, leadId: lead.id }],
      clientNotes: [{ ...note, clientId: client.id }],
      leadTasks: [{ ...task, leadId: lead.id }],
      clientTasks: [{ ...task, clientId: client.id }],
    },
    targetInventory: {
      dashboardLeads: [
        {
          id: "target-lead",
          status: "new",
          convertedClientId: "target-client",
        },
      ],
      dashboardClients: [{ id: "target-client" }],
      canonicalUsers: [{ id: "canonical-user" }],
      identityLinks: [
        {
          coreUserId: "source-user",
          canonicalUserId: "canonical-user",
          revokedAt: null,
        },
      ],
      recordLinks: [],
      receipts: [
        {
          sourceInstanceId: "core-a",
          submissionId: "submission",
          leadId: "target-lead",
        },
      ],
    },
  };
}
