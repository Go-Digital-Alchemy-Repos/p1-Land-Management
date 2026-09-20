import { customFetch } from "../../../../lib/api-client-react/src/custom-fetch";
import {
  usePageEditorLease,
  type PageLeaseTransport,
  type PageLeaseState,
} from "../../../../platform/p1-core/client/src/components/shared/use-page-editor-lease";
export const sectionLeaseTransport: PageLeaseTransport = (
  action,
  id,
  payload,
  options,
) =>
  customFetch<PageLeaseState>(
    `/api/v1/marketing/cms/editor-locks/cms_section/${encodeURIComponent(id)}/${action}`,
    {
      ...options,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
export function useSectionReservation(id: string | null) {
  return usePageEditorLease(id, sectionLeaseTransport, "section");
}
