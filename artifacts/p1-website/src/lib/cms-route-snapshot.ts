import type { CmsSnapshot } from './cms';
export function snapshotForRoute(snapshot: CmsSnapshot, path: string): CmsSnapshot {
  return snapshot.route === path ? snapshot : { route: path, content: {}, global: snapshot.global, identity: snapshot.identity };
}
export function retainPublishedIdentity(previous: CmsSnapshot, next: CmsSnapshot): CmsSnapshot {
  return { ...next, identity: next.identity ?? previous.identity };
}
