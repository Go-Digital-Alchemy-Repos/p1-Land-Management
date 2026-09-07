type CategorizablePost = {
  category?: string | null;
  categories?: string[] | null;
};

export function getPostCategories(post: CategorizablePost): string[] {
  const categories: string[] = [];
  const seen = new Set<string>();

  const pushCategory = (value: string | null | undefined) => {
    const normalized = value?.trim();
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    categories.push(normalized);
  };

  pushCategory(post.category);
  for (const category of post.categories ?? []) {
    pushCategory(category);
  }

  return categories;
}

export function getPrimaryPostCategory(post: CategorizablePost): string | null {
  return getPostCategories(post)[0] ?? null;
}

export function postMatchesCategory(post: CategorizablePost, category: string): boolean {
  const target = category.trim().toLowerCase();
  if (!target) return true;
  return getPostCategories(post).some((value) => value.toLowerCase() === target);
}
