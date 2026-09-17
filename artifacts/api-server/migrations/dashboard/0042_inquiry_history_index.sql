-- Stable keyset navigation across all inquiry sources, including older imported records.
CREATE INDEX lead_history_idx ON lead(created_at DESC,id DESC);
