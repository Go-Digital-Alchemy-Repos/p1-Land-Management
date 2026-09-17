import { useState } from "react";
import { createMarketingSection } from "@workspace/api-client-react/dashboard";
import type { MarketingSection } from "../../../../lib/api-client-react/src/dashboard/models";

export function SaveReusableSection({
  blocks,
  disabled,
  onSaved,
  onClose,
}: {
  blocks: MarketingSection["blocks"];
  disabled: boolean;
  onSaved: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    if (disabled || busy || !name.trim()) return;
    setBusy(true);
    setError("");
    try {
      const row = await createMarketingSection({
        name: name.trim(),
        description: description.trim(),
        category: category.trim() || "general",
        blocks,
      });
      onSaved(row.name);
    } catch (error) {
      setError(
        (error as { data?: { error?: string } }).data?.error ||
          (error as Error).message ||
          "Could not save the reusable section. Your copy is retained for retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <fieldset
      disabled={disabled || busy}
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target instanceof HTMLInputElement)
          event.preventDefault();
      }}
    >
      <legend>Save reusable section</legend>
      <p>
        This saves an independent copy of the block as it was when you opened
        this panel. It does not save changes to the current page or section.
      </p>
      {error && <p role="alert">{error}</p>}
      <label>
        Reusable section name
        <input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label>
        Reusable section description
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      <label>
        Reusable section category
        <input
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        />
      </label>
      <div className="section-actions">
        <button type="button" onClick={onClose}>
          Cancel reusable section
        </button>
        <button
          type="button"
          disabled={!name.trim()}
          onClick={() => void save()}
        >
          {busy ? "Saving reusable section…" : "Create reusable section"}
        </button>
      </div>
    </fieldset>
  );
}
