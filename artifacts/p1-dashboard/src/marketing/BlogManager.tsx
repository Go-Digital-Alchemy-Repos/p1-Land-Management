import { validateBlogCoverImageSet } from "../../../../platform/p1-core/shared/blog-cover-image-set";
import {
  BlogPresentationEditor,
  alignPresentationTitle,
} from "../../../../platform/p1-core/client/src/components/shared/blog-presentation-editor";
import { validateBlogPresentation } from "../../../../platform/p1-core/shared/blog-presentation";
import { BlogImageInput } from "./BlogImageInput";
import { BlogPostCard } from "../../../../platform/p1-core/client/src/components/shared/blog-list-presentation";
import {
  BlogEditorTabs,
  BlogEditorCard,
  BlogEditorHeader,
  BlogTaxonomyPicker,
} from "../../../../platform/p1-core/client/src/components/shared/blog-editor-presentation";
import { SeoPreview } from "../../../../platform/p1-core/client/src/components/shared/seo-preview";
import { StructuredDataStatus } from "../../../../platform/p1-core/client/src/components/shared/structured-data-status";
import { ImagePositionPicker } from "../../../../platform/p1-core/client/src/features/admin/cms/builder/image-position-picker-workspace";
import { builderPrimitives } from "./builder-primitives";
import { useEffect, useRef, useState } from "react";
import {
  listMarketingBlogPublications,
  getMarketingBlogPublication,
  createMarketingBlogPublication,
  adoptMarketingBlogPublication,
  mutateMarketingBlogPublication,
  listMarketingBlogRevisions,
  getMarketingBlogPreview,
  releaseMarketingBlogReservation,
  getMarketingBlogReferences,
  listMarketingBlogTaxonomies,
} from "@workspace/api-client-react/dashboard";
import type {
  MarketingBlogInput,
  MarketingBlogEditorial,
  MarketingBlogPublicationPost,
  MarketingBlogPublicationActionAction,
  MarketingBlogRevision,
  MarketingBlogPreview,
  MarketingBlogPost,
  MarketingBlogReferences,
  MarketingBlogTaxonomy,
} from "../../../../lib/api-client-react/src/dashboard/models";
import { CmsRichTextEditor } from "./CmsRichTextEditor";
import { MediaLibrary } from "./MediaLibrary";
import { useCmsUnsavedChanges } from "./useCmsUnsavedChanges";
import { useBlogReservation } from "./useBlogReservation";
import "./blog-manager.css";
import {
  BlogTaxonomies,
  BlogComments,
  BlogCommentSettings,
} from "./BlogSettings";
function BlogCheckbox({
  checked,
  onCheckedChange,
  ...props
}: {
  id?: string;
  disabled?: boolean;
  "aria-label"?: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <input
      {...props}
      type="checkbox"
      checked={checked}
      onChange={(event) => onCheckedChange(event.target.checked)}
    />
  );
}
const PublicationButton = builderPrimitives.Button;
const blogTaxonomyPrimitives = { ...builderPrimitives, Checkbox: BlogCheckbox };
export function blogError(e: unknown) {
  const data = (e as { data?: { error?: string; message?: string } }).data;
  return (
    data?.error ||
    data?.message ||
    (e as Error).message ||
    "Blog request failed"
  );
}
type BlogForm = MarketingBlogInput &
  Pick<MarketingBlogEditorial, "presentation" | "coverImageSet">;
