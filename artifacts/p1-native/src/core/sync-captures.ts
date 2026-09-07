export type CaptureSyncResult = {
  photosAcknowledged: number;
  photoFailures: number;
  operationsProcessed: boolean;
};
/** Independent delivery failures never discard captures or bypass identity locks. */
export async function syncCaptures<Photo extends { id: string }>(steps: {
  photos(): Promise<Photo[]>;
  upload(photo: Photo): Promise<unknown>;
  acknowledgePhoto(id: string): Promise<void>;
  operations(): Promise<void>;
  assertCurrent(): void;
  isFatal(error: unknown): boolean;
}): Promise<CaptureSyncResult> {
  const result = {
    photosAcknowledged: 0,
    photoFailures: 0,
    operationsProcessed: false,
  };
  steps.assertCurrent();
  const photos = await steps.photos();
  for (const photo of photos) {
    steps.assertCurrent();
    try {
      const receipt = await steps.upload(photo);
      steps.assertCurrent();
      if (
        !receipt ||
        typeof receipt !== "object" ||
        !("id" in receipt) ||
        receipt.id !== photo.id ||
        !("status" in receipt) ||
        receipt.status !== "accepted"
      )
        throw new Error(
          "Photo acknowledgment does not match the saved capture.",
        );
      await steps.acknowledgePhoto(photo.id);
      steps.assertCurrent();
      // Count only receipts whose local persistence completed successfully.
      result.photosAcknowledged++;
    } catch (error) {
      // A failed identity check must escape, regardless of the delivery error.
      steps.assertCurrent();
      if (steps.isFatal(error)) throw error;
      result.photoFailures++;
    }
  }
  steps.assertCurrent();
  try {
    await steps.operations();
    steps.assertCurrent();
    result.operationsProcessed = true;
  } catch (error) {
    steps.assertCurrent();
    if (steps.isFatal(error)) throw error;
    // syncOperations already persists validated receipts and retains other IDs.
  }
  return result;
}
