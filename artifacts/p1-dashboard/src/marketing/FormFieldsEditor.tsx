import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MediaLibrary } from "./MediaLibrary";
type Field = Record<string, unknown>;
const types = [
  "text",
  "textarea",
  "email",
  "tel",
  "website",
  "number",
  "select",
  "multiselect",
  "checkbox",
  "radio",
  "hidden",
  "html",
  "section",
  "page",
  "image-choice",
  "name",
  "date",
  "time",
  "address",
  "consent",
  "list",
];
const choices = ["select", "multiselect", "checkbox", "radio", "image-choice"];
const structural = ["html", "section", "page"];
function record(value: unknown): Field {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Field)
    : {};
}
function records(value: unknown): Field[] {
  return Array.isArray(value) ? value.map(record) : [];
}
type ConfigControl = {
  key: string;
  label: string;
  options?: string[];
  kind?: "boolean" | "number" | "textarea";
};
const configs: Record<string, ConfigControl[]> = {
  name: [
    { key: "nameFormat", label: "Name format", options: ["full", "split"] },
  ],
  section: [
    { key: "sectionTitle", label: "Section title" },
    { key: "sectionSubtitle", label: "Section subtitle" },
    { key: "showDivider", label: "Show divider", kind: "boolean" },
    { key: "dividerColor", label: "Divider color" },
  ],
  html: [{ key: "htmlContent", label: "HTML content", kind: "textarea" }],
  page: [
    { key: "pageTitle", label: "Step title" },
    { key: "pageDescription", label: "Step description", kind: "textarea" },
    { key: "nextButtonText", label: "Next button text" },
    { key: "previousButtonText", label: "Previous button text" },
  ],
  "image-choice": [
    {
      key: "selectionMode",
      label: "Selection mode",
      options: ["single", "multiple"],
    },
  ],
  consent: [
    { key: "consentCheckboxLabel", label: "Consent checkbox label" },
    {
      key: "consentDescription",
      label: "Consent description",
      kind: "textarea",
    },
  ],
  address: [
    { key: "showStreet2", label: "Show street line 2", kind: "boolean" },
    { key: "showCountry", label: "Show country", kind: "boolean" },
    {
      key: "addressLayout",
      label: "Address layout",
      options: ["stacked", "compact"],
    },
  ],
  hidden: [{ key: "defaultValue", label: "Hidden value" }],
  time: [{ key: "timeFormat", label: "Time format", options: ["12", "24"] }],
  list: [{ key: "maxRows", label: "Maximum rows", kind: "number" }],
};
const defaults: Field = {
  nameFormat: "full",
  showDivider: true,
  dividerColor: "#e2e8f0",
  nextButtonText: "Next",
  previousButtonText: "Previous",
  selectionMode: "single",
  choiceLayout: "stacked",
  consentCheckboxLabel: "I agree",
  showStreet2: false,
  showCountry: true,
  addressLayout: "stacked",
  timeFormat: "12",
  maxRows: 10,
};
export function FormFieldsEditor({
  fields,
  onChange,
  canUseMedia = false,
}: {
  canUseMedia?: boolean;
  fields: Field[];
  onChange: (fields: Field[]) => void;
}) {
  const [type, setType] = useState("text");
  const [imageTarget, setImageTarget] = useState<{
    fieldId: string;
    option: number;
  } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (imageTarget && canUseMedia) dialog.current?.showModal();
    else dialog.current?.close();
  }, [imageTarget, canUseMedia]);
  function update(index: number, patch: Field) {
    onChange(
      fields.map((field, at) =>
        at === index ? { ...field, ...patch } : field,
      ),
    );
  }
  function move(index: number, offset: number) {
    const next = [...fields];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    onChange(next);
  }
  function add() {
    const id = crypto.randomUUID(),
      config: Field = {};
    for (const control of configs[type] || [])
      if (defaults[control.key] !== undefined)
        config[control.key] = defaults[control.key];
    if (choices.includes(type))
      config.choiceLayout = type === "image-choice" ? "grid" : "stacked";
    if (type === "list")
      config.listColumns = [
        { id: crypto.randomUUID(), label: "Item", placeholder: "" },
      ];
    onChange([
      ...fields,
      {
        id,
        key: `field-${id}`,
        label: "New field",
        type,
        required: !structural.includes(type) && type !== "hidden",
        width: "full",
        placeholder: "",
        helpText: "",
        options: choices.includes(type)
          ? [{ label: "Option one", value: "option-one", imageUrl: "" }]
          : [],
        config,
      },
    ]);
  }
  return (
    <div className="form-field-builder">
      {createPortal(
        <dialog
          ref={dialog}
          className="media-picker"
          aria-label="Choose form choice image"
          onCancel={() => setImageTarget(null)}
        >
          <button type="button" onClick={() => setImageTarget(null)}>
            Close image picker
          </button>
          {imageTarget && canUseMedia && (
            <MediaLibrary
              acceptAsset={(asset) => asset.mimeType.startsWith("image/")}
              onSelect={(asset) => {
                const index = fields.findIndex(
                  (field) => String(field.id) === imageTarget.fieldId,
                );
                if (index >= 0) {
                  const options = records(fields[index].options);
                  if (options[imageTarget.option])
                    update(index, {
                      options: options.map((option, at) =>
                        at === imageTarget.option
                          ? { ...option, imageUrl: asset.url }
                          : option,
                      ),
                    });
                }
                setImageTarget(null);
              }}
            />
          )}{" "}
        </dialog>,
        document.body,
      )}

      <p>
        Field keys identify saved answers and integrations. Changing a key
        affects future submissions; previous answers retain their original keys.
      </p>
      <div className="form-actions">
        <label>
          New field type
          <select
            aria-label="New field type"
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            {types.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <button type="button" onClick={add}>
          Add field
        </button>
      </div>
      {fields.map((field, index) => {
        const fieldType = String(field.type),
          config = record(field.config),
          options = records(field.options),
          columns = records(config.listColumns);
        const setConfig = (key: string, value: unknown) =>
          update(index, { config: { ...config, [key]: value } });
        const controls = [
          ...(configs[fieldType] || []),
          ...(choices.includes(fieldType)
            ? [
                {
                  key: "choiceLayout",
                  label: "Choice layout",
                  options: ["stacked", "inline", "grid"],
                },
              ]
            : []),
        ];
        return (
          <details key={String(field.id || index)} className="form-field-card">
            <summary>
              {index + 1}. {String(field.label || "Field")} · {fieldType}
            </summary>
            <div className="form-actions">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                Move up
              </button>
              <button
                type="button"
                disabled={index === fields.length - 1}
                onClick={() => move(index, 1)}
              >
                Move down
              </button>
              <button
                type="button"
                onClick={() => {
                  const copy = structuredClone(field),
                    id = crypto.randomUUID();
                  copy.id = id;
                  copy.key = `field-${id}`;
                  copy.label = `${String(field.label || "Field")} copy`;
                  const c = record(copy.config);
                  if (Array.isArray(c.listColumns))
                    c.listColumns = records(c.listColumns).map((column) => ({
                      ...column,
                      id: crypto.randomUUID(),
                    }));
                  onChange([
                    ...fields.slice(0, index + 1),
                    copy,
                    ...fields.slice(index + 1),
                  ]);
                }}
              >
                Duplicate field
              </button>
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      "Remove this field from future submissions? Existing answers remain saved.",
                    )
                  )
                    onChange(fields.filter((_, at) => at !== index));
                }}
              >
                Remove field
              </button>
            </div>
            {![...types].includes(fieldType) && (
              <p>
                This field type is not recognized. Its saved configuration is
                preserved.
              </p>
            )}
            {[
              ["label", "Field label"],
              ["key", "Field key"],
              ["placeholder", "Placeholder"],
              ["helpText", "Help text"],
            ].map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  aria-label={label}
                  required={key === "label" || key === "key"}
                  value={String(field[key] || "")}
                  onChange={(event) =>
                    update(index, { [key]: event.target.value })
                  }
                />
              </label>
            ))}
            <label>
              Field width
              <select
                aria-label="Field width"
                value={String(field.width || "full")}
                onChange={(event) =>
                  update(index, { width: event.target.value })
                }
              >
                <option value="full">Full</option>
                <option value="half">Half</option>
              </select>
            </label>
            {!structural.includes(fieldType) && fieldType !== "hidden" && (
              <label className="form-check">
                <input
                  type="checkbox"
                  checked={!!field.required}
                  onChange={(event) =>
                    update(index, { required: event.target.checked })
                  }
                />
                Required
              </label>
            )}
            {controls.map((control) => {
              const current =
                config[control.key] ?? defaults[control.key] ?? "";
              return (
                <label
                  key={control.key}
                  className={
                    control.kind === "boolean" ? "form-check" : undefined
                  }
                >
                  {control.label}
                  {control.options ? (
                    <select
                      aria-label={control.label}
                      value={String(current)}
                      onChange={(event) =>
                        setConfig(control.key, event.target.value)
                      }
                    >
                      {control.options.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  ) : control.kind === "boolean" ? (
                    <input
                      type="checkbox"
                      checked={!!current}
                      onChange={(event) =>
                        setConfig(control.key, event.target.checked)
                      }
                    />
                  ) : control.kind === "textarea" ? (
                    <textarea
                      aria-label={control.label}
                      value={String(current)}
                      onChange={(event) =>
                        setConfig(control.key, event.target.value)
                      }
                    />
                  ) : (
                    <input
                      aria-label={control.label}
                      type={control.kind === "number" ? "number" : "text"}
                      min={control.kind === "number" ? 1 : undefined}
                      required={control.kind === "number"}
                      value={String(current)}
                      onChange={(event) =>
                        setConfig(
                          control.key,
                          control.kind === "number"
                            ? event.target.value === ""
                              ? ""
                              : Number(event.target.value)
                            : event.target.value,
                        )
                      }
                    />
                  )}
                </label>
              );
            })}
            {choices.includes(fieldType) && (
              <div>
                <h3>Choices</h3>
                {options.map((option, at) => (
                  <fieldset key={at}>
                    <legend>Choice {at + 1}</legend>
                    {[
                      ["label", "Choice label"],
                      ["value", "Choice value"],
                      ...(fieldType === "image-choice"
                        ? [["imageUrl", "Choice image URL"]]
                        : []),
                    ].map(([key, label]) => (
                      <label key={key}>
                        {label}
                        <input
                          aria-label={label}
                          required={key !== "imageUrl"}
                          value={String(option[key] || "")}
                          onChange={(event) =>
                            update(index, {
                              options: options.map((item, pos) =>
                                pos === at
                                  ? { ...item, [key]: event.target.value }
                                  : item,
                              ),
                            })
                          }
                        />
                      </label>
                    ))}
                    {fieldType === "image-choice" && canUseMedia && (
                      <button
                        type="button"
                        onClick={() =>
                          setImageTarget({
                            fieldId: String(field.id),
                            option: at,
                          })
                        }
                      >
                        Choose image {at + 1}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        update(index, {
                          options: options.filter((_, pos) => pos !== at),
                        })
                      }
                    >
                      Remove choice
                    </button>
                  </fieldset>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    update(index, {
                      options: [
                        ...options,
                        {
                          label: "New option",
                          value: `option-${crypto.randomUUID()}`,
                          imageUrl: "",
                        },
                      ],
                    })
                  }
                >
                  Add choice
                </button>
              </div>
            )}
            {fieldType === "list" && (
              <div>
                <h3>List columns</h3>
                {columns.map((column, at) => (
                  <fieldset key={String(column.id || at)}>
                    <legend>Column {at + 1}</legend>
                    {[
                      ["label", "Column label"],
                      ["placeholder", "Column placeholder"],
                    ].map(([key, label]) => (
                      <label key={key}>
                        {label}
                        <input
                          aria-label={label}
                          required={key === "label"}
                          value={String(column[key] || "")}
                          onChange={(event) =>
                            setConfig(
                              "listColumns",
                              columns.map((item, pos) =>
                                pos === at
                                  ? { ...item, [key]: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                      </label>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setConfig(
                          "listColumns",
                          columns.filter((_, pos) => pos !== at),
                        )
                      }
                    >
                      Remove column
                    </button>
                  </fieldset>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setConfig("listColumns", [
                      ...columns,
                      {
                        id: crypto.randomUUID(),
                        label: "Item",
                        placeholder: "",
                      },
                    ])
                  }
                >
                  Add column
                </button>
              </div>
            )}
          </details>
        );
      })}
    </div>
  );
}
export function validateFormFields(fields: Field[]): string | null {
  const keys = new Set<string>(),
    ids = new Set<string>();
  for (const field of fields) {
    if (!field.id || !field.key || !String(field.label || "").trim())
      return "Every field requires an ID, key and label.";
    if (keys.has(String(field.key)) || ids.has(String(field.id)))
      return "Field keys and IDs must be unique.";
    keys.add(String(field.key));
    ids.add(String(field.id));
  }
  return null;
}
