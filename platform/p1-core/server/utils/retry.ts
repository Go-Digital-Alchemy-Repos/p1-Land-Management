import { logger } from "./logger";

export async function retryOnce<T>(
  fn: () => Promise<T>,
  label: string,
  delayMs: number = 500,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    logger.app.warn(`${label} failed, retrying once after ${delayMs}ms`, {
      error: err instanceof Error ? err.message : String(err),
    });
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return fn();
  }
}
