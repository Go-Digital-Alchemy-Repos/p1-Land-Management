import {
  normalizeButtonActionValue,
  isButtonLinkFieldKey,
  getDynamicPropLabel,
  shouldRenderConditionalField,
  shouldUseRichTextEditor,
} from "../../../../platform/p1-core/shared/cms-builder/editor-fields";
import { useRef, useState, useEffect } from "react";
import type {
  MarketingBuilderProperty,
  MarketingSectionBuilder,
} from "../../../../lib/api-client-react/src/dashboard/models";
import { CmsRichTextEditor } from "./CmsRichTextEditor";
import { MediaLibrary } from "./MediaLibrary";
export function BlockFields({
  fields,
  values,
  onChange,
  catalog,
  canUseMedia,
  disabled = false,
}: {
  fields: MarketingBuilderProperty[];
  values: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  catalog: MarketingSectionBuilder;
  canUseMedia: boolean;
  disabled?: boolean;
}) {
  const [image, setImage] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (image) dialog.current?.showModal();
    else dialog.current?.close();
  }, [image]);
  function change(key: string, value: unknown) {
    if (!disabled) onChange({ ...values, [key]: value });
  }
  return (
    <div className="block-fields">
      {fields
        .filter((field) => shouldRenderConditionalField(field, values))
        .map((original) => {
          const field = {
            ...original,
            label: getDynamicPropLabel(original, values),
          };
          const value = values[field.key],
            text =
              typeof value === "string" || typeof value === "number"
                ? String(value)
                : "";
          if (field.type === "array-items") {
            const rows = Array.isArray(value) ? value : [];
            return (
              <fieldset key={field.key}>
                <legend>{field.label}</legend>
                {rows.map((row, index) => (
                  <article key={index}>
                    <h4>
                      {field.label} {index + 1}
                    </h4>
                    {row && typeof row === "object" && !Array.isArray(row) ? (
                      <BlockFields
                        fields={field.itemSchema || []}
                        values={row}
                        onChange={(next) =>
                          change(
                            field.key,
                            rows.map((old, i) => (i === index ? next : old)),
                          )
                        }
                        catalog={catalog}
                        canUseMedia={canUseMedia}
                        disabled={disabled}
                      />
                    ) : (
                      <p>Saved item is preserved in its original format.</p>
                    )}
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => {
                        const next = [...rows];
                        [next[index - 1], next[index]] = [
                          next[index],
                          next[index - 1],
                        ];
                        change(field.key, next);
                      }}
                    >
                      Move item up
                    </button>
                    <button
                      type="button"
                      disabled={index === rows.length - 1}
                      onClick={() => {
                        const next = [...rows];
                        [next[index + 1], next[index]] = [
                          next[index],
                          next[index + 1],
                        ];
                        change(field.key, next);
                      }}
                    >
                      Move item down
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Remove this item?"))
                          change(
                            field.key,
                            rows.filter((_, i) => i !== index),
                          );
                      }}
                    >
                      Remove item
                    </button>
                  </article>
                ))}
                <button
                  type="button"
                  onClick={() => change(field.key, [...rows, {}])}
                >
                  Add {field.label} item
                </button>
              </fieldset>
            );
          }
          if (field.type === "team-select") {
            const ids = Array.isArray(value)
              ? (value.filter((v) => typeof v === "string") as string[])
              : [];
            return (
              <fieldset key={field.key}>
                <legend>{field.label}</legend>
                {ids.map((id, index) => (
                  <div key={id}>
                    {catalog.team.find((row) => row.id === id)?.name ||
                      `Saved member: ${id}`}
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => {
                        const next = [...ids];
                        [next[index - 1], next[index]] = [
                          next[index],
                          next[index - 1],
                        ];
                        change(field.key, next);
                      }}
                    >
                      Move member up
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        change(
                          field.key,
                          ids.filter((v) => v !== id),
                        )
                      }
                    >
                      Remove member
                    </button>
                  </div>
                ))}
                <select
                  aria-label={`Add ${field.label}`}
                  value=""
                  onChange={(e) => {
                    if (e.target.value)
                      change(field.key, [...ids, e.target.value]);
                  }}
                >
                  <option value="">Choose a team member</option>
                  {catalog.team
                    .filter((row) => !ids.includes(row.id))
                    .map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                </select>
              </fieldset>
            );
          }
          if (shouldUseRichTextEditor(field) && field.type !== "url")
            return (
              <CmsRichTextEditor
                key={field.key}
                label={field.label}
                value={text}
                onChange={(value) => change(field.key, value)}
                canUseMedia={canUseMedia}
                disabled={disabled}
              />
            );
          let options = field.options;
          const actionValue = normalizeButtonActionValue(field.key, values);
          const selectValue = field.key.endsWith("Action") ? actionValue : text;
          if (
            field.type === "url" &&
            isButtonLinkFieldKey(field.key) &&
            actionValue === "internal-link"
          ) {
            options = catalog.pages.map((row) => ({
              label: row.title,
              value: row.slug === "home" || !row.slug ? "/" : `/${row.slug}`,
            }));
          }

          if (field.type === "form-select")
            options = catalog.forms
              .filter((row) => row.kind !== "application")
              .map((row) => ({ label: row.name, value: row.slug }));
          if (field.type === "gallery-select")
            options = catalog.galleries.map((row) => ({
              label: row.title,
              value: row.id,
            }));
          if (field.type === "page-select")
            options = catalog.pages.map((row) => ({
              label: row.title,
              value: row.slug === "home" ? "/" : `/${row.slug}`,
            }));
          return (
            <label
              key={field.key}
              className={field.type === "boolean" ? "section-check" : undefined}
            >
              {field.label}
              {options ? (
                <select
                  aria-label={field.label}
                  value={selectValue}
                  onChange={(e) => change(field.key, e.target.value)}
                >
                  <option value="">Choose…</option>
                  {options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                  {selectValue &&
                    !options.some((option) => option.value === selectValue) && (
                      <option value={selectValue}>
                        Saved value: {selectValue}
                      </option>
                    )}
                </select>
              ) : field.type === "boolean" ? (
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={(e) => change(field.key, e.target.checked)}
                />
              ) : field.type === "textarea" ? (
                <textarea
                  value={text}
                  placeholder={field.placeholder}
                  onChange={(e) => change(field.key, e.target.value)}
                />
              ) : (
                <input
                  type={field.type === "number" ? "number" : "text"}
                  min={field.min}
                  max={field.max}
                  value={text}
                  placeholder={field.placeholder}
                  onChange={(e) =>
                    change(
                      field.key,
                      field.type === "number"
                        ? Number(e.target.value)
                        : e.target.value,
                    )
                  }
                />
              )}
              {field.type === "image-url" && canUseMedia && (
                <button type="button" onClick={() => setImage(field.key)}>
                  Choose {field.label}
                </button>
              )}
            </label>
          );
        })}
      {canUseMedia && (
        <dialog ref={dialog} onCancel={() => setImage(null)}>
          <button type="button" onClick={() => setImage(null)}>
            Close image picker
          </button>
          {image && (
            <MediaLibrary
              acceptAsset={(asset) => asset.mimeType.startsWith("image/")}
              onSelect={(asset) => {
                change(image, asset.url);
                setImage(null);
              }}
            />
          )}
        </dialog>
      )}
    </div>
  );
}
