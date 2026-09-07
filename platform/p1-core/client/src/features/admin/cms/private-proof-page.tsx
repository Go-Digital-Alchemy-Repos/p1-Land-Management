import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { AdminSidebar } from "../admin-sidebar";
import { proofCategories, type ProofDraft, type ProofInventory } from "@shared/p1-private-proof";
const endpoint = "/api/admin/cms/private-proof";
const labels: Record<keyof ProofDraft, string> = {
  title: "Internal title",
  scope: "Scope and availability",
  delivery: "Delivery model",
  sourceUrl: "Source URL (public HTTPS, no private tokens)",
  privateReference: "Private document reference (no uploads)",
  sourceOwner: "Source owner",
  technicalReviewer: "Technical reviewer",
  reviewedDate: "Reviewed date",
  expiryDate: "Expiry date",
  permission: "Permission status",
  permissionScope: "Permission scope",
  publicExcerpt: "Proposed public excerpt (remains private)",
  approvedAssetReference: "Approved asset reference (remains private)",
};
export default function PrivateProofPage() {
  const { user } = useAuth();
  const query = useQuery<ProofInventory>({ queryKey: [endpoint], refetchOnWindowFocus: false });
  const [inventory, setInventory] = useState<ProofInventory>();
  const [index, setIndex] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (query.data && !inventory) setInventory(query.data);
  }, [query.data, inventory]);
  async function action(action: "save" | "approve" | "revoke") {
    if (!inventory) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await apiRequest("PUT", endpoint, {
        revision: inventory.revision,
        index,
        action,
        ...(action === "save" ? { draft: inventory.records[index].draft } : {}),
      });
      setInventory(await response.json());
      setDirty(false);
      setMessage("Saved privately. Nothing was published.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save. Inputs retained.");
    } finally {
      setBusy(false);
    }
  }
  const record = inventory?.records[index];
  return (
    <AdminSidebar>
      <main className="min-w-0 w-full max-w-4xl space-y-5 p-4 sm:p-6">
        <h1 className="text-2xl font-semibold">Private commercial proof</h1>
        <p>
          Unverified placeholders for internal review. No files, notes, excerpts or approvals here
          are published automatically. Uploads are disabled; keep sensitive documents in your
          approved private storage.
        </p>
        {query.isError && <p role="alert">Could not load private inventory.</p>}
        {!record ? (
          <p>Loading inventory…</p>
        ) : (
          <>
            <label className="grid min-w-0 gap-2 sm:flex sm:items-center">
              Category
              <select
                className="min-w-0 w-full max-w-full rounded border p-2 sm:w-auto"
                value={index}
                disabled={dirty || busy}
                onChange={(e) => setIndex(Number(e.target.value))}
              >
                {proofCategories.map((category, i) => (
                  <option value={i} key={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <p>
              Review status: <strong>{record.status}</strong> · Inventory revision{" "}
              {inventory!.revision}
            </p>
            <form
              className="grid min-w-0 gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                void action("save");
              }}
            >
              {(Object.keys(labels) as Array<keyof ProofDraft>).map((key) => (
                <label className="grid min-w-0 gap-1" key={key}>
                  {labels[key]}
                  {key === "permission" || key === "delivery" ? (
                    <select
                      className="min-w-0 max-w-full rounded border p-2"
                      disabled={busy}
                      value={record.draft[key]}
                      onChange={(e) => {
                        setInventory({
                          ...inventory!,
                          records: inventory!.records.map((r, i) =>
                            i === index
                              ? { ...r, draft: { ...r.draft, [key]: e.target.value } }
                              : r,
                          ),
                        });
                        setDirty(true);
                      }}
                    >
                      {(key === "permission"
                        ? ["unknown", "pending", "granted", "denied"]
                        : ["unknown", "self_performed", "coordinated"]
                      ).map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="min-w-0 max-w-full rounded border p-2"
                      disabled={busy}
                      type={key.endsWith("Date") ? "date" : "text"}
                      maxLength={key === "sourceUrl" ? 1000 : 2000}
                      value={record.draft[key]}
                      onChange={(e) => {
                        setInventory({
                          ...inventory!,
                          records: inventory!.records.map((r, i) =>
                            i === index
                              ? { ...r, draft: { ...r.draft, [key]: e.target.value } }
                              : r,
                          ),
                        });
                        setDirty(true);
                      }}
                    />
                  )}
                </label>
              ))}
              <button className="rounded bg-primary p-3 text-primary-foreground" disabled={busy}>
                Save private draft
              </button>
            </form>
            {user?.role === "admin" && (
              <div className="flex flex-wrap gap-3">
                <button
                  className="min-w-0 max-w-full rounded border p-2"
                  disabled={busy || dirty}
                  onClick={() => void action("approve")}
                >
                  Approve evidence privately
                </button>
                <button
                  className="min-w-0 max-w-full rounded border p-2"
                  disabled={busy || dirty}
                  onClick={() => void action("revoke")}
                >
                  Revoke approval
                </button>
              </div>
            )}
            <button
              className="min-w-0 max-w-full rounded border p-2"
              disabled={busy}
              onClick={async () => {
                if (
                  dirty &&
                  !window.confirm("Discard your unsaved inputs and load the latest inventory?")
                )
                  return;
                const result = await query.refetch();
                if (result.data) {
                  setInventory(result.data);
                  setDirty(false);
                  setMessage("");
                }
              }}
            >
              Reload latest inventory
            </button>
            <details className="min-w-0 break-words">
              <summary>Review history ({inventory!.history.length})</summary>
              <ul>
                {inventory!.history
                  .slice()
                  .reverse()
                  .map((entry) => (
                    <li key={entry.revision}>
                      Revision {entry.revision}: {entry.action} · {entry.category} · {entry.at} ·{" "}
                      {entry.actor}
                    </li>
                  ))}
              </ul>
            </details>
          </>
        )}
        {message && (
          <p role="status" aria-live="polite">
            {message}
          </p>
        )}
      </main>
    </AdminSidebar>
  );
}
