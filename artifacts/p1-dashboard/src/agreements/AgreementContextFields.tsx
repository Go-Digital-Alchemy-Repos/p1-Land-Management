import { useEffect, useState } from "react";
import {
  getWorkspaceReferences,
  listSalesLeads,
} from "@workspace/api-client-react/dashboard";
import type {
  AgreementDraftContext,
  SalesLead,
  WorkspaceReferences,
} from "../../../../lib/api-client-react/src/dashboard/models";
import { message } from "./template-draft";
export default function AgreementContextFields({
  value,
  change,
  ready,
}: {
  value: AgreementDraftContext;
  change: (value: AgreementDraftContext) => void;
  ready: (value: boolean) => void;
}) {
  const [refs, setRefs] = useState<WorkspaceReferences | null>(null),
    [leads, setLeads] = useState<SalesLead[]>([]),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    ready(false);
    setError("");
    void Promise.all([
      getWorkspaceReferences({ signal: controller.signal }),
      listSalesLeads({ signal: controller.signal }),
    ])
      .then(([references, inquiries]) => {
        if (!controller.signal.aborted) {
          setRefs(references);
          setLeads(inquiries);
          ready(true);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(message(error));
      });
    return () => controller.abort();
  }, [attempt, ready]);
  const properties =
    refs?.properties.filter((row) => row.client_id === value.clientId) || [];
  return (
    <>
      {error && <p role="alert">{error}</p>}
      {!refs && !error && <p role="status">Loading agreement context…</p>}
      <button type="button" onClick={() => setAttempt((n) => n + 1)}>
        Refresh context choices
      </button>
      <label>
        Client
        <select
          aria-label="Agreement client"
          value={value.clientId || ""}
          onChange={(e) =>
            change({
              ...value,
              clientId: e.target.value || null,
              propertyId: null,
              sourceEstimateId: null,
            })
          }
        >
          <option value="">No client attached</option>
          {value.clientId &&
            !refs?.clients.some((row) => row.id === value.clientId) && (
              <option value={value.clientId}>Saved client (unavailable)</option>
            )}
          {refs?.clients.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Property
        <select
          aria-label="Agreement property"
          value={value.propertyId || ""}
          onChange={(e) =>
            change({
              ...value,
              propertyId: e.target.value || null,
              sourceEstimateId: null,
            })
          }
        >
          <option value="">No property attached</option>
          {value.propertyId &&
            !properties.some((row) => row.id === value.propertyId) && (
              <option value={value.propertyId}>
                Saved property (unavailable)
              </option>
            )}
          {properties.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name} · {row.address}
            </option>
          ))}
        </select>
      </label>
      <label>
        Inquiry
        <select
          aria-label="Agreement inquiry"
          value={value.leadId || ""}
          onChange={(e) => change({ ...value, leadId: e.target.value || null })}
        >
          <option value="">No inquiry attached</option>
          {value.leadId && !leads.some((row) => row.id === value.leadId) && (
            <option value={value.leadId}>Selected inquiry</option>
          )}
          {leads.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name} · {row.location}
            </option>
          ))}
        </select>
      </label>
      <p>For older inquiries, start a draft from the Sales inbox.</p>
      <p>
        Attach a client or an inquiry. Inquiry-only drafts do not create client
        or property records. Saving checks that all attached records belong
        together.
      </p>
      {value.sourceEstimateId && (
        <p>
          Source estimate: {value.sourceEstimateId}. Changing the client or
          property clears this reference.
        </p>
      )}
    </>
  );
}
