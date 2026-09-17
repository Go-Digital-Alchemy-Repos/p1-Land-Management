import { useEffect, useState } from "react";
import { listMarketingSections } from "@workspace/api-client-react/dashboard";
import type {
  MarketingSection,
  MarketingSectionBuilder,
} from "../../../../lib/api-client-react/src/dashboard/models";
import {
  cloneSavedSectionBlocks,
  isInsertableSavedSection,
} from "../../../../platform/p1-core/shared/cms-builder/section-library";

export function SavedSectionLibrary({
  onInsert,
  disabled,
  catalog,
}: {
  onInsert: (blocks: MarketingSection["blocks"], name: string) => void;
  disabled: boolean;
  catalog: MarketingSectionBuilder;
}) {
  const [rows, setRows] = useState<MarketingSection[] | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    setRows(null);
    listMarketingSections({ signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setRows(result);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(
            "Saved sections could not be loaded. Your draft is unchanged.",
          );
      });
    return () => controller.abort();
  }, [attempt]);
  const eligible = rows?.filter((row) =>
    isInsertableSavedSection(row, (type) =>
      Boolean(
        catalog.blocks.find(
          (def) => def.type === (catalog.aliases[type] || type),
        )?.isDynamic,
      ),
    ),
  );
  const filtered = eligible?.filter(
    (row) =>
      (!category || (row.category || "general") === category) &&
      row.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  return (
    <section
      className="saved-section-library"
      aria-label="Saved section library"
    >
      <h3>Saved sections</h3>
      <p>
        Insert an independent copy. Later edits will not change the saved
        source.
      </p>
      {error && (
        <>
          <p role="alert">{error}</p>
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Retry saved sections
          </button>
        </>
      )}
      {!rows && !error && <p role="status">Loading saved sections…</p>}
      <label>
        Find saved sections
        <input
          type="search"
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
          }}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <label>
        Saved section category
        <select
          aria-label="Saved section category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="">All categories</option>
          {[...new Set(eligible?.map((row) => row.category || "general"))].map(
            (value) => (
              <option key={value}>{value}</option>
            ),
          )}
        </select>
      </label>
      {filtered?.length === 0 && <p>No saved sections match.</p>}
      {filtered?.map((row) => (
        <article className="section-block" key={row.id}>
          <h4>{row.name}</h4>
          <p>{row.description}</p>
          <p>
            {row.blocks.length} {row.blocks.length === 1 ? "block" : "blocks"} ·{" "}
            {row.category || "general"}
          </p>
          <button
            type="button"
            disabled={disabled || row.blocks.length === 0}
            onClick={() =>
              onInsert(cloneSavedSectionBlocks(row.blocks), row.name)
            }
          >
            Insert {row.name}
          </button>
        </article>
      ))}
    </section>
  );
}
