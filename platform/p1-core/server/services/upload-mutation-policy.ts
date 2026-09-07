import { AppError } from "../middleware/error-handler";

/** Admission guard only: existing in-flight operations still require a release drain barrier. */
export function assertUploadMutationsAllowed(): void {
  if (process.env.UPLOAD_MUTATIONS_FROZEN === "true") {
    throw new AppError("File changes are temporarily unavailable. Please try again later.", 503);
  }
}
