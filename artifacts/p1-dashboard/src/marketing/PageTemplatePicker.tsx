import { LandingPageGenerator } from "./LandingPageGenerator";
import { useState } from "react";
import { PAGE_TEMPLATES } from "../../../../platform/p1-core/shared/cms-builder/page-templates";
import type { MarketingSection } from "../../../../lib/api-client-react/src/dashboard/models";

export default function PageTemplatePicker({
  disabled,
  onSelect,
  previewUrl,
}: {
  disabled: boolean;
  previewUrl?: string | null;
  onSelect: (blocks: MarketingSection["blocks"], name: string) => void;
}) {
  const [generator, setGenerator] = useState(false);
  const [selected, setSelected] = useState(PAGE_TEMPLATES[0].id);
  const template = PAGE_TEMPLATES.find((item) => item.id === selected)!;
  return (
    <fieldset disabled={disabled}>
      <legend>Page starter layouts</legend>
      <p>
        These retained layouts contain example copy, statistics, testimonials
        and links. They are not verified P1 facts. Replace examples and review
        every link before publication.
      </p>
      <button
        type="button"
        aria-expanded={generator}
        onClick={() => setGenerator((value) => !value)}
      >
        {generator
          ? "Close landing page generator"
          : "Open landing page generator"}
      </button>
      {generator && (
        <LandingPageGenerator
          disabled={disabled}
          previewUrl={previewUrl}
          onSelect={onSelect}
        />
      )}
      <label>
        Starter layout
        <select
          aria-label="Starter layout"
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
        >
          {PAGE_TEMPLATES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <p>
        {template.description} · {template.blockCount} blocks
      </p>
      <button
        type="button"
        onClick={() =>
          onSelect(
            template.blocks().map((block) => ({ ...block })),
            template.name,
          )
        }
      >
        Apply starter to draft
      </button>
    </fieldset>
  );
}
