import { Paperclip, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { RichTextEditor } from "./RichTextEditor";

const acceptedTypes = ["application/pdf", "text/plain", "image/jpeg", "image/png", "image/webp", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];

export function RequestComposer({ properties, request, onSaved }: { properties: { id: string; name: string }[]; request: (path: string, body?: unknown) => Promise<any>; onSaved: () => Promise<void>; }) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id || "");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const next = [...files, ...Array.from(incoming)];
    if (next.length > 5) return setError("A request can include up to five attachments.");
    const invalid = next.find((file) => !acceptedTypes.includes(file.type) || file.size > 20 * 1024 * 1024);
    if (invalid) return setError("Attachments must be PDFs, images, text, Word, or Excel files under 20 MiB.");
    setError(""); setFiles(next);
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const created = await request("/requests", { propertyId, description: description.trim() });
      for (const file of files) {
        const response = await fetch(`/api/v1/requests/${created.id}/attachments/${crypto.randomUUID()}`, { method: "POST", headers: { "Content-Type": file.type, "x-p1-file-name": file.name }, body: file });
        if (!response.ok) throw new Error((await response.json()).error || `Could not upload ${file.name}`);
      }
      await onSaved();
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  };
  return <form className="request-composer" onSubmit={submit}>
    <label>Property<select value={propertyId} onChange={(event) => setPropertyId(event.target.value)} required>{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select></label>
    <label>How can we help?<RichTextEditor value={description} onChange={setDescription} ariaLabel="Request details" required placeholder="Describe the work, context, timing, and anything our team should know." /></label>
    <section className="request-attachments" aria-labelledby="request-attachments-title"><div><strong id="request-attachments-title">Attachments</strong><p>Optional · up to 5 files, 20 MiB each.</p></div><input ref={input} type="file" multiple accept={acceptedTypes.join(",")} onChange={(event) => { addFiles(event.target.files); event.currentTarget.value = ""; }} /><button type="button" className="quiet-action" onClick={() => input.current?.click()} disabled={busy}><Paperclip size={16} /> Add files</button>{files.length > 0 && <ul>{files.map((file, index) => <li key={`${file.name}-${index}`}><span><Paperclip size={14} />{file.name} <small>{Math.ceil(file.size / 1024)} KB</small></span><button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))} disabled={busy}><X size={15} /></button></li>)}</ul>}</section>
    {error && <p className="error" role="alert">{error}</p>}
    <button className="primary" type="submit" disabled={busy || !propertyId || !description.trim()}>{busy ? "Saving…" : <><Upload size={17} />Submit request</>}</button>
  </form>;
}
