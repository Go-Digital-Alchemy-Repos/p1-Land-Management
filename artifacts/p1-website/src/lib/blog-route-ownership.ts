export const staticBlogSlugs = new Set([
  "land-clearing-cost-per-acre-south-carolina",
  "how-to-manage-retention-pond-south-carolina",
  "best-grass-large-acreage-carolinas",
  "signs-property-drainage-problem",
  "preparing-land-agricultural-use-carolinas",
]);
export type StaticBlogOwnership = Array<{ slug: string; postId: string }>;
export function staticBlogDisposition(
  slug: string,
  ownership: StaticBlogOwnership | null | undefined,
) {
  if (!ownership) return "unknown";
  return ownership.some((entry) => entry.slug === slug) ? "owned" : "unowned";
}
/** Browser responses from another server instance may not downgrade ownership. */
export function observeBlogOwnership(
  previous: StaticBlogOwnership,
  next: StaticBlogOwnership | null | undefined,
): StaticBlogOwnership {
  if (!next) {
    if (previous.length) throw new Error("Blog ownership unavailable");
    return previous;
  }
  const owners = new Map(next.map((entry) => [entry.slug, entry.postId]));
  if (
    next.length > 5 ||
    owners.size !== next.length ||
    new Set(next.map((entry) => entry.postId)).size !== next.length ||
    next.some(
      (entry) =>
        !staticBlogSlugs.has(entry.slug) ||
        typeof entry.postId !== "string" ||
        !entry.postId,
    )
  )
    throw new Error("Invalid Blog ownership");
  for (const entry of previous)
    if (owners.get(entry.slug) !== entry.postId)
      throw new Error("Blog ownership changed");
  return next;
}
