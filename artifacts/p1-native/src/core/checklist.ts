type Checklist = { label: string; done: boolean }[];
type Work = { id: string; version?: number; checklist?: Checklist };
type Event = {
  workOrderId: string;
  baseVersion: number;
  kind: string;
  payload: { items?: Checklist };
};

/** Apply only to the downloaded revision used by the immutable field event. */
export function applyChecklist<T extends Work>(work: T[], event: Event): T[] {
  if (event.kind !== "checklist" || !event.payload.items) return work;
  return work.map((item) =>
    item.id === event.workOrderId && item.version === event.baseVersion
      ? {
          ...item,
          checklist: event.payload.items!.map((entry) => ({ ...entry })),
        }
      : item,
  );
}

/** Server identity/version wins; local checklist is valid only for the same revision. */
export function withDownloadedChecklist<T extends Work>(
  server: T,
  downloaded: Work[],
): T {
  const local = downloaded.find(
    (item) => item.id === server.id && item.version === server.version,
  );
  return local?.checklist
    ? { ...server, checklist: local.checklist.map((item) => ({ ...item })) }
    : server;
}
