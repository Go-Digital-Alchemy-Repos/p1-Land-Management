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
    [error, setError] = useState(""),
    [mediaOpen, setMediaOpen] = useState(false),
    [complete, setComplete] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null),
    controller = useRef(new AbortController());
  useEffect(() => {
    const abort = new AbortController();
    controller.current = abort;
    return () => abort.abort();
  }, []);
  useEffect(() => {
    if (mediaOpen) dialog.current?.showModal();
    else dialog.current?.close();
  }, [mediaOpen]);
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  useCmsUnsavedChanges(dirty);
  async function save() {
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
    setBusy(true);
    setError("");
    try {
      if (member === "new")
        await createMarketingTeam(form, { signal: controller.current.signal });
      else
        await updateMarketingTeam(member.id, form, {
          signal: controller.current.signal,
        });
      setSaved(form);
      setComplete(true);
      await onSaved();
      onClose();
    } catch (error) {
      if (!controller.current.signal.aborted) setError(errorText(error));
    } finally {
      if (!controller.current.signal.aborted) setBusy(false);
    }
  }
  return (
    <section className="team-editor" aria-label="Team member editor">
      <h2>{member === "new" ? "Add team member" : `Edit ${member.name}`}</h2>
      <p>
        Published members are available to CMS Team sections. Archive a member
        to remove them from those sections while keeping their record. Ordering
        is selected within each Team section.
      </p>
      {error && <p role="alert">{error}</p>}
      {complete && (
        <p role="status">
          Member saved. Reload the list before creating another record.
        </p>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <fieldset disabled={busy || complete}>
          <legend>Member details</legend>
          <div className="team-fields">
            <label>
              Name
              <input
                required
                maxLength={160}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              Role / title
              <input
                maxLength={240}
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              />
            </label>
          </div>
          <label>
            Photo URL
            <input
              maxLength={2000}
              value={form.photoUrl}
              onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
            />
          </label>
          {photoUrl(form.photoUrl) && (
            <img
              className="team-photo"
              src={photoUrl(form.photoUrl)}
              alt={form.photoAlt || form.name}
            />
          )}{" "}
          {canUseMedia && (
            <button type="button" onClick={() => setMediaOpen(true)}>
              Choose team photo
            </button>
          )}
          <label>
            Photo description
            <input
              maxLength={300}
              value={form.photoAlt}
              onChange={(e) => setForm({ ...form, photoAlt: e.target.value })}
            />
          </label>
          <label>
            Bio excerpt
            <textarea
              maxLength={1000}
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
            />
          </label>
          <div>
            <h3>Full biography</h3>
            <CmsRichTextEditor
              value={form.biography}
              disabled={busy || complete}
              canUseMedia={canUseMedia}
              onChange={(biography) =>
                setForm((current) => ({ ...current, biography }))
              }
            />
          </div>
          <label>
            Status
            <select
              aria-label="Member status"
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: e.target.value as MarketingTeamInput["status"],
                })
              }
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <button type="submit" disabled={!form.name.trim()}>
            Save member
          </button>
        </fieldset>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (
              !dirty ||
              window.confirm("Discard unsaved team member changes?")
            )
              onClose();
          }}
        >
          Cancel editing
        </button>
      </form>
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
    </section>
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
  if (editing)
    return (
      <TeamEditor
        member={editing}
        canUseMedia={canUseMedia}
        onClose={() => setEditing(null)}
        onSaved={load}
      />
    );
  const filtered = members.filter(
    (member) =>
      (status === "all" || member.status === status) &&
      `${member.name} ${member.role}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="team-manager">
      <p>
        Manage people featured in CMS Team sections. These profiles are separate
        from staff accounts and access permissions.
      </p>
      <button type="button" onClick={() => setEditing("new")}>
        Add team member
      </button>
      {error && (
        <p role="alert">
          {error}
          <button
            type="button"
            onClick={() => void load().catch((e) => setError(errorText(e)))}
          >
            Retry
          </button>
        </p>
      )}
      <div className="team-fields">
        <label>
          Search team members
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label>
          Filter by status
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>
      </div>
      {loading ? (
        <p role="status">Loading team members…</p>
      ) : (
        <div className="team-grid">
          {filtered.map((member) => (
            <article key={member.id}>
              {photoUrl(member.photoUrl) && (
                <img
                  className="team-photo"
                  src={photoUrl(member.photoUrl)}
                  alt={member.photoAlt || member.name}
                />
              )}
              <h2>{member.name}</h2>
              <p>{member.role}</p>
              <p>{member.status}</p>
              <button type="button" onClick={() => setEditing(member)}>
                Edit {member.name}
              </button>
            </article>
          ))}
          {!filtered.length && <p>No matching team members.</p>}
        </div>
      )}
    </div>
  );
}
