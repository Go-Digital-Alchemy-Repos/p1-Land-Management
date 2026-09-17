import { useState } from "react";
import { PAGE_TEMPLATES } from "../../../../platform/p1-core/shared/cms-builder/page-templates";
import type { MarketingSection } from "../../../../lib/api-client-react/src/dashboard/models";

export default function PageTemplatePicker({
  disabled,
  onSelect,
}: {
  disabled: boolean;
  onSelect: (blocks: MarketingSection["blocks"], name: string) => void;
}) {
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
