import { useRef, useState } from "react";
import {
  createAgreementRevision,
  createAgreementChangeOrder,
} from "@workspace/api-client-react/dashboard";
import { message } from "./template-draft";
export default function ComposedEstimateActions({
  estimate,
}: {
  estimate: { id: string; revision: number; status: string };
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const operation = useRef(crypto.randomUUID()),
    gate = useRef(false);
  const approved = estimate.status === "approved";
  async function create() {
    if (gate.current) return;
    gate.current = true;
    setBusy(true);
    setError("");
    try {
      const body = {
        operationId: operation.current,
        expectedRevision: estimate.revision,
      };
      const result = approved
        ? await createAgreementChangeOrder(estimate.id, {
            ...body,
            title: "Additional work",
          })
        : await createAgreementRevision(estimate.id, body);
      location.assign(`/agreements/drafts/${result.draft.id}`);
    } catch (error) {
      setError(message(error));
    } finally {
      gate.current = false;
      setBusy(false);
    }
  }
  return (
    <div>
      <button disabled={busy} onClick={() => void create()}>
        {busy
          ? "Opening draft…"
          : approved
            ? "Additional work"
            : "Revise agreement"}
      </button>
      {error && <p role="alert">{error} Retry uses the same draft request.</p>}
    </div>
  );
}
