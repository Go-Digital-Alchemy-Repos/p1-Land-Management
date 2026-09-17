import { useEffect, useRef, useState } from "react";
import {
  getMarketingSeo,
  saveMarketingSeo,
  getMarketingRobots,
  saveMarketingRobots,
  getMarketingSeoAudit,
  listMarketingRedirects,
  createMarketingRedirect,
  updateMarketingRedirect,
  deleteMarketingRedirect,
} from "@workspace/api-client-react/dashboard";
import type {
  MarketingSeoSettings,
  MarketingRobots,
  MarketingSeoAudit,
  MarketingRedirect,
  MarketingRedirectInput,
} from "../../../../lib/api-client-react/src/dashboard/models";
import { useCmsUnsavedChanges } from "./useCmsUnsavedChanges";
import { MediaLibrary } from "./MediaLibrary";
import "./seo-manager.css";
const errorMessage = (e: unknown) =>
  (e as { data?: { error?: string; message?: string } }).data?.error ||
  (e as { data?: { message?: string } }).data?.message ||
  (e as Error).message ||
  "Request failed";
const fields: [keyof MarketingSeoSettings, string][] = [
  ["siteName", "Site name"],
  ["titleSuffix", "Title suffix"],
  ["defaultMetaDescription", "Default meta description"],
  ["siteUrl", "Site URL"],
  ["defaultOgImageUrl", "Default social image URL"],
  ["organizationName", "Organization name"],
  ["organizationLogoUrl", "Organization logo URL"],
  ["facebookUrl", "Facebook URL"],
  ["twitterHandle", "Twitter / X handle"],
  ["linkedinUrl", "LinkedIn URL"],
  ["instagramUrl", "Instagram URL"],
];
function Defaults({ canUseMedia }: { canUseMedia: boolean }) {
  const [draft, setDraft] = useState<MarketingSeoSettings | null>(null),
    [saved, setSaved] = useState<MarketingSeoSettings | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [imageField, setImageField] = useState<
      "defaultOgImageUrl" | "organizationLogoUrl" | null
    >(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useCmsUnsavedChanges(JSON.stringify(draft) !== JSON.stringify(saved));
  useEffect(() => {
    const c = new AbortController();
    getMarketingSeo({ signal: c.signal })
      .then((r) => {
        const value = Object.fromEntries(
          fields.map(([key]) => [key, r[key] ?? ""]),
        );
        const next = {
          ...value,
          defaultRobotsNoindex: r.defaultRobotsNoindex ?? false,
        };
        setDraft(next);
        setSaved(next);
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(errorMessage(e));
      });
    return () => c.abort();
  }, []);
  useEffect(() => {
    if (imageField) dialog.current?.showModal();
    else dialog.current?.close();
  }, [imageField]);
  return (
    <section>
      <h2>Site SEO defaults</h2>
      <p>
        These are the retained website defaults. Primary P1 page titles and
        descriptions are edited and published in Website.
      </p>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {draft ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              draft.defaultRobotsNoindex &&
              !saved?.defaultRobotsNoindex &&
              !confirm(
                "Disable indexing through the website's global SEO defaults?",
              )
            )
              return;
            setBusy(true);
            setError("");
            setNotice("");
            try {
              const result = await saveMarketingSeo(draft);
              const next = Object.fromEntries(
                Object.keys(draft).map((key) => [
                  key,
                  result[key as keyof MarketingSeoSettings] ??
                    draft[key as keyof MarketingSeoSettings],
                ]),
              );
              setDraft(next);
              setSaved(next);
              setNotice("SEO defaults saved.");
            } catch (e) {
              setError(errorMessage(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <fieldset disabled={busy}>
            {fields.map(([key, label]) => (
              <label key={key}>
                {label}
                {key === "defaultMetaDescription" ? (
                  <textarea
                    maxLength={320}
                    value={String(draft[key] ?? "")}
                    onChange={(e) =>
                      setDraft({ ...draft, [key]: e.target.value })
                    }
                  />
                ) : (
                  <input
                    required={key === "siteName"}
                    type={
                      [
                        "siteUrl",
                        "facebookUrl",
                        "linkedinUrl",
                        "instagramUrl",
                      ].includes(key)
                        ? "url"
                        : "text"
                    }
                    value={String(draft[key] ?? "")}
                    onChange={(e) =>
                      setDraft({ ...draft, [key]: e.target.value })
                    }
                  />
                )}
                {canUseMedia &&
                  (key === "defaultOgImageUrl" ||
                    key === "organizationLogoUrl") && (
                    <button type="button" onClick={() => setImageField(key)}>
                      Choose{" "}
                      {key === "defaultOgImageUrl"
                        ? "social image"
                        : "organization logo"}
                    </button>
                  )}
              </label>
            ))}
            <label className="seo-check">
              <input
                type="checkbox"
                checked={Boolean(draft.defaultRobotsNoindex)}
                onChange={(e) =>
                  setDraft({ ...draft, defaultRobotsNoindex: e.target.checked })
                }
              />
              Disable indexing globally
            </label>
            <button>Save SEO defaults</button>
          </fieldset>
        </form>
      ) : (
        !error && <p role="status">Loading defaults…</p>
      )}
      {canUseMedia && (
        <dialog ref={dialog} onCancel={() => setImageField(null)}>
          <button onClick={() => setImageField(null)}>
            Close image picker
          </button>
          {imageField && (
            <MediaLibrary
              acceptAsset={(asset) => asset.mimeType.startsWith("image/")}
              onSelect={(media) => {
                setDraft((current) => ({
                  ...current,
                  [imageField]: media.url,
                }));
                setImageField(null);
              }}
            />
          )}
        </dialog>
      )}
    </section>
  );
}
function Robots() {
  const [data, setData] = useState<MarketingRobots | null>(null),
    [draft, setDraft] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  useCmsUnsavedChanges(Boolean(data) && draft !== (data?.customContent ?? ""));
  useEffect(() => {
    const c = new AbortController();
    getMarketingRobots({ signal: c.signal })
      .then((r) => {
        setData(r);
        setDraft(r.customContent ?? "");
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(errorMessage(e));
      });
    return () => c.abort();
  }, []);
  async function save(customContent: string | null) {
    if (
      !confirm(
        customContent
          ? "Apply this custom robots.txt content?"
          : "Restore generated robots.txt content?",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const next = await saveMarketingRobots({ customContent });
      setData(next);
      setDraft(next.customContent ?? "");
      setNotice("Robots settings saved.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <h2>Sitemap and robots</h2>
      <p>
        The public sitemap is generated from the website's published routes.
        Generic CMS audit records below are a separate source and are not a
        prediction of that sitemap.
      </p>
      <p>
        <a
          href="https://www.p1landmanagement.com/sitemap.xml"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open public sitemap
        </a>{" "}
        ·{" "}
        <a
          href="https://www.p1landmanagement.com/robots.txt"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open public robots.txt
        </a>
      </p>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {data ? (
        <>
          <h3>Effective robots content</h3>
          <pre>{data.effectiveContent}</pre>
          <details>
            <summary>Generated default</summary>
            <pre>{data.generatedContent}</pre>
          </details>
          <label>
            Custom robots.txt
            <textarea
              disabled={busy}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={12}
            />
          </label>
          <p>Leave blank to use the generated default.</p>
          <button
            disabled={busy}
            onClick={() => save(draft.trim() ? draft : null)}
          >
            Save robots content
          </button>
          <button
            disabled={busy || data.customContent === null}
            onClick={() => save(null)}
          >
            Restore generated default
          </button>
        </>
      ) : (
        !error && <p role="status">Loading robots settings…</p>
      )}
    </section>
  );
}
const blank: MarketingRedirectInput = {
  fromPath: "",
  toPath: "",
  statusCode: 301,
  isActive: true,
  note: "",
};
function Redirects() {
  const [rows, setRows] = useState<MarketingRedirect[]>([]),
    [draft, setDraft] = useState(blank),
    [saved, setSaved] = useState(blank),
    [id, setId] = useState<string | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState("");
  useCmsUnsavedChanges(JSON.stringify(draft) !== JSON.stringify(saved));
  useEffect(() => {
    const c = new AbortController();
    listMarketingRedirects({ signal: c.signal })
      .then(setRows)
      .catch((e) => {
        if (!c.signal.aborted) setError(errorMessage(e));
      });
    return () => c.abort();
  }, []);
  function select(row?: MarketingRedirect) {
    if (
      JSON.stringify(draft) !== JSON.stringify(saved) &&
      !confirm("Discard redirect changes?")
    )
      return;
    setId(row?.id || null);
    const next = row
      ? {
          fromPath: row.fromPath,
          toPath: row.toPath,
          statusCode: row.statusCode,
          isActive: row.isActive,
          note: row.note,
        }
      : blank;
    setDraft(next);
    setSaved(next);
    setError("");
  }
  return (
    <section>
      <h2>Redirects</h2>
      {error && <p role="alert">{error}</p>}
      <label>
        Search redirects
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <button disabled={busy} onClick={() => select()}>
        New redirect
      </button>
      <div className="seo-list">
        {rows
          .filter((r) =>
            `${r.fromPath} ${r.toPath} ${r.note}`
              .toLowerCase()
              .includes(search.toLowerCase()),
          )
          .map((row) => (
            <article key={row.id}>
              <p>
                {row.fromPath} → {row.toPath}
              </p>
              <p>
                {row.statusCode} · {row.isActive ? "Active" : "Inactive"}
              </p>
              <button disabled={busy} onClick={() => select(row)}>
                Edit {row.fromPath}
              </button>
            </article>
          ))}
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const row = id
              ? await updateMarketingRedirect(id, draft)
              : await createMarketingRedirect(draft);
            setRows((current) =>
              id
                ? current.map((r) => (r.id === id ? row : r))
                : [...current, row],
            );
            setId(row.id);
            setDraft(row);
            setSaved(row);
          } catch (e) {
            setError(errorMessage(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy}>
          <legend>{id ? "Edit redirect" : "New redirect"}</legend>
          <label>
            From path
            <input
              required
              pattern="/.*"
              value={draft.fromPath}
              onChange={(e) => setDraft({ ...draft, fromPath: e.target.value })}
            />
          </label>
          <label>
            Destination
            <input
              required
              value={draft.toPath}
              onChange={(e) => setDraft({ ...draft, toPath: e.target.value })}
            />
          </label>
          <label>
            Status code
            <select
              aria-label="Status code"
              value={draft.statusCode}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  statusCode: Number(e.target.value) as 301 | 302,
                })
              }
            >
              <option value="301">301 — Permanent</option>
              <option value="302">302 — Temporary</option>
            </select>
          </label>
          <label className="seo-check">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(e) =>
                setDraft({ ...draft, isActive: e.target.checked })
              }
            />
            Active
          </label>
          <label>
            Note
            <textarea
              value={draft.note || ""}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            />
          </label>
          <button>Save redirect</button>
          {id && (
            <button
              type="button"
              onClick={async () => {
                if (!confirm("Delete this redirect?")) return;
                setBusy(true);
                try {
                  await deleteMarketingRedirect(id);
                  setRows((rows) => rows.filter((r) => r.id !== id));
                  setId(null);
                  setDraft(blank);
                  setSaved(blank);
                } catch (e) {
                  setError(errorMessage(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Delete redirect
            </button>
          )}
        </fieldset>
      </form>
    </section>
  );
}
function Audit() {
  const [data, setData] = useState<MarketingSeoAudit | null>(null),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    setError("");
    setData(null);
    getMarketingSeoAudit({ signal: c.signal })
      .then(setData)
      .catch((e) => {
        if (!c.signal.aborted) setError(errorMessage(e));
      });
    return () => c.abort();
  }, [version]);
  return (
    <section>
      <h2>CMS SEO audit</h2>
      <p>
        Checks metadata in retained CMS pages, Blog posts and Events. Primary P1
        page metadata is maintained in Website. Content editing requires its
        separate tool permission.
      </p>
      <button onClick={() => setVersion((v) => v + 1)}>Run audit again</button>
      {error && <p role="alert">{error}</p>}
      {data
        ? (["pages", "posts", "events"] as const).map((group) => (
            <section key={group}>
              <h3>{group}</h3>
              <div className="seo-list">
                {data[group].map((row) => (
                  <article key={row.id}>
                    <h4>{row.title}</h4>
                    <p>{row.slug}</p>
                    <p>
                      {row.issues.length
                        ? row.issues
                            .map((issue) => issue.replaceAll("_", " "))
                            .join(" · ")
                        : "No metadata issues found"}
                    </p>
                    <dl>
                      {[
                        ["SEO title", row.seoTitle],
                        ["Description", row.seoDescription],
                        ["Canonical URL", row.canonicalUrl],
                        [
                          "Social image",
                          row.ogImageUrl || row.coverImageUrl || row.imageUrl,
                        ],
                      ]
                        .filter(([, value]) => value)
                        .map(([label, value]) => (
                          <div key={label}>
                            <dt>{label}</dt>
                            <dd>{value}</dd>
                          </div>
                        ))}
                    </dl>
                  </article>
                ))}
              </div>
              {!data[group].length && <p>No records.</p>}
            </section>
          ))
        : !error && <p role="status">Running audit…</p>}
    </section>
  );
}
export default function SeoManager({ canUseMedia }: { canUseMedia: boolean }) {
  const [tab, setTab] = useState("Defaults");
  return (
    <div className="seo-manager">
      <nav aria-label="SEO tools">
        {["Defaults", "Sitemap and robots", "Redirects", "Audit"].map(
          (name) => (
            <button
              key={name}
              aria-current={name === tab ? "page" : undefined}
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
      {tab === "Defaults" ? (
        <Defaults canUseMedia={canUseMedia} />
      ) : tab === "Sitemap and robots" ? (
        <Robots />
      ) : tab === "Redirects" ? (
        <Redirects />
      ) : (
        <Audit />
      )}
    </div>
  );
}
