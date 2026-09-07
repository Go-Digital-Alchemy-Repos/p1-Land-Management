import test from "node:test";
import assert from "node:assert/strict";
import { correctBinaryUpload } from "./fix-dashboard-binary.mjs";
const upload = `export const uploadFieldPhoto = async () => {
  return customFetch<PhotoUploadReceipt>(url, {
    headers: { 'Content-Type': 'image/jpeg',...headers, ...options?.headers },
    body: JSON.stringify(uploadFieldPhotoBody,)
  });
};`;
test("binary correction fails on generator drift and leaves adjacent operations untouched", () => {
  const trailing =
    "\nexport const other = async () => {\n  return customFetch<PhotoUploadReceipt>(url, {body: JSON.stringify(uploadFieldPhotoBody,)});\n};";
  const result = correctBinaryUpload("/* prefix */\n" + upload + trailing);
  assert.ok(result.startsWith("/* prefix */\n"));
  assert.ok(result.endsWith(trailing));
  assert.ok(result.includes("body: uploadFieldPhotoBody"));
  assert.throws(
    () =>
      correctBinaryUpload(
        upload.replace(
          "return customFetch<PhotoUploadReceipt>",
          "return customFetch<OtherReceipt>",
        ),
      ),
    /changed/,
  );
  assert.throws(
    () =>
      correctBinaryUpload(
        upload.replace("  return customFetch<PhotoUploadReceipt>", ""),
      ),
    /changed/,
  );
  assert.throws(
    () =>
      correctBinaryUpload(
        upload.replace(
          "  return customFetch<PhotoUploadReceipt>",
          "  return customFetch<PhotoUploadReceipt>\n  return customFetch<PhotoUploadReceipt>",
        ),
      ),
    /changed/,
  );
  assert.throws(() => correctBinaryUpload(upload + upload), /duplicated/);
  assert.throws(
    () => correctBinaryUpload(upload.replace("JSON.stringify", "JSON.encode")),
    /changed/,
  );
});
