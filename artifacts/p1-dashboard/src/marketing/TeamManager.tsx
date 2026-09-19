import { X } from "lucide-react";
import {
  TeamListPresentation,
  TeamEditorPresentation,
} from "../../../../platform/p1-core/client/src/components/shared/team-admin-presentation";
import { builderPrimitives } from "./builder-primitives";
import { BlogImageInput } from "./BlogImageInput";
import { useEffect, useRef, useState } from "react";
import {
  listMarketingTeam,
  createMarketingTeam,
  updateMarketingTeam,
} from "@workspace/api-client-react/dashboard";
import type {
  MarketingTeamMember,
  MarketingTeamInput,
} from "../../../../lib/api-client-react/src/dashboard/models";
import { CmsRichTextEditor } from "./CmsRichTextEditor";
import { MediaLibrary } from "./MediaLibrary";
import { useCmsUnsavedChanges } from "./useCmsUnsavedChanges";
import "./team-manager.css";
const teamUI = {
  ...builderPrimitives,
  Input: (props: any) => <input {...props} />,
  DialogHeader: ({ children }: any) => <header>{children}</header>,
  DialogTitle: ({ children }: any) => (
    <h2 id="team-dialog-title">{children}</h2>
  ),
  DialogDescription: ({ children }: any) => (
    <p id="team-dialog-description">{children}</p>
  ),
};
const empty: MarketingTeamInput = {
  name: "",
  role: "",
  biography: "",
  excerpt: "",
  photoUrl: "",
  photoAlt: "",
  status: "draft",
};
function errorText(error: unknown) {
  const data = (error as { data?: { message?: string; error?: string } }).data;
  return (
    data?.message ||
    data?.error ||
    (error as Error).message ||
    "Team request failed"
  );
}
function biographyHtml(value: string) {
  if (!value || /<[a-z][\s\S]*>/i.test(value)) return value;
  return `<p>${value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\r?\n/g, "<br>")}</p>`;
}
function initial(member: MarketingTeamMember | "new"): MarketingTeamInput {
  if (member === "new") return { ...empty };
  return {
    name: member.name,
    role: member.role,
    biography: biographyHtml(member.biography),
    excerpt: member.excerpt,
    photoUrl: member.photoUrl,
    photoAlt: member.photoAlt,
    status: member.status,
  };
}
function photoUrl(value: string) {
  try {
    const url = new URL(value, "https://www.p1landmanagement.com");
    return value &&
      url.origin === "https://www.p1landmanagement.com" &&
      !url.username &&
      !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}
function TeamEditor({
  member,
  canUseMedia,
  onClose,
  onSaved,
}: {
  member: MarketingTeamMember | "new";
  canUseMedia: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState(() => initial(member)),
    [saved, setSaved] = useState(() => initial(member)),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState(""),
    [mediaOpen, setMediaOpen] = useState(false),
    [complete, setComplete] = useState(false);
  const editorDialog = useRef<HTMLDialogElement>(null),
    working = useRef(false),
    dialog = useRef<HTMLDialogElement>(null),
    controller = useRef(new AbortController());
  useEffect(() => {
    const abort = new AbortController();
    controller.current = abort;
    return () => abort.abort();
  }, []);
  useEffect(() => {
    const modal = editorDialog.current;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    modal?.showModal();
    return () => {
      modal?.close();
      if (opener?.isConnected) opener.focus();
    };
  }, []);
  useEffect(() => {
    if (mediaOpen) dialog.current?.showModal();
    else dialog.current?.close();
  }, [mediaOpen]);
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  useCmsUnsavedChanges(dirty || uploading);
  function closeEditor() {
    if (busy || uploading) return;
    if (!dirty || window.confirm("Discard unsaved team member changes?"))
      onClose();
  }
  async function save() {
    if (working.current || busy || uploading || complete) return;
    const signal = controller.current.signal;

    if (form.biography.length > 30000) {
      setError("Biography is limited to 30,000 HTML characters.");
      return;
    }
    if (
      form.status === "published" &&
      saved.status !== "published" &&
      !window.confirm("Publish this member for use in public Team sections?")
    )
      return;
    working.current = true;
    setBusy(true);
    setMediaOpen(false);
    setError("");
    try {
      if (member === "new") await createMarketingTeam(form, { signal });
      else
        await updateMarketingTeam(member.id, form, {
          signal,
        });
      if (signal.aborted) return;
      setSaved(form);
      setComplete(true);
      await onSaved();
      if (!signal.aborted) onClose();
    } catch (error) {
      if (!controller.current.signal.aborted) setError(errorText(error));
    } finally {
      working.current = false;
      if (!signal.aborted) setBusy(false);
    }
  }
  return (
    <>
      <dialog
        ref={editorDialog}
        className="team-editor team-presentation"
        aria-labelledby="team-dialog-title"
        aria-describedby="team-dialog-description"
        onCancel={(event) => {
          event.preventDefault();
          closeEditor();
        }}
      >
        <button
          type="button"
          className="team-dialog-close"
          aria-label="Close team member editor"
          disabled={busy || uploading}
          onClick={closeEditor}
        >
          <X aria-hidden="true" />
        </button>
        <TeamEditorPresentation
          ui={teamUI}
          isNew={member === "new"}
          form={form}
          setForm={setForm}
          busy={busy || uploading}
          disabled={busy || uploading || complete}
          onSave={() => void save()}
          onClose={closeEditor}
          notice={
            <>
              {error && <p role="alert">{error}</p>}
              {complete && (
                <p role="status">
                  Member saved. Reload the list before creating another record.
                </p>
              )}
            </>
          }
          photo={
            <div className="space-y-2">
              <BlogImageInput
                label="Photo"
                value={photoUrl(form.photoUrl) || ""}
                disabled={busy || complete || uploading}
                canUseMedia={canUseMedia}
                onBusy={setUploading}
                onLibrary={() => setMediaOpen(true)}
                onChange={(photoUrl) =>
                  setForm((current) => ({ ...current, photoUrl }))
                }
              />
              <label>
                Photo URL
                <input
                  maxLength={2000}
                  value={form.photoUrl}
                  onChange={(event) =>
                    setForm({ ...form, photoUrl: event.target.value })
                  }
                />
              </label>
            </div>
          }
          biography={
            <CmsRichTextEditor
              value={form.biography}
              disabled={busy || uploading || complete}
              canUseMedia={canUseMedia}
              onChange={(biography) =>
                setForm((current) => ({ ...current, biography }))
              }
            />
          }
        />
      </dialog>
      <dialog
        ref={dialog}
        className="media-picker"
        aria-label="Choose team photo"
        onCancel={() => setMediaOpen(false)}
      >
        <button type="button" onClick={() => setMediaOpen(false)}>
          Close photo picker
        </button>
        {mediaOpen && canUseMedia && (
          <MediaLibrary
            acceptAsset={(asset) => asset.mimeType.startsWith("image/")}
            onSelect={(asset) => {
              setForm({
                ...form,
                photoUrl: asset.url,
                photoAlt: asset.alt || "",
              });
              setMediaOpen(false);
            }}
          />
        )}
      </dialog>
    </>
  );
}
export default function TeamManager({
  canUseMedia = false,
}: {
  canUseMedia?: boolean;
}) {
  const [members, setMembers] = useState<MarketingTeamMember[]>([]),
    [editing, setEditing] = useState<MarketingTeamMember | "new" | null>(null),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const controller = useRef(new AbortController());
  const load = async () => {
    const rows = await listMarketingTeam({ signal: controller.current.signal });
    if (!controller.current.signal.aborted) {
      setMembers(rows);
      setError("");
    }
  };
  useEffect(() => {
    const abort = new AbortController();
    controller.current = abort;
    void load()
      .catch((e) => {
        if (!abort.signal.aborted) setError(errorText(e));
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, []);
  const filtered = members.filter(
    (member) =>
      (status === "all" || member.status === status) &&
      `${member.name} ${member.role}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="team-manager team-presentation">
      <TeamListPresentation<MarketingTeamMember>
        ui={teamUI}
        members={members}
        filtered={filtered}
        search={search}
        status={status}
        onSearch={setSearch}
        onStatus={setStatus}
        onEdit={setEditing}
        isLoading={loading}
        isError={!!error}
        error={error}
        onRetry={() => void load().catch((e) => setError(errorText(e)))}
        imageUrl={photoUrl}
      />
      {editing && (
        <TeamEditor
          key={editing === "new" ? "new" : editing.id}
          member={editing}
          canUseMedia={canUseMedia}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
