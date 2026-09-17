import { useEffect, useRef, useState } from "react";
import {
  listMarketingBlog,
  getMarketingBlog,
  createMarketingBlog,
  updateMarketingBlog,
  deleteMarketingBlog,
  getMarketingBlogReferences,
  listMarketingBlogTaxonomies,
} from "@workspace/api-client-react/dashboard";
import type {
  MarketingBlogInput,
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
export function blogError(e: unknown) {
  const data = (e as { data?: { error?: string; message?: string } }).data;
  return (
    data?.error ||
    data?.message ||
    (e as Error).message ||
    "Blog request failed"
  );
}
const empty: MarketingBlogInput = {
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
function input(post: MarketingBlogPost): MarketingBlogInput {
  const next = { ...empty };
  for (const key of Object.keys(empty) as (keyof MarketingBlogInput)[])
    Object.assign(next, { [key]: post[key] ?? empty[key] });
  if (!next.categories?.length && post.category)
    next.categories = [post.category];
  return next;
}
function localDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : "";
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
  const [form, setForm] = useState<MarketingBlogInput | null>(
      id === "new" ? { ...empty } : null,
    ),
    [saved, setSaved] = useState<MarketingBlogInput | null>(
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
    [mediaField, setMediaField] = useState<
      "coverImageUrl" | "ogImageUrl" | null
    >(null),
    [category, setCategory] = useState(""),
    [tag, setTag] = useState("");
  const abort = useRef(new AbortController()),
    dialog = useRef<HTMLDialogElement>(null);
  const lock = useBlogReservation(id === "new" ? null : id);
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  useCmsUnsavedChanges(dirty);
  useEffect(() => {
    const controller = new AbortController();
    abort.current = controller;
    void Promise.all([
      id === "new"
        ? Promise.resolve(null)
        : getMarketingBlog(id, { signal: controller.signal }),
      getMarketingBlogReferences({ signal: controller.signal }),
      listMarketingBlogTaxonomies({ signal: controller.signal }),
    ])
      .then(([post, references, terms]) => {
        if (controller.signal.aborted) return;
        if (post) {
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
  async function save() {
    if (!form) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await lock.verify();
      if (form.scheduledAt && Date.parse(form.scheduledAt) <= Date.now())
        throw Error("Choose a future publication date.");
      if (
        (form.isPublished || form.scheduledAt) &&
        !window.confirm(
          form.scheduledAt
            ? "Schedule this post for automatic publication?"
            : "Save this post as published?",
        )
      )
        return;
      const payload = {
        ...form,
        category: form.categories?.[0] || null,
        publishedAt: form.isPublished
          ? saved?.publishedAt || new Date().toISOString()
          : null,
        scheduledAt: form.isPublished ? null : form.scheduledAt || null,
      };
      const post =
        id === "new"
          ? await createMarketingBlog(payload, { signal: abort.current.signal })
          : await updateMarketingBlog(id, payload, {
              signal: abort.current.signal,
            });
      setForm(input(post));
      setSaved(input(post));
      setNotice("Post saved.");
      if (id === "new") onCreated(post.id);
    } catch (e) {
      if (!abort.current.signal.aborted) setError(blogError(e));
    } finally {
      if (!abort.current.signal.aborted) setBusy(false);
    }
  }
  const leave = () => {
    if (!dirty || window.confirm("Discard unsaved post changes?")) onClose();
  };
  if (!form)
    return (
      <section>
        {error ? (
          <p role="alert">{error}</p>
        ) : (
          <p role="status">Loading post…</p>
        )}
        <button onClick={onClose}>Back to posts</button>
      </section>
    );
  const update = (key: keyof MarketingBlogInput, value: unknown) =>
    setForm({ ...form, [key]: value });
  const addTerm = (kind: "categories" | "tags", value: string) => {
    const text = value.trim();
    if (
      text &&
      !(form[kind] || []).some((v) => v.toLowerCase() === text.toLowerCase())
    )
      update(kind, [...(form[kind] || []), text]);
  };
  return (
    <section className="blog-editor">
      <button type="button" disabled={busy} onClick={leave}>
        Back to posts
      </button>
      <h2>{id === "new" ? "New blog post" : form.title}</h2>
      <p>
        {status(form)} · {dirty ? "Unsaved changes" : "Saved"}
      </p>
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
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <fieldset disabled={busy || !lock.owned}>
          <legend>Post content</legend>
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
          {form.postType === "podcast" && (
            <label>
              Podcast URL
              <input
                type="url"
                value={form.podcastUrl || ""}
                onChange={(e) => update("podcastUrl", e.target.value || null)}
              />
            </label>
          )}
          {form.postType === "external" && (
            <label>
              External URL
              <input
                type="url"
                value={form.externalUrl || ""}
                onChange={(e) => update("externalUrl", e.target.value || null)}
              />
            </label>
          )}
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
            disabled={busy || !lock.owned}
            value={form.content}
            onChange={(value) => update("content", value)}
            canUseMedia={canUseMedia}
            galleries={refs.galleries}
          />
          <label>
            Cover image URL
            <input
              value={form.coverImageUrl || ""}
              onChange={(e) => update("coverImageUrl", e.target.value || null)}
            />
          </label>
          {canUseMedia && (
            <button
              type="button"
              onClick={() => setMediaField("coverImageUrl")}
            >
              Choose cover image
            </button>
          )}
          {form.coverImageUrl && (
            <img
              className="blog-cover-preview"
              alt="Cover focal point preview"
              src={
                form.coverImageUrl.startsWith("/") &&
                !form.coverImageUrl.startsWith("//")
                  ? `https://www.p1landmanagement.com${form.coverImageUrl}`
                  : form.coverImageUrl
              }
              style={{
                objectPosition: `${form.coverImagePositionX ?? 50}% ${form.coverImagePositionY ?? 50}%`,
              }}
            />
          )}
          <div className="blog-fields">
            {(["coverImagePositionX", "coverImagePositionY"] as const).map(
              (key, i) => (
                <label key={key}>
                  Cover focal point {i ? "Y" : "X"} (%)
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={form[key] ?? 50}
                    onChange={(e) => update(key, Number(e.target.value))}
                  />
                  <output>{form[key] ?? 50}%</output>
                </label>
              ),
            )}
          </div>
          <section>
            <h3>Categories</h3>
            {(form.categories || []).map((name) => (
              <button
                type="button"
                key={name}
                onClick={() =>
                  update(
                    "categories",
                    form.categories?.filter((v) => v !== name),
                  )
                }
              >
                Remove category {name}
              </button>
            ))}
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
          </section>
          <section>
            <h3>Tags</h3>
            {(form.tags || []).map((name) => (
              <button
                type="button"
                key={name}
                onClick={() =>
                  update(
                    "tags",
                    form.tags?.filter((v) => v !== name),
                  )
                }
              >
                Remove tag {name}
              </button>
            ))}
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
          </section>
          <label>
            Sidebar
            <select
              aria-label="Post sidebar"
              value={form.sidebarId || ""}
              onChange={(e) => update("sidebarId", e.target.value || null)}
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
          <section>
            <h3>SEO</h3>
            <label>
              SEO title
              <input
                value={form.seoTitle || ""}
                onChange={(e) => update("seoTitle", e.target.value || null)}
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
            <label>
              Social image URL
              <input
                value={form.ogImageUrl || ""}
                onChange={(e) => update("ogImageUrl", e.target.value || null)}
              />
            </label>
            {canUseMedia && (
              <button type="button" onClick={() => setMediaField("ogImageUrl")}>
                Choose social image
              </button>
            )}
            <label className="blog-check">
              <input
                type="checkbox"
                checked={form.noindex || false}
                onChange={(e) => update("noindex", e.target.checked)}
              />
              Exclude from indexing
            </label>
            <aside aria-label="Search preview">
              <strong>{form.seoTitle || form.title}</strong>
              <p>/blog/{form.slug}</p>
              <p>{form.seoDescription || form.excerpt}</p>
            </aside>
          </section>
          <label>
            Publication
            <select
              aria-label="Publication"
              value={
                form.isPublished
                  ? "published"
                  : form.scheduledAt
                    ? "scheduled"
                    : "draft"
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  isPublished: e.target.value === "published",
                  scheduledAt:
                    e.target.value === "scheduled"
                      ? new Date(Date.now() + 86400000).toISOString()
                      : null,
                })
              }
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </label>
          {form.scheduledAt && (
            <label>
              Scheduled publication (your local time)
              <input
                type="datetime-local"
                required
                value={localDate(form.scheduledAt)}
                onChange={(e) => {
                  if (e.target.value)
                    update(
                      "scheduledAt",
                      new Date(e.target.value).toISOString(),
                    );
                }}
              />
            </label>
          )}
          <button type="submit">Save post</button>
        </fieldset>
      </form>
      {id !== "new" && (
        <button
          type="button"
          disabled={busy || !lock.owned}
          onClick={async () => {
            if (
              !window.confirm("Permanently delete this post and its comments?")
            )
              return;
            setBusy(true);
            try {
              await lock.verify();
              await deleteMarketingBlog(id, { signal: abort.current.signal });
              onClose();
            } catch (e) {
              setError(blogError(e));
              setBusy(false);
            }
          }}
        >
          Delete post
        </button>
      )}
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
  const [posts, setPosts] = useState<MarketingBlogPost[]>([]),
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
      listMarketingBlog({ signal: controller.signal })
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
  return (
    <section className="blog-manager">
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
          {posts
            .filter(
              (p) =>
                `${p.title} ${p.authorName} ${p.slug}`
                  .toLowerCase()
                  .includes(search.toLowerCase()) &&
                (filter === "all" || status(p) === filter),
            )
            .map((post) => (
              <article key={post.id}>
                <h2>{post.title}</h2>
                <p>
                  {post.authorName} · {status(post)}
                  {post.scheduledAt
                    ? ` · ${new Date(post.scheduledAt).toLocaleString()}`
                    : ""}
                </p>
                <button onClick={() => select(post.id)}>
                  Edit {post.title}
                </button>
              </article>
            ))}
          {!posts.length && <p>No posts yet.</p>}
        </div>
      )}
    </section>
  );
}

export default function BlogManager({ canUseMedia }: { canUseMedia: boolean }) {
  const [tab, setTab] = useState("Posts");
  return (
    <div className="blog-manager">
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
                )
                  setTab(name);
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
