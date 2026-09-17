-- Read-only inventory. Run against the intended environment during the
-- authorized migration rehearsal; do not infer historical party text.
SELECT status, count(*) AS missing_snapshot_count
FROM estimate
WHERE status <> 'draft' AND document_snapshot IS NULL
GROUP BY status ORDER BY status;

SELECT id, revision, status, property_id, created_at
FROM estimate
WHERE status <> 'draft' AND document_snapshot IS NULL
ORDER BY created_at, id;
