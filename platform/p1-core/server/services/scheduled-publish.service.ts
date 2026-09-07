import { storage } from "../storage";
import { logger } from "../utils/logger";
import { startStoppableWorker } from "../utils/runtime-lifecycle";

const HEARTBEAT_MS = 5 * 60_000;

export function startScheduledPublishService() {
  const worker = startStoppableWorker({
    intervalMs: HEARTBEAT_MS,
    run: async (isStopping) => {
      const pages = await storage.cmsPages.publishScheduledPages();
      if (isStopping()) return;
      const posts = await storage.blog.publishScheduledPosts();
      if (pages > 0 || posts > 0)
        logger.app.info(`[scheduler] Auto-published ${pages} page(s) and ${posts} post(s)`);
      if (isStopping()) return;
      const [pageTime, postTime] = await Promise.all([
        storage.cmsPages.getNextScheduledTime(),
        storage.blog.getNextScheduledTime(),
      ]);
      const times = [pageTime, postTime].filter((value): value is Date => value !== null);
      if (!times.length) return HEARTBEAT_MS;
      return Math.min(
        Math.max(Math.min(...times.map((time) => time.getTime())) - Date.now(), 1000),
        HEARTBEAT_MS,
      );
    },
    onError: (error) => logger.app.error("[scheduler] Failed to check scheduled content", error),
  });
  logger.app.info("[scheduler] Scheduled publishing service started");
  return worker;
}
