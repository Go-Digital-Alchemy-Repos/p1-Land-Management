import { useState } from "react";
import type { getWebsiteTypography } from "@workspace/api-client-react/dashboard";
type Snapshot = Awaited<ReturnType<typeof getWebsiteTypography>>;
type WebsiteFontOption = Snapshot["options"][number];
type WebsiteFonts = Snapshot["fonts"];
export function TypographyPreview({
  fonts,
  options,
}: {
  fonts: WebsiteFonts;
  options: WebsiteFontOption[];
}) {
  const [attempt, setAttempt] = useState(0),
    [mobile, setMobile] = useState(false);
  const query = new URLSearchParams();
  let custom = false;
  for (const [key, parameter] of [
    ["frontend_body_font", "body"],
    ["frontend_heading_font", "heading"],
  ] as const) {
    const option = options.find((option) => option.value === fonts[key]);
    if (option) {
      query.set(parameter, option.label);
      query.set(
        parameter + "Type",
        option.category === "sans" ? "sans-serif" : "serif",
      );
    } else if (fonts[key]) custom = true;
  }
  const src = `https://www.p1landmanagement.com/cms-preview/typography?${query}`;
  return (
    <section aria-label="Unsaved typography preview">
      <h3>Draft font preview</h3>
      <p>
        Selections update this sample without saving. Web fonts may fall back if
        unavailable; this is a specimen, not a full page layout.
      </p>
      {custom && (
        <p>
          Unrecognized saved fonts use the website default in this sample. Their
          stored values remain unchanged.
        </p>
      )}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: ".5rem",
          marginBottom: "1rem",
        }}
      >
        <button
          type="button"
          aria-pressed={!mobile}
          onClick={() => setMobile(false)}
        >
          Wide sample
        </button>
        <button
          type="button"
          aria-pressed={mobile}
          onClick={() => setMobile(true)}
        >
          Narrow sample
        </button>
        <button type="button" onClick={() => setAttempt((value) => value + 1)}>
          Reload font preview
        </button>
      </div>
      <iframe
        key={`${src}:${attempt}`}
        src={src}
        title="Unsaved website typography specimen"
        sandbox=""
        referrerPolicy="no-referrer"
        style={{
          display: "block",
          width: mobile ? "min(100%, 375px)" : "100%",
          height: 650,
          border: "1px solid hsl(var(--border))",
          borderRadius: ".5rem",
          background: "white",
        }}
      />
      <p>
        If the sample is unavailable, reload it. Your selections and saved
        website are unaffected.
      </p>
    </section>
  );
}
