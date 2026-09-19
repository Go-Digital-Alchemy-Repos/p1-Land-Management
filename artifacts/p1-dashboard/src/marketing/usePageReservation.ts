import { customFetch } from "../../../../lib/api-client-react/src/custom-fetch";
import {
  usePageEditorLease,
  type PageLeaseTransport,
  type PageLeaseState,
} from "../../../../platform/p1-core/client/src/components/shared/use-page-editor-lease";
export const pageLeaseTransport: PageLeaseTransport = (
  action,
  id,
  payload,
  options,
) =>
  customFetch<PageLeaseState>(
    `/api/v1/marketing/cms/editor-locks/cms_page/${encodeURIComponent(id)}/${action}`,
    {
      ...options,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
export function usePageReservation(id: string | null) {
  return usePageEditorLease(id, pageLeaseTransport);
}
