import React, { type ReactNode } from "react";
import { BookOpenText, FileText, Layers3, ListTree } from "lucide-react";
import { markdownToExcerpt, type MarkdownHeading } from "../../../../shared/document-markdown";
import "./document-workspace-presentation.css";

export const PREFERRED_DOCUMENT_CATEGORIES = [
  "Getting Started",
  "Admin Guides",
  "Architecture",
  "Architecture Decisions",
  "Operations & Recovery",
  "Deployment & Release",
  "API Reference",
  "Engineering Quality",
  "Security",
  "Product & Planning",
  "Reference",
];
export function sortDocumentCategories(categories: string[]) {
  return [...categories].sort((a, b) => {
    const ai = PREFERRED_DOCUMENT_CATEGORIES.indexOf(a),
      bi = PREFERRED_DOCUMENT_CATEGORIES.indexOf(b);
    return ai < 0 && bi < 0 ? a.localeCompare(b) : ai < 0 ? 1 : bi < 0 ? -1 : ai - bi;
  });
}
export type DocumentPresentationRecord = {
  id: string;
  slug: string;
  title: string;
  category: string;
  content: string;
  isPublished?: boolean | null;
};
export function DocumentWorkspacePresentation<T extends DocumentPresentationRecord>({
  documents,
  visibleDocuments,
  selected,
  category,
  query,
  onQuery,
  onCategory,
  onSelect,
  disabled = false,
  headings,
  reader,
  actions,
  empty,
}: {
  documents: T[];
  visibleDocuments: T[];
  selected?: T | null;
  category: string | null;
  query: string;
  onQuery: (value: string) => void;
  onCategory: (value: string | null) => void;
  onSelect: (doc: T) => void;
  disabled?: boolean;
  headings: MarkdownHeading[];
  reader: ReactNode;
  actions: ReactNode;
  empty?: ReactNode;
}) {
  const categories = sortDocumentCategories([...new Set(documents.map((doc) => doc.category))]);
  return (
    <div className="document-presentation">
      <div className="document-summary">
        {[
          [BookOpenText, "Documents", documents.length],
          [Layers3, "Systems", categories.length],
          [ListTree, "Visible results", visibleDocuments.length],
        ].map(([Icon, label, count]) => {
          const Symbol = Icon as typeof BookOpenText;
          return (
            <div className="document-stat" key={String(label)}>
              <span>
                <Symbol size={17} aria-hidden="true" />
                {String(label)}
              </span>
              <strong data-testid={label === "Documents" ? "text-doc-count" : undefined}>
                {String(count)}
              </strong>
            </div>
          );
        })}
      </div>
      <div className="document-columns">
        <section className="document-panel" aria-label="System Index">
          <header>
            <h2>System Index</h2>
            <label className="document-search">
              Search documents
              <input
                type="search"
                placeholder="Search docs…"
                data-testid="input-search-docs"
                value={query}
                onChange={(event) => onQuery(event.target.value)}
              />
            </label>
          </header>
          <nav className="document-scroll document-categories" aria-label="Document categories">
            <button
              type="button"
              data-testid="button-category-all"
              aria-current={!category ? "true" : undefined}
              onClick={() => onCategory(null)}
            >
              <span>All Systems</span>
              <small>{documents.length}</small>
            </button>
            {categories.map((name) => (
              <button
                type="button"
                key={name}
                data-testid={`button-category-${name.toLowerCase().replace(/\s+/g, "-")}`}
                aria-current={category === name ? "true" : undefined}
                onClick={() => onCategory(name)}
              >
                <span>{name}</span>
                <small>{documents.filter((doc) => doc.category === name).length}</small>
              </button>
            ))}
          </nav>
        </section>
        <section className="document-panel" aria-label="Documents & Indexes">
          <header>
            <h2>Documents &amp; Indexes</h2>
          </header>
          <nav className="document-scroll document-list" aria-label="Documents">
            {visibleDocuments.length ? (
              visibleDocuments.map((doc) => (
                <button
                  type="button"
                  key={doc.id}
                  disabled={disabled}
                  aria-current={selected?.id === doc.id ? "page" : undefined}
                  onClick={() => onSelect(doc)}
                  data-testid={`card-doc-${doc.id}`}
                >
                  <strong>{doc.title}</strong>
                  <div className="document-badges">
                    <span>{doc.category}</span>
                    {doc.slug.startsWith("system-") && <span>Generated</span>}
                    {!doc.isPublished && <span>Draft</span>}
                  </div>
                  <p>{markdownToExcerpt(doc.content)}</p>
                  <FileText size={16} aria-hidden="true" />
                </button>
              ))
            ) : (
              <p className="document-empty">
                No matching documentation. Adjust the filters or refresh repository docs to import
                deployed system documentation.
              </p>
            )}
          </nav>
        </section>
        <section className="document-panel document-reader" aria-label="Selected document">
          {selected ? (
            <>
              <header>
                <div>
                  <h2 data-testid="text-doc-title">{selected.title}</h2>
                  <p>
                    Technical documentation for systems, architecture, modules, and operating
                    workflows.
                  </p>
                  <div className="document-badges">
                    <span>{selected.category}</span>
                    {selected.slug.startsWith("system-") && <span>Generated Index</span>}
                    <span data-testid={selected.isPublished ? "badge-published" : "badge-draft"}>
                      {selected.isPublished ? "Published" : "Draft"}
                    </span>
                    <span>Slug: {selected.slug}</span>
                  </div>
                </div>
                <div className="document-actions">{actions}</div>
              </header>
              <div className="document-reader-columns">
                <div className="document-scroll document-body">{reader}</div>
                <aside className="document-scroll document-outline">
                  <h3>On this page</h3>
                  <nav aria-label="On this page" data-testid="doc-table-of-contents">
                    {headings.length ? (
                      headings.map((heading) => (
                        <a
                          key={heading.id}
                          href={`#${heading.id}`}
                          style={{
                            paddingInlineStart: `${Math.max(0, heading.level - 1) * 10 + 6}px`,
                          }}
                        >
                          {heading.text}
                        </a>
                      ))
                    ) : (
                      <p>No headings found.</p>
                    )}
                  </nav>
                </aside>
              </div>
            </>
          ) : (
            <div className="document-empty">{empty ?? "Select a document to read it here."}</div>
          )}
        </section>
      </div>
    </div>
  );
}
