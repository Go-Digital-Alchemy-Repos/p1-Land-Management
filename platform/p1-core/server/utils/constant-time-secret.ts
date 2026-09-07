import { timingSafeEqual } from "node:crypto";

/** Compare non-empty secrets without exposing partial-match timing. */
export function constantTimeSecretEquals(
  presented: string | null | undefined,
  expected: string | null | undefined,
) {
  if (!presented || !expected) return false;
  const presentedBuffer = Buffer.from(presented);
  const expectedBuffer = Buffer.from(expected);
  return (
    presentedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(presentedBuffer, expectedBuffer)
  );
}