const empty: BlogForm = {
  title: "",
  slug: "",
  content: "",
  authorName: "",
  excerpt: "",
  coverImageUrl: null,
  coverImagePositionX: 50,
  coverImagePositionY: 50,
  category: null,
  categories: [],
  tags: [],
  postType: "article",
  podcastUrl: null,
  externalUrl: null,
  sidebarId: null,
  isPublished: false,
  scheduledAt: null,
  publishedAt: null,
  seoTitle: null,
  seoDescription: null,
  ogImageUrl: null,
  noindex: false,
};
function input(post: MarketingBlogPublicationPost): BlogForm {
  const {
    id: _id,
    createdAt: _created,
    updatedAt: _updated,
    publication: _publication,
    lease: _lease,
    ...draft
  } = post;
  const next: BlogForm = { ...empty, ...draft };
  for (const key of Object.keys(empty) as (keyof MarketingBlogInput)[])
    Object.assign(next, { [key]: post[key] ?? empty[key] });
  if (!next.categories?.length && post.category)
    next.categories = [post.category];
  return next;
}
function editorial(form: BlogForm): MarketingBlogEditorial {
  const {
    isPublished: _published,
    publishedAt: _date,
    scheduledAt: _schedule,
    ...data
  } = form;
  const presentation = alignPresentationTitle(form.presentation, form.title);
  if (
    form.coverImageSet != null &&
    !validateBlogCoverImageSet(form.coverImageSet, form.coverImageUrl || null)
  )
    throw Object.assign(
      Error(
        "The reviewed cover image set does not match this cover. Select a new cover to clear it, or reload. Your draft is retained.",
      ),
      { status: 400 },
    );
  if (
    presentation != null &&
    !validateBlogPresentation(presentation, form.title)
  )
    throw Object.assign(
      Error(
        "This post contains unsupported presentation metadata. Check the headline and declared dates; modification must not precede publication. Your draft is retained.",
      ),
      { status: 400 },
    );
  return {
    ...data,
    ...(presentation !== undefined ? { presentation } : {}),
    category: form.categories?.[0] || null,
  } as MarketingBlogEditorial;
}
function status(post: MarketingBlogInput) {
  return post.isPublished
    ? "Published"
    : post.scheduledAt
      ? "Scheduled"
      : "Draft";
}
function PostEditor({
  id,
  canUseMedia,
  onClose,
  onCreated,
}: {
  id: string;
  canUseMedia: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [form, setForm] = useState<BlogForm | null>(
      id === "new" ? { ...empty } : null,
    ),
    [saved, setSaved] = useState<BlogForm | null>(
      id === "new" ? { ...empty } : null,
    ),
    [refs, setRefs] = useState<MarketingBlogReferences>({
      sidebars: [],
      galleries: [],
    }),
    [taxonomies, setTaxonomies] = useState<MarketingBlogTaxonomy[]>([]),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [mediaField, setMediaField] = useState<
      "coverImageUrl" | "ogImageUrl" | null
    >(null),
    [category, setCategory] = useState(""),
    [tag, setTag] = useState("");
  const abort = useRef(new AbortController()),
    dialog = useRef<HTMLDialogElement>(null);
  const [publicationPost, setPublicationPost] =
    useState<MarketingBlogPublicationPost | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [reason, setReason] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [revisions, setRevisions] = useState<MarketingBlogRevision[]>([]);
  const [preview, setPreview] = useState<MarketingBlogPreview | null>(null);
  const requiresAdoption =
    publicationPost?.publication.requiresAdoption === true;
  const lock = useBlogReservation(
    id === "new" || !publicationPost || requiresAdoption ? null : id,
  );
  const unavailable =
    busy || uploading || blocked || requiresAdoption || !lock.owned;
  async function accept(post: MarketingBlogPublicationPost) {
    // Create/adopt grants a lease to the requesting instance. Release it before
    // the editor changes identity and acquires its normal mounted lease.
    if (post.lease?.ownedByCurrentEditor && post.lease.lock) {
      await releaseMarketingBlogReservation(post.id, {
        editorInstanceId: lock.editorInstanceId,
        leaseId: post.lease.lock.id,
      });
    }
    if (abort.current.signal.aborted) return;
    setPublicationPost(post);
    setForm(input(post));
    setSaved(input(post));
    setBlocked(false);
  }
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  useCmsUnsavedChanges(dirty || uploading || busy);
  useEffect(() => {
    const controller = new AbortController();
    abort.current = controller;
    void Promise.all([
      id === "new"
        ? Promise.resolve(null)
        : getMarketingBlogPublication(id, { signal: controller.signal }),
      getMarketingBlogReferences({ signal: controller.signal }),
      listMarketingBlogTaxonomies({ signal: controller.signal }),
    ])
      .then(([post, references, terms]) => {
        if (controller.signal.aborted) return;
        if (post) {
          setPublicationPost(post);
          setForm(input(post));
          setSaved(input(post));
        }
        setRefs(references);
        setTaxonomies(terms);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(blogError(e));
      });
    return () => controller.abort();
  }, [id]);
  useEffect(() => {
    if (mediaField) dialog.current?.showModal();
    else dialog.current?.close();
  }, [mediaField]);
  async function save(
    action: MarketingBlogPublicationActionAction = "save",
    revisionId?: string,
  ) {
    if (!form || unavailable) return;
    if (
      action !== "save" &&
      !window.confirm(
        action === "schedule"
          ? "Schedule the current saved revision? Later draft saves will not change this schedule. Unsaved edits are not included."
          : action === "restore"
            ? "Discard unsaved changes and restore this revision to the draft? Public content is unchanged."
            : action === "delete"
              ? "Delete this post and discard unsaved changes?"
              : `${action === "publish" ? "Save and publish the entered content" : action + " this post"}?`,
      )
    )
      return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      let post: MarketingBlogPublicationPost;
      if (id === "new") {
        post = await createMarketingBlogPublication(
          {
            data: editorial(form),
            editorInstanceId: lock.editorInstanceId,
          },
          { signal: abort.current.signal },
        );
      } else {
        if (!publicationPost?.publication.version)
          throw Error("Adopt this legacy post before editing.");
        const proof = await lock.preconditions(
          publicationPost.publication.version,
        );
        if (
          action === "schedule" &&
          (!scheduleDate || Date.parse(scheduleDate) <= Date.now())
        )
          throw Object.assign(Error("Choose a future publication date."), {
            status: 400,
          });
        post = await mutateMarketingBlogPublication(
          id,
          {
            ...proof,
            action,
            ...(action === "save" || action === "publish"
              ? { data: editorial(form) }
              : {}),
            ...(revisionId ? { revisionId } : {}),
            ...(action === "schedule"
              ? { scheduledAt: new Date(scheduleDate).toISOString() }
              : {}),
          },
          { signal: abort.current.signal },
        );
      }
      if (abort.current.signal.aborted) return;
      if (action === "delete") {
        onClose();
        return;
      }
      // Status-only actions must not erase entered editorial changes.
      if (["schedule", "cancel_schedule", "unpublish"].includes(action))
        setPublicationPost(post);
      else await accept(post);
      setRevisions([]);
      setPreview(null);
      setNotice(
        action === "save"
          ? "Draft saved. Public content is unchanged."
          : "Publication action completed.",
      );
      if (id === "new") onCreated(post.id);
    } catch (e) {
      if (!abort.current.signal.aborted) {
        setError(blogError(e));
        setBlocked(
          ![400, 413, 422].includes(Number((e as { status?: number }).status)),
        );
      }
    } finally {
      if (!abort.current.signal.aborted) setBusy(false);
    }
  }
  async function adopt() {
    if (!publicationPost || !reason.trim() || busy) return;
    if (
      !window.confirm(
        "Adopt this legacy post as an unpublished editorial draft? This does not publish it.",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const post = await adoptMarketingBlogPublication(
        id,
        {
          expectedLegacyFingerprint:
            publicationPost.publication.legacyFingerprint,
          editorInstanceId: lock.editorInstanceId,
          reason: reason.trim(),
        },
        { signal: abort.current.signal },
      );
      await accept(post);
    } catch (e) {
      if (!abort.current.signal.aborted) {
        setError(blogError(e));
        setBlocked(
          ![400, 413, 422].includes(Number((e as { status?: number }).status)),
        );
      }
    } finally {
      if (!abort.current.signal.aborted) setBusy(false);
    }
  }
  async function reload() {
    if (
      busy ||
      uploading ||
      (dirty &&
        !window.confirm(
          "Discard entered changes and load the latest saved draft?",
        ))
    )
      return;
    if (id === "new") {
      setError(
        "Creation may have succeeded. Return to the post list to verify before creating again.",
      );
      return;
    }
    setBusy(true);
    try {
      await accept(
        await getMarketingBlogPublication(id, { signal: abort.current.signal }),
      );
      setError("");
    } catch (e) {
      if (!abort.current.signal.aborted) setError(blogError(e));
    } finally {
      if (!abort.current.signal.aborted) setBusy(false);
    }
  }
  const leave = () => {
    if (uploading || busy) return;
    if (!dirty || window.confirm("Discard unsaved post changes?")) onClose();
  };
  if (!form)
    return (
      <section>
        <h1>Blog</h1>
        {error ? (
          <p role="alert">{error}</p>
        ) : (
          <p role="status">Loading post…</p>
        )}
        <button onClick={onClose}>Back to posts</button>
      </section>
    );
  const update = (key: keyof BlogForm, value: unknown) =>
    setForm({
      ...form,
      [key]: value,
      ...(key === "coverImageUrl" &&
      value !== form.coverImageUrl &&
      form.coverImageSet !== undefined
        ? { coverImageSet: null }
        : {}),
    });
  const addTerm = (kind: "categories" | "tags", value: string) => {
    const text = value.trim();
    if (
      text &&
      !(form[kind] || []).some((v) => v.toLowerCase() === text.toLowerCase())
    )
      update(kind, [...(form[kind] || []), text]);
  };
  return (
    <section className="blog-editor blog-presentation">
      <BlogEditorHeader
        back={
          <button type="button" disabled={busy || uploading} onClick={leave}>
            Blog
          </button>
        }
        title={id === "new" ? "New Post" : form.title || "Edit Post"}
        status={
          <span>{publicationPost?.publication.visibility || "Draft"}</span>
        }
        actions={
          <>
            <span>{dirty ? "Unsaved changes" : "Saved"}</span>
            <button
              type="submit"
              form="native-blog-form"
              disabled={unavailable}
            >
              {busy ? "Saving…" : "Save Post"}
            </button>
          </>
        }
      />
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!lock.owned && (
        <p role="alert">
          {lock.error ||
            `Post editing is reserved${lock.holder ? ` by ${lock.holder}` : ""}.`}{" "}
          Your draft is retained.{" "}
          <button type="button" onClick={() => void lock.acquire()}>
            Check reservation
          </button>
        </p>
      )}
      <form
        id="native-blog-form"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <fieldset disabled={unavailable} inert={unavailable ? true : undefined}>
          <BlogEditorTabs
            ui={builderPrimitives}
            postType={
              <>
                {" "}
                <label>
                  Post type
                  <select
                    aria-label="Post type"
                    value={form.postType || "article"}
                    onChange={(e) => update("postType", e.target.value)}
                  >
                    <option value="article">Article</option>
                    <option value="podcast">Podcast</option>
                    <option value="external">External link</option>
                  </select>
                </label>
              </>
            }
            content={
              <div className="blog-content-cards">
                <BlogEditorCard ui={builderPrimitives} title="Post Details">
                  <label>
                    Title
                    <input
                      required
                      value={form.title}
                      onChange={(e) => {
                        const title = e.target.value;
                        setForm({
                          ...form,
                          title,
                          ...(id === "new" &&
                          (!form.slug ||
                            form.slug ===
                              form.title
                                .toLowerCase()
                                .replace(/[^a-z0-9]+/g, "-")
                                .replace(/^-|-$/g, ""))
                            ? {
                                slug: title
                                  .toLowerCase()
                                  .replace(/[^a-z0-9]+/g, "-")
                                  .replace(/^-|-$/g, ""),
                              }
                            : {}),
                        });
                      }}
                    />
                  </label>
                  <label>
                    Slug
                    <input
                      required
                      maxLength={255}
                      value={form.slug}
                      onChange={(e) => update("slug", e.target.value)}
                    />
                  </label>
                  <label>
                    Author name
                    <input
                      required
                      value={form.authorName}
                      onChange={(e) => update("authorName", e.target.value)}
                    />
                  </label>
                  {form.postType === "podcast" && (
                    <label>
                      Podcast URL
                      <input
                        type="url"
                        value={form.podcastUrl || ""}
                        onChange={(e) =>
                          update("podcastUrl", e.target.value || null)
                        }
                      />
                    </label>
                  )}
                  {form.postType === "external" && (
                    <label>
                      External URL
                      <input
                        type="url"
                        value={form.externalUrl || ""}
                        onChange={(e) =>
                          update("externalUrl", e.target.value || null)
                        }
                      />
                    </label>
                  )}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <section>
                      <h3>Categories</h3>
                      <BlogTaxonomyPicker
                        ui={blogTaxonomyPrimitives}
                        kind="category"
                        onRemove={(name) =>
                          update(
                            "categories",
                            form.categories?.filter((value) => value !== name),
                          )
                        }
                        selected={form.categories || []}
                        options={taxonomies
                          .filter((term) => term.type === "category")
                          .map((term) => ({
                            id: term.id,
                            name: term.name,
                            nested: !!term.parentId,
                          }))}
                        onChange={(values) => update("categories", values)}
                        add={
                          <>
                            {" "}
                            <label>
                              Add category
                              <input
                                list="blog-categories"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                              />
                            </label>
                            <datalist id="blog-categories">
                              {taxonomies
                                .filter((t) => t.type === "category")
                                .map((t) => (
                                  <option key={t.id} value={t.name} />
                                ))}
                            </datalist>
                            <button
                              type="button"
                              onClick={() => {
                                addTerm("categories", category);
                                setCategory("");
                              }}
                            >
                              Add category
                            </button>
                          </>
                        }
                      />
                    </section>
                    <section>
                      <h3>Tags</h3>
                      <BlogTaxonomyPicker
                        ui={blogTaxonomyPrimitives}
                        kind="tag"
                        onRemove={(name) =>
                          update(
                            "tags",
                            form.tags?.filter((value) => value !== name),
                          )
                        }
                        selected={form.tags || []}
                        options={taxonomies
                          .filter((term) => term.type === "tag")
                          .map((term) => ({
                            id: term.id,
                            name: term.name,
                            nested: !!term.parentId,
                          }))}
                        onChange={(values) => update("tags", values)}
                        add={
                          <>
                            {" "}
                            <label>
                              Add tag
                              <input
                                list="blog-tags"
                                value={tag}
                                onChange={(e) => setTag(e.target.value)}
                              />
                            </label>
                            <datalist id="blog-tags">
                              {taxonomies
                                .filter((t) => t.type === "tag")
                                .map((t) => (
                                  <option key={t.id} value={t.name} />
                                ))}
                            </datalist>
                            <button
                              type="button"
                              onClick={() => {
                                addTerm("tags", tag);
                                setTag("");
                              }}
                            >
                              Add tag
                            </button>
                          </>
                        }
                      />
                    </section>
                  </div>
                </BlogEditorCard>
                <BlogEditorCard ui={builderPrimitives} title="Cover Image">
                  {" "}
                  <label>
                    Cover image URL
                    <input
                      value={form.coverImageUrl || ""}
                      onChange={(e) =>
                        update("coverImageUrl", e.target.value || null)
                      }
                    />
                  </label>
                  <BlogImageInput
                    label="Cover Image"
                    value={form.coverImageUrl || ""}
                    disabled={unavailable}
                    canUseMedia={canUseMedia}
                    onBusy={setUploading}
                    onChange={(url) => update("coverImageUrl", url || null)}
                    onLibrary={() => setMediaField("coverImageUrl")}
                  />
                  {form.coverImageUrl && (
                    <ImagePositionPicker
                      components={builderPrimitives}
                      imageUrl={
                        form.coverImageUrl.startsWith("/") &&
                        !form.coverImageUrl.startsWith("//")
                          ? `https://www.p1landmanagement.com${form.coverImageUrl}`
                          : form.coverImageUrl
                      }
                      positionX={form.coverImagePositionX ?? 50}
                      positionY={form.coverImagePositionY ?? 50}
                      onPositionChange={(x, y) =>
                        setForm({
                          ...form,
                          coverImagePositionX: x,
                          coverImagePositionY: y,
                        })
                      }
                    />
                  )}
                </BlogEditorCard>
                <BlogEditorCard ui={builderPrimitives} title="Content">
                  {" "}
                  <label>
                    Excerpt
                    <textarea
                      value={form.excerpt || ""}
                      onChange={(e) => update("excerpt", e.target.value)}
                    />
                  </label>
                  <CmsRichTextEditor
                    blogMode
                    label="Post content"
                    disabled={unavailable}
                    value={form.content}
                    onChange={(value) => update("content", value)}
                    canUseMedia={canUseMedia}
                    galleries={refs.galleries}
                  />
                  <p>
                    Save keeps editorial changes in a draft. Use the publication
                    actions to change public content.
                  </p>
                </BlogEditorCard>
              </div>
            }
            layout={
              <>
                <BlogPresentationEditor
                  ui={blogTaxonomyPrimitives as any}
                  value={form.presentation}
                  title={form.title}
                  excerpt={form.excerpt || ""}
                  disabled={unavailable}
                  onChange={(value) => update("presentation", value)}
                />
                <section className="blog-card">
                  <h2>Sidebar Layout</h2>
                  <p>
                    Saved sidebar layout selection is retained. Public rendering
                    depends on the site renderer.
                  </p>
                  <p>
                    Use the system-wide default blog sidebar, or choose a
                    specific sidebar for this post.
                  </p>{" "}
                  <label>
                    Sidebar
                    <select
                      aria-label="Post sidebar"
                      value={form.sidebarId || ""}
                      onChange={(e) =>
                        update("sidebarId", e.target.value || null)
                      }
                    >
                      <option value="">Default sidebar</option>
                      {form.sidebarId &&
                        !refs.sidebars.some((s) => s.id === form.sidebarId) && (
                          <option value={form.sidebarId}>
                            Saved sidebar (unavailable)
                          </option>
                        )}
                      {refs.sidebars.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </section>
              </>
            }
            seo={
              <>
                {" "}
                <BlogEditorCard ui={builderPrimitives} title="Search Engine">
                  <label>
                    SEO title
                    <input
                      value={form.seoTitle || ""}
                      onChange={(e) =>
                        update("seoTitle", e.target.value || null)
                      }
                    />
                  </label>
                  <label>
                    SEO description
                    <textarea
                      maxLength={160}
                      value={form.seoDescription || ""}
                      onChange={(e) =>
                        update("seoDescription", e.target.value || null)
                      }
                    />
                  </label>
                  <label className="blog-check">
                    <input
                      type="checkbox"
                      checked={form.noindex || false}
                      onChange={(e) => update("noindex", e.target.checked)}
                    />
                    Exclude from indexing
                  </label>
                </BlogEditorCard>
                <BlogEditorCard ui={builderPrimitives} title="Open Graph">
                  {" "}
                  <label>
                    Social image URL
                    <input
                      value={form.ogImageUrl || ""}
                      onChange={(e) =>
                        update("ogImageUrl", e.target.value || null)
                      }
                    />
                  </label>
                  <BlogImageInput
                    label="Social Image"
                    value={form.ogImageUrl || ""}
                    disabled={unavailable}
                    canUseMedia={canUseMedia}
                    onBusy={setUploading}
                    onChange={(url) => update("ogImageUrl", url || null)}
                    onLibrary={() => setMediaField("ogImageUrl")}
                  />
                </BlogEditorCard>{" "}
                <SeoPreview
                  title={form.seoTitle || form.title}
                  description={form.seoDescription || form.excerpt || ""}
                  url={`https://www.p1landmanagement.com/blog/${form.slug}`}
                  ogImage={form.ogImageUrl || form.coverImageUrl || ""}
                  siteName="P1 Land & Property Management"
                  source="post"
                />
                <p>
                  Search appearance depends on publication and indexing. Private
                  preview uses the saved draft; editorial saves do not publish.
                </p>
                <StructuredDataStatus
                  contentType="post"
                  fields={{
                    hasTitle: !!(form.seoTitle || form.title),
                    hasDescription: !!form.seoDescription,
                    hasImage: !!(form.ogImageUrl || form.coverImageUrl),
                    hasAuthor: !!form.authorName,
                    hasDate: !!form.isPublished,
                    isPublished: !!form.isPublished,
                    noindex: !!form.noindex,
                  }}
                />
              </>
            }
          />
          <button type="submit">Save post</button>
        </fieldset>
      </form>
      <section
        aria-label="Publication actions"
        className="blog-publication-panel"
      >
        <BlogEditorCard ui={builderPrimitives} title="Publication">
          <div className="blog-publication-actions">
            {requiresAdoption && (
              <>
                <p>
                  This legacy post requires explicit adoption before editing.
                  Adoption creates an unpublished draft.
                </p>
                <label>
                  Adoption reason
                  <input
                    value={reason}
                    disabled={busy}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
                <PublicationButton
                  variant="outline"
                  type="button"
                  disabled={busy || blocked || !reason.trim()}
                  onClick={() => void adopt()}
                >
                  Adopt legacy post
                </PublicationButton>
              </>
            )}
            {blocked && (
              <p role="alert">
                The last request could not be confirmed. Your entered changes
                are retained. Verify the saved state before trying another
                write.
              </p>
            )}
            <PublicationButton
              variant="outline"
              type="button"
              disabled={busy || uploading}
              onClick={() => void reload()}
            >
              Reload saved draft
            </PublicationButton>
            {id !== "new" && !requiresAdoption && (
              <>
                <p>
                  Visibility: {publicationPost?.publication.visibility}.
                  Version: {publicationPost?.publication.version}.
                </p>
                <PublicationButton
                  variant="outline"
                  type="button"
                  disabled={unavailable}
                  onClick={() => void save("publish")}
                >
                  Save &amp; Publish
                </PublicationButton>
                <PublicationButton
                  variant="outline"
                  type="button"
                  disabled={unavailable}
                  onClick={() => void save("unpublish")}
                >
                  Unpublish
                </PublicationButton>
                <label>
                  Scheduled publication (your local time)
                  <input
                    type="datetime-local"
                    value={scheduleDate}
                    disabled={unavailable}
                    onChange={(e) => setScheduleDate(e.target.value)}
                  />
                </label>
                <PublicationButton
                  variant="outline"
                  type="button"
                  disabled={unavailable || !scheduleDate}
                  onClick={() => void save("schedule")}
                >
                  Schedule saved revision
                </PublicationButton>
                {publicationPost?.publication.schedule && (
                  <p>
                    Schedule: {publicationPost.publication.schedule.status} —{" "}
                    {new Date(
                      publicationPost.publication.schedule.scheduledAt,
                    ).toLocaleString()}{" "}
                    (revision {publicationPost.publication.schedule.revisionId}
                    ). Later draft saves do not change the pinned revision.{" "}
                    {publicationPost.publication.schedule.failureCode && (
                      <>
                        Failure:{" "}
                        {publicationPost.publication.schedule.failureCode}.
                        Review the draft and explicitly reschedule.
                      </>
                    )}
                  </p>
                )}
                <PublicationButton
                  variant="outline"
                  type="button"
                  disabled={unavailable}
                  onClick={() => void save("cancel_schedule")}
                >
                  Cancel schedule
                </PublicationButton>
                <PublicationButton
                  variant="outline"
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    try {
                      const rows = await listMarketingBlogRevisions(id, {
                        signal: abort.current.signal,
                      });
                      if (!abort.current.signal.aborted) setRevisions(rows);
                    } catch (e) {
                      if (!abort.current.signal.aborted) setError(blogError(e));
                    }
                  }}
                >
                  Revision history
                </PublicationButton>
                <PublicationButton
                  variant="outline"
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    try {
                      const next = await getMarketingBlogPreview(
                        id,
                        undefined,
                        { signal: abort.current.signal },
                      );
                      if (!abort.current.signal.aborted) setPreview(next);
                    } catch (e) {
                      if (!abort.current.signal.aborted) setError(blogError(e));
                    }
                  }}
                >
                  Preview saved draft
                </PublicationButton>
                {preview && (
                  <section
                    aria-label="Private saved preview"
                    className="blog-private-preview"
                  >
                    <h2>{preview.snapshot.title}</h2>
                    <p>
                      Private preview of saved revision {preview.revisionId};
                      unsaved changes are not included.
                    </p>
                    <iframe
                      title="Private blog preview"
                      sandbox=""
                      srcDoc={preview.snapshot.content}
                    />
                  </section>
                )}
                {revisions.map((revision) => (
                  <p className="blog-revision-row" key={revision.id}>
                    Version {revision.version}: {revision.action}{" "}
                    <PublicationButton
                      variant="outline"
                      type="button"
                      disabled={unavailable}
                      onClick={() => void save("restore", revision.id)}
                    >
                      Restore revision {revision.version} to draft
                    </PublicationButton>
                  </p>
                ))}
                <PublicationButton
                  variant="outline"
                  type="button"
                  disabled={unavailable}
                  onClick={() => void save("delete")}
                >
                  Delete post
                </PublicationButton>
              </>
            )}
          </div>
        </BlogEditorCard>
      </section>
      <dialog
        ref={dialog}
        className="media-picker"
        aria-label="Choose post image"
        onCancel={() => setMediaField(null)}
      >
        <button type="button" onClick={() => setMediaField(null)}>
          Close image picker
        </button>
        {mediaField && canUseMedia && (
          <MediaLibrary
            acceptAsset={(asset) => asset.mimeType.startsWith("image/")}
            onSelect={(asset) => {
              update(mediaField, asset.url);
              setMediaField(null);
            }}
          />
        )}
      </dialog>
    </section>
  );
}
function BlogPosts({ canUseMedia = false }: { canUseMedia?: boolean }) {
  const [posts, setPosts] = useState<MarketingBlogPublicationPost[]>([]),
    [editing, setEditing] = useState<string | null>(() =>
      new URLSearchParams(location.search).get("post"),
    ),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    if (!editing) {
      setLoading(true);
      listMarketingBlogPublications({ signal: controller.signal })
        .then(setPosts)
        .catch((e) => {
          if (!controller.signal.aborted) setError(blogError(e));
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }
    return () => controller.abort();
  }, [editing]);
  const select = (id: string | null) => {
    setEditing(id);
    const url = new URL(location.href);
    if (id) url.searchParams.set("post", id);
    else url.searchParams.delete("post");
    history.replaceState(null, "", url.pathname + url.search);
  };
  if (editing)
    return (
      <PostEditor
        key={editing}
        id={editing}
        canUseMedia={canUseMedia}
        onClose={() => select(null)}
        onCreated={select}
      />
    );
  const filtered = posts.filter(
    (p) =>
      `${p.title} ${p.authorName} ${p.slug}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (filter === "all" || status(p) === filter),
  );
  return (
    <section className="blog-manager blog-presentation">
      <h1>Blog</h1>
      <p>
        Manage CMS Blog posts. Primary P1 website pages remain in the Website
        editor.
      </p>
      {error && <p role="alert">{error}</p>}
      <button type="button" onClick={() => select("new")}>
        New post
      </button>
      <div className="blog-fields">
        <label>
          Search posts
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label>
          Filter posts
          <select
            aria-label="Filter posts"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {["all", "Draft", "Published", "Scheduled"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>
      {loading ? (
        <p role="status">Loading posts…</p>
      ) : (
        <div className="blog-list">
          {filtered.map((post) => (
            <BlogPostCard
              key={post.id}
              ui={builderPrimitives}
              post={post}
              category={post.categories?.[0] || post.category}
              displayPath={`CMS post: ${post.slug}`}
              onEdit={() => select(post.id)}
              formatDate={(value) => new Date(value).toLocaleString()}
            />
          ))}
          {!filtered.length && (
            <p>
              {search || filter !== "all"
                ? "No posts match your filters. Try different search terms or filters."
                : "No blog posts yet. Create your first post to start sharing insights."}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

const blogToolTabs = {
  posts: "Posts",
  taxonomy: "Categories and tags",
  comments: "Comments",
  settings: "Comment settings",
} as const;
export default function BlogManager({ canUseMedia }: { canUseMedia: boolean }) {
  const [tab, setTab] = useState<string>(() => {
    const key = new URLSearchParams(location.search).get("tab") || "posts";
    return Object.prototype.hasOwnProperty.call(blogToolTabs, key)
      ? blogToolTabs[key as keyof typeof blogToolTabs] : "Posts";
  });
  return (
    <div className="blog-manager">
      {tab !== "Posts" && <h1>Blog</h1>}
      <nav aria-label="Blog tools">
        {["Posts", "Categories and tags", "Comments", "Comment settings"].map(
          (name) => (
            <button
              key={name}
              aria-current={tab === name ? "page" : undefined}
              onClick={() => {
                if (
                  tab !== name &&
                  window.dispatchEvent(
                    new Event("p1:before-navigation", { cancelable: true }),
                  )
                ) {
                  const url = new URL(location.href);
                  const key = Object.entries(blogToolTabs).find(([, label]) => label === name)![0];
                  if (key === "posts") url.searchParams.delete("tab");
                  else url.searchParams.set("tab", key);
                  history.replaceState(null, "", url.pathname + url.search);
                  setTab(name);
                }
              }}
            >
              {name}
            </button>
          ),
        )}
      </nav>
      {tab === "Posts" ? (
        <BlogPosts canUseMedia={canUseMedia} />
      ) : tab === "Categories and tags" ? (
        <BlogTaxonomies />
      ) : tab === "Comments" ? (
        <BlogComments />
      ) : (
        <BlogCommentSettings />
      )}
    </div>
  );
}
