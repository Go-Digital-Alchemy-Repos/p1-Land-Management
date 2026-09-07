import type { CmsSnapshot, CmsValues } from './cms';

export type CmsPreviewOverlay = { route: string; content?: CmsValues; global?: CmsValues };

/** Published fetches may finish after the editor sends its first draft. */
export function applyPreviewOverlay(snapshot: CmsSnapshot, overlay: CmsPreviewOverlay | null): CmsSnapshot {
  if (!overlay || overlay.route !== snapshot.route) return snapshot;
  return { ...snapshot, ...(overlay.content ? { content: overlay.content } : {}), ...(overlay.global ? { global: overlay.global } : {}) };
}
