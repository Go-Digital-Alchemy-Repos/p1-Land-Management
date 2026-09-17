import { useMemo, useState } from "react";
import {
  LANDING_PAGE_GOALS,
  AUDIENCE_OPTIONS,
  getRecommendedBlocks,
  generateLandingPageBlocks,
} from "../../../../platform/p1-core/shared/cms-builder/page-templates";
import type { MarketingSection } from "../../../../lib/api-client-react/src/dashboard/models";
import { BuilderPreview } from "./BuilderPreview";

export function LandingPageGenerator({
  disabled,
  previewUrl,
  onSelect,
}: {
  disabled: boolean;
  previewUrl?: string | null;
  onSelect: (blocks: MarketingSection["blocks"], name: string) => void;
}) {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState("general");
  const [headline, setHeadline] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [audiences, setAudiences] = useState<string[]>([]);
  const [selected, setSelected] = useState(() =>
    getRecommendedBlocks("general")
      .filter((item) => item.recommended)
      .map((item) => item.id),
  );
  const [ctaText, setCtaText] = useState("");
  const [ctaLink, setCtaLink] = useState("");
  const options = getRecommendedBlocks(goal);
  const blocks = useMemo(
    () =>
      generateLandingPageBlocks(
        goal,
        headline.trim(),
        subheadline.trim(),
        audiences,
        selected,
        ctaText.trim(),
        ctaLink.trim(),
      ),
    [goal, headline, subheadline, audiences, selected, ctaText, ctaLink],
  );
  const steps = [
    "Goal and headline",
    "Audience",
    "Content blocks",
    "Preview and apply",
  ];
  const valid =
    step === 0
      ? Boolean(headline.trim() && ctaText.trim() && ctaLink.trim())
      : step === 1
        ? audiences.length > 0
        : selected.length > 0;
  function toggle(values: string[], id: string) {
    return values.includes(id)
      ? values.filter((value) => value !== id)
      : [...values, id];
  }
  return (
    <fieldset
      disabled={disabled}
      onKeyDown={(event) => {
        if (
          event.key === "Enter" &&
          (event.target instanceof HTMLInputElement ||
            event.target instanceof HTMLSelectElement)
        )
          event.preventDefault();
      }}
    >
      <legend>Landing page generator</legend>
      <p role="status">
        Step {step + 1} of 4: {steps[step]}
      </p>
      <p>
        Audience suggestions and block examples come from the existing
        templates. Replace example copy, verify claims, and check links before
        publication.
      </p>
      {step === 0 && (
        <>
          <label>
            Campaign goal
            <select
              aria-label="Campaign goal"
              value={goal}
              onChange={(event) => {
                setGoal(event.target.value);
                setSelected(
                  getRecommendedBlocks(event.target.value)
                    .filter((item) => item.recommended)
                    .map((item) => item.id),
                );
              }}
            >
              {LANDING_PAGE_GOALS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Campaign headline
            <input
              value={headline}
              onChange={(event) => setHeadline(event.target.value)}
            />
          </label>
          <label>
            Campaign introduction
            <textarea
              value={subheadline}
              onChange={(event) => setSubheadline(event.target.value)}
            />
          </label>
          <label>
            Call to action text
            <input
              value={ctaText}
              onChange={(event) => setCtaText(event.target.value)}
            />
          </label>
          <label>
            Call to action link
            <input
              value={ctaLink}
              onChange={(event) => setCtaLink(event.target.value)}
              placeholder="/contact"
            />
          </label>
        </>
      )}
      {step === 1 &&
        AUDIENCE_OPTIONS.map((item) => (
          <label className="section-check" key={item.id}>
            <input
              type="checkbox"
              checked={audiences.includes(item.id)}
              onChange={() => setAudiences(toggle(audiences, item.id))}
            />
            {item.label}
          </label>
        ))}
      {step === 2 && (
        <>
          <p>
            Select blocks in the order you want them to appear. You can reorder
            them in the page editor after applying.
          </p>
          {options.map((item) => (
            <label className="section-check" key={item.id}>
              <input
                type="checkbox"
                checked={selected.includes(item.id)}
                onChange={() => setSelected(toggle(selected, item.id))}
              />
              <span>
                {item.label}
                {item.recommended ? " (suggested)" : ""} — {item.description}
              </span>
            </label>
          ))}
          <p>
            Current order:{" "}
            {selected
              .map((id) => options.find((item) => item.id === id)?.label)
              .join(" → ") || "No blocks selected"}
          </p>
        </>
      )}
      {step === 3 && (
        <>
          <p>
            {headline} · {blocks.length} blocks. Applying changes the unsaved
            draft only.
          </p>
          <BuilderPreview
            blocks={blocks}
            previewUrl={previewUrl}
            label="page"
          />
        </>
      )}
      <div className="section-actions">
        {step > 0 && (
          <button type="button" onClick={() => setStep((value) => value - 1)}>
            Previous generator step
          </button>
        )}
        {step < 3 ? (
          <button
            type="button"
            disabled={!valid}
            onClick={() => setStep((value) => value + 1)}
          >
            Next generator step
          </button>
        ) : (
          <button
            type="button"
            disabled={!blocks.length}
            onClick={() =>
              onSelect(
                blocks.map((block) => ({ ...block })),
                "generated landing page",
              )
            }
          >
            Apply generated page to draft
          </button>
        )}
      </div>
    </fieldset>
  );
}
