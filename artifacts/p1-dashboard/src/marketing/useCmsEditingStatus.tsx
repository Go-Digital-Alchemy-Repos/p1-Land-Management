import { useEffect, useState } from "react";
import { customFetch } from "../../../../lib/api-client-react/src/custom-fetch";
import "./cms-paused-banner.css";

export const CMS_PAUSED_SHORT =
  "Website editing is paused while we finish the site copy update.";
export const CMS_PAUSED_MESSAGE =
  `${CMS_PAUSED_SHORT} You can view content and revisions, but changes can't be saved or published right now.`;

type Editing = "paused" | "enabled";
let cached: { editing: Editing; at: number } | null = null;
let pending: Promise<Editing> | null = null;

async function fetchEditingStatus(): Promise<Editing> {
  if (cached && Date.now() - cached.at < 15_000) return cached.editing;
  pending ??= customFetch<{ editing: Editing }>("/api/v1/marketing/cms/status")
    .then((result) => {
      if (result.editing !== "enabled") return "paused" as const;
      return "enabled" as const;
    })
    .catch(() => "paused" as const)
    .then((editing) => {
      cached = { editing, at: Date.now() };
      return editing;
    })
    .finally(() => { pending = null; });
  return pending;
}

// Fail closed until Core confirms editing is enabled. Core's 423 remains the
// authoritative guard if a stale client stays open across a deployment.
export function useCmsEditingPaused() {
  const [paused, setPaused] = useState(() => cached?.editing !== "enabled");
  useEffect(() => {
    let live = true;
    void fetchEditingStatus().then((editing) => {
      if (live) setPaused(editing !== "enabled");
    });
    return () => { live = false; };
  }, []);
  return paused;
}

export function CmsPausedBanner({ paused }: { paused: boolean }) {
  return paused ? <p className="cms-paused-banner" role="status">{CMS_PAUSED_MESSAGE}</p> : null;
}

export function cmsMutationProps(paused: boolean) {
  return {
    "aria-disabled": paused,
    title: paused ? CMS_PAUSED_SHORT : undefined,
    disabled: paused,
  } as const;
}
