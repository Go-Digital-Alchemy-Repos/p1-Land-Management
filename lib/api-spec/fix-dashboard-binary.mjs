import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
// Orval 8.9.1 serializes Blob request bodies as JSON. Correct only this operation
// and fail generation if any expected upstream insertion anchor changes.
export function correctBinaryUpload(source) {
  const marker = "export const uploadFieldPhoto = async";
  if (source.split(marker).length !== 2)
    throw Error("Generated upload operation missing or duplicated");
  const start = source.indexOf(marker);
  const next = source.indexOf("\nexport const ", start + marker.length);
  const end = next < 0 ? source.length : next;
  const operation = source.slice(start, end);
  const body = /body: JSON\.stringify\(\s*uploadFieldPhotoBody,?\s*\)/g;
  const headers =
    /headers: \{ 'Content-Type': 'image\/jpeg',\.\.\.headers, \.\.\.options\?\.headers \}/g;
  const anchor = "  return customFetch<PhotoUploadReceipt>";
  if (
    [...operation.matchAll(body)].length !== 1 ||
    [...operation.matchAll(headers)].length !== 1 ||
    operation.split(anchor).length !== 2
  )
    throw Error(
      "Generated binary upload changed; review adapter before generation",
    );
  const prepare = `
  const uploadHeaders = new Headers(options?.headers);
  const mime = uploadHeaders.get('Content-Type') || uploadFieldPhotoBody.type;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime))
    throw new TypeError('Photo Blob or Content-Type must declare JPEG, PNG, or WebP');
  uploadHeaders.set('Content-Type', mime);
  for (const [key, value] of Object.entries(headers))
    if (value !== undefined) uploadHeaders.set(key, value);
`;
  const corrected = operation
    .replace(anchor, prepare + "\n" + anchor)
    .replace(body, "body: uploadFieldPhotoBody")
    .replace(headers, "headers: uploadHeaders");
  return source.slice(0, start) + corrected + source.slice(end);
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const file = new URL(
    "../api-client-react/src/dashboard/generated.ts",
    import.meta.url,
  );
  await writeFile(file, correctBinaryUpload(await readFile(file, "utf8")));
}
