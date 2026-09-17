import { useState } from "react";
import { createFallbackBlockDef } from "../../../../platform/p1-core/shared/cms-builder/fallback-block";
import type {
  MarketingSection,
  MarketingSectionBuilder,
} from "../../../../lib/api-client-react/src/dashboard/models";
import { BlockFields } from "./BlockFields";
import { SavedSectionLibrary } from "./SavedSectionLibrary";
export function CmsBlockEditor({
  blocks,
  onChange,
  catalog,
  canUseMedia,
  canUseSections = true,
  disabled,
  onNotice,
}: {
  blocks: MarketingSection["blocks"];
  onChange: (blocks: MarketingSection["blocks"]) => void;
  catalog: MarketingSectionBuilder;
  canUseMedia: boolean;
  canUseSections?: boolean;
  disabled: boolean;
  onNotice: (message: string) => void;
}) {
  const [type, setType] = useState("");
  const [showLibrary, setShowLibrary] = useState(false);
  const [insertPosition, setInsertPosition] = useState("end");
  function insertBlocks(additions: MarketingSection["blocks"]) {
    const index =
      insertPosition === "end"
        ? blocks.length
        : Math.max(0, Math.min(blocks.length, Number(insertPosition)));
    onChange([...blocks.slice(0, index), ...additions, ...blocks.slice(index)]);
  }
  function move(index: number, direction: number) {
    const next = [...blocks],
      target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }
  return (
    <fieldset className="cms-block-editor" disabled={disabled}>
      <h3>Content blocks</h3>
      {blocks.map((block, index) => {
        const kind = String(block.type || ""),
          definition = catalog.blocks.find(
            (def) => def.type === (catalog.aliases[kind] || kind),
          ),
          props =
            block.props &&
            typeof block.props === "object" &&
            !Array.isArray(block.props)
              ? (block.props as Record<string, unknown>)
              : {};
        const editorDefinition =
          definition || createFallbackBlockDef(kind || "unknown", props);
        return (
          <article className="section-block" key={String(block.id || index)}>
            <h4>
              {index + 1}. {editorDefinition.label}
            </h4>
            <div className="section-actions">
              <button
                type="button"
                disabled={index === 0}
                aria-label={`Move block ${index + 1} up`}
                onClick={() => move(index, -1)}
              >
                Move up
              </button>
              <button
                type="button"
                disabled={index === blocks.length - 1}
                aria-label={`Move block ${index + 1} down`}
                onClick={() => move(index, 1)}
              >
                Move down
              </button>
              <button
                type="button"
                onClick={() =>
                  onChange([
                    ...blocks.slice(0, index + 1),
                    {
                      ...structuredClone(block),
                      id: crypto.randomUUID(),
                    },
                    ...blocks.slice(index + 1),
                  ])
                }
              >
                Duplicate block
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm("Remove this block?"))
                    onChange(blocks.filter((_, i) => i !== index));
                }}
              >
                Remove block
              </button>
            </div>
            {!definition && (
              <p>
                Compatibility editor: unrecognized nested values remain
                unchanged.
              </p>
            )}
            {
              <details>
                <summary>Edit {editorDefinition.label}</summary>
                <BlockFields
                  fields={editorDefinition.propDefs}
                  values={props}
                  catalog={catalog}
                  canUseMedia={canUseMedia}
                  disabled={disabled}
                  onChange={(next) =>
                    onChange(
                      blocks.map((old, i) =>
                        i === index ? { ...old, props: next } : old,
                      ),
                    )
                  }
                />
              </details>
            }
          </article>
        );
      })}
      <label>
        Insert position
        <select
          aria-label="Insert position"
          value={insertPosition}
          onChange={(event) => setInsertPosition(event.target.value)}
        >
          <option value="end">End of content</option>
          {blocks.map((block, index) => (
            <option key={String(block.id || index)} value={String(index)}>
              Before block {index + 1}: {String(block.type || "Unknown")}
            </option>
          ))}
        </select>
      </label>
      {canUseSections && (
        <>
          <button
            type="button"
            aria-expanded={showLibrary}
            onClick={() => setShowLibrary((value) => !value)}
          >
            {showLibrary ? "Close saved sections" : "Browse saved sections"}
          </button>
        </>
      )}
      {canUseSections && showLibrary && (
        <SavedSectionLibrary
          catalog={catalog}
          disabled={disabled}
          onInsert={(additions, name) => {
            insertBlocks(additions);
            setShowLibrary(false);
            onNotice(
              `Inserted ${additions.length} ${additions.length === 1 ? "block" : "blocks"} from ${name}. Save to keep this copy.`,
            );
          }}
        />
      )}
      <label>
        Add block
        <select
          aria-label="Add block"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">Choose a block</option>
          {catalog.blocks.map((def) => (
            <option key={def.type} value={def.type}>
              {def.category} — {def.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        disabled={!type}
        onClick={() => {
          const def = catalog.blocks.find((row) => row.type === type);
          if (def)
            insertBlocks([
              {
                id: crypto.randomUUID(),
                type,
                props: structuredClone(def.defaultProps),
              },
            ]);
        }}
      >
        Add selected block
      </button>
    </fieldset>
  );
}
