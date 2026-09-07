import { useEffect, useState } from "react";
import "./property-files.css";
type PropertyFile = {
  id: string;
  name: string;
  mime: string;
  classification: string;
  published: boolean;
  created_at: string;
};
export function PropertyFiles({
  propertyId,
  canPublish,
  request,
}: {
  propertyId: string;
  canPublish: boolean;
  request: (path: string, body?: unknown) => Promise<any>;
}) {
  const [files, setFiles] = useState<PropertyFile[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState<string | null>(null),
    [failedImages, setFailedImages] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setFiles([]);
    setFailedImages([]);
    request("/properties/" + propertyId + "/files")
      .then((rows) => {
        if (active) setFiles(rows);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [propertyId, request]);
  async function publish(file: PropertyFile) {
    setBusy(file.id);
    setError("");
    try {
      await request("/files/" + file.id + "/publish", {});
      setFiles((rows) =>
        rows.map((row) =>
          row.id === file.id ? { ...row, published: true } : row,
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  return (
    <section aria-label="Property photos">
      <h3>Property photos</h3>
      {canPublish && (
        <p>
          Inspect photos before publishing. Only photos attached to reviewed
          work can be shared with the client.
        </p>
      )}
      {loading && <p role="status">Loading photos…</p>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!loading && !error && !files.length && (
        <p className="empty">No photos are available for this property.</p>
      )}
      <div className="property-photo-grid">
        {files.map((file) => (
          <article key={file.id} className="property-photo">
            <h4>{file.name}</h4>
            {failedImages.includes(file.id) ? (
              <p role="status">Image unavailable. Open the photo to retry.</p>
            ) : (
              <img
                src={"/api/v1/files/" + file.id + "/content"}
                alt={`${file.classification} photo: ${file.name}`}
                loading="lazy"
                onError={() =>
                  setFailedImages((ids) =>
                    ids.includes(file.id) ? ids : [...ids, file.id],
                  )
                }
              />
            )}
            <span className="badge">
              {file.classification}
              {canPublish
                ? " · " + (file.published ? "Published" : "Private")
                : ""}
            </span>
            <small>{new Date(file.created_at).toLocaleString()}</small>
            <a
              href={"/api/v1/files/" + file.id + "/content"}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open full photo
            </a>
            {canPublish && !file.published && (
              <button
                disabled={busy !== null}
                onClick={() => void publish(file)}
              >
                {busy === file.id
                  ? "Publishing…"
                  : "Publish this photo to client"}
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
