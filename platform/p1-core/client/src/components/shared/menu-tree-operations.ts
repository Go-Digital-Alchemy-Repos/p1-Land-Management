import type { MenuItem } from "../../../../shared/schema/cms-menus";
export function promoteMenuItemToRoot(items: MenuItem[], targetId: string): MenuItem[] {
  let promotedItem: MenuItem | null = null;
  let topAncestorId: string | null = null;

  const removeFromChildren = (children: MenuItem[], ancestorId: string): MenuItem[] => {
    const nextChildren: MenuItem[] = [];

    for (const child of children) {
      if (child.id === targetId) {
        promotedItem = child;
        topAncestorId = ancestorId;
        continue;
      }

      nextChildren.push({
        ...child,
        children: removeFromChildren(child.children ?? [], ancestorId),
      });
    }

    return nextChildren;
  };

  const nextItems = items.map((item) => ({
    ...item,
    children: removeFromChildren(item.children ?? [], item.id),
  }));

  if (!promotedItem || !topAncestorId) return items;

  const topAncestorIndex = nextItems.findIndex((item) => item.id === topAncestorId);
  if (topAncestorIndex < 0) return [...nextItems, promotedItem];

  return [
    ...nextItems.slice(0, topAncestorIndex + 1),
    promotedItem,
    ...nextItems.slice(topAncestorIndex + 1),
  ];
}

export function reorderMenuItems(items: MenuItem[], activeId: string, overId: string): MenuItem[] {
  if (activeId === overId) return items;
  const fromIndex = items.findIndex((item) => item.id === activeId);
  const toIndex = items.findIndex((item) => item.id === overId);
  if (fromIndex < 0 || toIndex < 0) return items;
  const nextItems = [...items];
  const [moved] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, moved);
  return nextItems;
}

export function menuSubtreeHeight(item: MenuItem): number {
  return 1 + Math.max(0, ...(item.children ?? []).map(menuSubtreeHeight));
}
export function indentMenuItem(items: MenuItem[], id: string, depth = 1): MenuItem[] {
  const index = items.findIndex((x) => x.id === id);
  if (index >= 0) {
    if (index === 0 || depth + menuSubtreeHeight(items[index]) > 3) return items;
    const next = [...items],
      item = next[index],
      previous = next[index - 1];
    next.splice(index, 1);
    next[index - 1] = { ...previous, children: [...(previous.children ?? []), item] };
    return next;
  }
  return items.map((item) => ({
    ...item,
    children: indentMenuItem(item.children ?? [], id, depth + 1),
  }));
}
export function outdentMenuItem(items: MenuItem[], id: string): MenuItem[] {
  const result: MenuItem[] = [];
  for (const parent of items) {
    const children = parent.children ?? [];
    const index = children.findIndex((x) => x.id === id);
    if (index >= 0) {
      result.push({ ...parent, children: children.filter((_, i) => i !== index) }, children[index]);
    } else result.push({ ...parent, children: outdentMenuItem(children, id) });
  }
  return result;
}
