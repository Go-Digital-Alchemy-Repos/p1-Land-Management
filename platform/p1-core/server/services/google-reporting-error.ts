import type { GAErrorResponse } from "../../shared/p1-google-analytics";
export class GAError extends Error {
  constructor(public code: GAErrorResponse["code"]) {
    super(
      code === "invalid_date_range"
        ? "Use a valid date range of at most 93 days."
        : code === "not_configured"
          ? "Google Analytics reporting is not configured."
          : "Google Analytics reporting is temporarily unavailable.",
    );
  }
}
