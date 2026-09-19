import {
  acquireMarketingBlogReservation,
  heartbeatMarketingBlogReservation,
  releaseMarketingBlogReservation,
} from "@workspace/api-client-react/dashboard";
import {
  usePageEditorLease,
  type PageLeaseTransport,
} from "../../../../platform/p1-core/client/src/components/shared/use-page-editor-lease";
const transport: PageLeaseTransport = (action, id, payload, options) => {
  if (action === "acquire")
    return acquireMarketingBlogReservation(id, payload, options);
  if (!payload.leaseId) throw Error("Blog reservation proof is missing.");
  const proof = {
    editorInstanceId: payload.editorInstanceId,
    leaseId: payload.leaseId,
  };
  return action === "heartbeat"
    ? heartbeatMarketingBlogReservation(id, proof, options)
    : releaseMarketingBlogReservation(id, proof, options);
};
/** Blog publications require an exact browser-instance lease, not user ownership. */
export function useBlogReservation(id: string | null) {
  return usePageEditorLease(id, transport);
}
