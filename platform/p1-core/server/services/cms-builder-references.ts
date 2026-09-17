import { storage } from "../storage";
import { federationConfig } from "./federation-client";
import { ALL_BLOCKS } from "../../shared/cms-builder/block-registry";
import { LEGACY_BLOCK_TYPE_ALIASES } from "../../shared/cms-builder/block-registry.shared";
import { CMS_BUILDER_PREVIEW_PATH } from "../../shared/cms-builder/preview";

/** Selectors expose references, not bodies, submissions, recipients or settings.
 * Callers authorize their own editor capability before loading these values. */
export async function loadCmsBuilderReferences(includeSidebars = false) {
  const [pages, forms, galleries, team, sidebars] = await Promise.all([
    storage.cmsPages.getAllPages(),
    storage.forms.getAll(),
    storage.cmsGalleries.getAll(),
    storage.team.list(),
    includeSidebars ? storage.cmsSidebars.getAll() : Promise.resolve([]),
  ]);
  return {
    blocks: ALL_BLOCKS,
    aliases: LEGACY_BLOCK_TYPE_ALIASES,
    previewUrl:
      process.env.CORE_BUILDER_PREVIEW_ENABLED === "true"
        ? `${federationConfig().origin}${CMS_BUILDER_PREVIEW_PATH}`
        : null,
    pages: pages.map(({ id, title, slug, status }) => ({ id, title, slug, status })),
    forms: forms.map(({ id, name, slug, kind }) => ({ id, name, slug, kind })),
    galleries: galleries
      .filter((row) => row.status === "published")
      .map(({ id, title }) => ({ id, title })),
    team: team.filter((row) => row.status === "published").map(({ id, name }) => ({ id, name })),
    ...(includeSidebars
      ? { sidebars: sidebars.map(({ id, name, isDefault }) => ({ id, name, isDefault })) }
      : {}),
  };
}
