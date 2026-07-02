export interface CollectedHead {
  title: string;
  description: string;
  image?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  noindex?: boolean;
}

let collecting = false;
let current: CollectedHead | null = null;

export function startHeadCollection(): void {
  collecting = true;
  current = null;
}

export function collectHead(head: CollectedHead): void {
  if (collecting) {
    current = head;
  }
}

export function finishHeadCollection(): CollectedHead | null {
  collecting = false;
  const result = current;
  current = null;
  return result;
}
