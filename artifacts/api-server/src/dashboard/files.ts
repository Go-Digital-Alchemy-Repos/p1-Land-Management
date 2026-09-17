import { requireOperationalChild, requireOperationalProperty, operationalChildQuery } from "./operational-property";
import { Router, raw, type Request, type Response, type NextFunction } from "express";
import sharp from "sharp";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { z } from "zod";
import { pool, transaction } from "./database";
import { actor, propertyAccess } from "./access";
import { HttpError, requireRole } from "./policy";
import { createHash, randomUUID } from "node:crypto";
export const filesApi = Router();
let activeUploads = 0;
// Bound buffering and decoding globally; authentication and target authorization precede raw parsing.
const uploadLimit = 4;
const attachmentMimeTypes = new Set([
  "application/pdf",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const requestRoles = ["owner", "manager", "dispatch", "sales", "finance", "client"] as const;

async function requestAttachmentAccess(a: Awaited<ReturnType<typeof actor>>, requestId: string) {
  const request = (await pool.query(
    "SELECT id,property_id FROM service_request WHERE id=$1",
    [requestId],
  )).rows[0];
  if (!request) throw new HttpError(404, "Service request not found");
  await propertyAccess(a, request.property_id);
  return request as { id: string; property_id: string };
}

function attachmentName(value: unknown) {
  const name = z.string().trim().min(1).max(180).parse(value);
  return name.replace(/[^a-zA-Z0-9._() -]/g, "_");
}
function storage() {
  if (
    !process.env.S3_ENDPOINT ||
    !process.env.S3_ACCESS_KEY_ID ||
    !process.env.S3_SECRET_ACCESS_KEY ||
    !process.env.S3_BUCKET
  )
    throw new HttpError(503, "File storage is not configured");
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || "auto",
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  });
}
function validImage(bytes: Buffer, mime: string) {
  return mime === "image/jpeg"
    ? bytes.length > 3 &&
        bytes[0] === 255 &&
        bytes[1] === 216 &&
        bytes[2] === 255
    : mime === "image/png"
      ? bytes
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : mime === "image/webp"
        ? bytes.toString("ascii", 0, 4) === "RIFF" &&
          bytes.toString("ascii", 8, 12) === "WEBP"
        : false;
}
filesApi.post(
  "/files/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    const a = await actor(req);
    requireRole(a.role, ["owner", "manager", "dispatch", "crew"]);
    const propertyId = z.string().uuid().parse(req.headers["x-p1-property"]);
    const workId = z.string().uuid().parse(req.headers["x-p1-work"]);
    await propertyAccess(a, propertyId);
    const work = (await pool.query("SELECT property_id,assigned_to,status FROM work_order WHERE id=$1", [workId])).rows[0];
    if (!work || work.property_id !== propertyId || (a.role === "crew" && (work.assigned_to !== a.id || ["cancelled","skipped","reviewed"].includes(work.status)))) throw new HttpError(403, "Work assignment is not accessible");
    return next();
  },
  async (req: Request, res: Response) => {
    if (activeUploads >= uploadLimit) throw new HttpError(429, "Uploads are busy; retry shortly");
    activeUploads++;
    try {
      await new Promise<void>((resolve,reject) => {
        const abort = () => { cleanup(); reject(new HttpError(400,"Upload interrupted")); };
        const cleanup = () => { req.off("aborted",abort); res.off("close",abort); };
        req.once("aborted",abort); res.once("close",abort);
        raw({type:["image/jpeg","image/png","image/webp"],limit:"15mb"})(req,res,(error) => { cleanup(); error ? reject(error) : resolve(); });
      });
      if (res.destroyed) throw new HttpError(400,"Upload interrupted");
      // Do not release this slot when a client disconnects while decode/storage remains active.
      await processUpload(req,res);
    } finally { activeUploads--; }
  },
  (error: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (error && typeof error === "object" && "type" in error && error.type === "entity.too.large") {
      res.status(413).json({ error: "Image exceeds the 15 MiB upload limit" });
      return;
    }
    next(error);
  },
);
async function processUpload(req: Request, res: Response) {
    const a = await actor(req);
    requireRole(a.role, ["owner", "manager", "dispatch", "crew"]);
    const key = z.string().uuid().parse(req.params.id);
    const propertyId = z.string().uuid().parse(req.headers["x-p1-property"]);
    const workId = z.string().uuid().parse(req.headers["x-p1-work"]);
    const classification = z
      .enum(["before", "during", "after", "issue", "general"])
      .parse(req.headers["x-p1-classification"] || "general");
    await propertyAccess(a, propertyId);
    const work = (
      await pool.query(
        "SELECT property_id,assigned_to,status FROM work_order WHERE id=$1",
        [workId],
      )
    ).rows[0];
    if (
      !work ||
      work.property_id !== propertyId ||
      (a.role === "crew" && (work.assigned_to !== a.id || ["cancelled","skipped","reviewed"].includes(work.status)))
    )
      throw new HttpError(403, "Work assignment is not accessible");
    const original = req.body as Buffer,
      originalMime = req.headers["content-type"] || "";
    if (!Buffer.isBuffer(original) || !validImage(original, originalMime))
      throw new HttpError(400, "Upload a JPEG, PNG, or WebP image");
    let bytes: Buffer;
    try {
      bytes = await sharp(original, { limitInputPixels: 40000000 })
        .rotate()
        .resize({
          width: 2400,
          height: 2400,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 85 })
        .toBuffer();
    } catch {
      throw new HttpError(
        400,
        "Image cannot be decoded or exceeds the image size limit",
      );
    }
    const mime = "image/webp";
    const objectKey = `properties/${propertyId}/${key}-${createHash("sha256").update(bytes).digest("hex")}`;
    // Authorization and immutable operation metadata are checked before touching object storage.
    const existing = (
      await pool.query("SELECT * FROM file_record WHERE id=$1", [key])
    ).rows[0];
    if (
      existing &&
      (existing.user_id !== a.id || existing.object_key !== objectKey ||
        existing.property_id !== propertyId || existing.work_order_id !== workId ||
        existing.classification !== classification)
    )
      throw new HttpError(409, "Photo operation ID conflict");
    if (existing?.status === "ready") {
      res.json({ id: key, status: "accepted" });
      return;
    }
    await transaction(async (c) => {
      await requireOperationalProperty(c,propertyId);
      await c.query(
        "INSERT INTO file_record(id,property_id,work_order_id,user_id,object_key,name,mime,bytes,classification) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(id) DO NOTHING",
        [
          key,
          propertyId,
          workId,
          a.id,
          objectKey,
          classification,
          mime,
          bytes.length,
          classification,
        ],
      );
      const stored = (
        await c.query(
          "SELECT object_key,user_id,property_id,work_order_id,classification FROM file_record WHERE id=$1 FOR UPDATE",
          [key],
        )
      ).rows[0];
      if (stored.object_key !== objectKey || stored.user_id !== a.id ||
        stored.property_id !== propertyId || stored.work_order_id !== workId ||
        stored.classification !== classification)
        throw new HttpError(409, "Photo operation ID conflict");
    });
    await storage().send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: objectKey,
        Body: bytes,
        ContentType: mime,
        Metadata: { classification },
      }),
    );
    await operationalChildQuery("file_record",key,"UPDATE file_record SET status='ready' WHERE id=$1", [
      key,
    ]);
    res.status(201).json({ id: key, status: "accepted" });
}
filesApi.get("/properties/:id/files", async (req, res) => {
  const a = await actor(req);
  const key = z.string().uuid().parse(req.params.id);
  await propertyAccess(a, key);
  res.json(
    (
      await pool.query(
        `SELECT f.id,f.name,f.mime,f.classification,f.published,f.created_at FROM file_record f LEFT JOIN work_order w ON w.id=f.work_order_id WHERE f.property_id=$1 AND f.status='ready' ${a.role === "client" ? "AND f.published=true" : a.role === "crew" ? "AND w.assigned_to=$2" : ""} ORDER BY f.created_at DESC`,
        a.role === "crew" ? [key, a.id] : [key],
      )
    ).rows,
  );
});
filesApi.get("/requests/:id/attachments", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, [...requestRoles]);
  const requestId = z.string().uuid().parse(req.params.id);
  await requestAttachmentAccess(a, requestId);
  res.json((await pool.query(
    "SELECT f.id,f.name,f.mime,f.bytes,f.created_at FROM service_request_attachment a JOIN file_record f ON f.id=a.file_id WHERE a.request_id=$1 AND f.status='ready' ORDER BY a.created_at DESC",
    [requestId],
  )).rows);
});
filesApi.post(
  "/requests/:requestId/attachments/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    const a = await actor(req);
    requireRole(a.role, [...requestRoles]);
    const requestId = z.string().uuid().parse(req.params.requestId);
    await requestAttachmentAccess(a, requestId);
    next();
  },
  async (req: Request, res: Response) => {
    if (activeUploads >= uploadLimit) throw new HttpError(429, "Uploads are busy; retry shortly");
    activeUploads++;
    try {
      await new Promise<void>((resolve, reject) => raw({ type: () => true, limit: "20mb" })(req, res, (error) => error ? reject(error) : resolve()));
      const a = await actor(req);
      const requestId = z.string().uuid().parse(req.params.requestId);
      const fileId = z.string().uuid().parse(req.params.id);
      const request = await requestAttachmentAccess(a, requestId);
      const mime = String(req.headers["content-type"] || "").split(";", 1)[0].toLowerCase();
      if (!attachmentMimeTypes.has(mime)) throw new HttpError(400, "Use a PDF, image, text, Word, or Excel file");
      const bytes = req.body as Buffer;
      if (!Buffer.isBuffer(bytes) || !bytes.length) throw new HttpError(400, "Choose a non-empty file");
      const name = attachmentName(req.headers["x-p1-file-name"]);
      const objectKey = `requests/${requestId}/${fileId}-${createHash("sha256").update(bytes).digest("hex")}`;
      await transaction(async (c) => {
        await c.query("SELECT id FROM service_request WHERE id=$1 FOR UPDATE", [requestId]);
        const count = await c.query("SELECT count(*)::int AS count FROM service_request_attachment WHERE request_id=$1", [requestId]);
        const existing = (await c.query("SELECT * FROM file_record WHERE id=$1", [fileId])).rows[0];
        if (existing && (existing.user_id !== a.id || existing.object_key !== objectKey || existing.property_id !== request.property_id || existing.name !== name || existing.mime !== mime)) throw new HttpError(409, "Attachment operation ID conflict");
        if (!existing && count.rows[0].count >= 5) throw new HttpError(400, "A request can include up to five attachments");
        await c.query("INSERT INTO file_record(id,property_id,user_id,object_key,name,mime,bytes,classification,status) VALUES($1,$2,$3,$4,$5,$6,$7,'general','pending') ON CONFLICT(id) DO NOTHING", [fileId, request.property_id, a.id, objectKey, name, mime, bytes.length]);
        await c.query("INSERT INTO service_request_attachment(id,request_id,file_id) VALUES($1,$2,$3) ON CONFLICT(file_id) DO NOTHING", [randomUUID(), requestId, fileId]);
      });
      const existing = (await pool.query("SELECT status FROM file_record WHERE id=$1", [fileId])).rows[0];
      if (existing.status === "ready") return res.json({ id: fileId, status: "accepted" });
      await storage().send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: objectKey, Body: bytes, ContentType: mime }));
      await pool.query("UPDATE file_record SET status='ready' WHERE id=$1", [fileId]);
      return res.status(201).json({ id: fileId, status: "accepted" });
    } finally { activeUploads--; }
  },
  (error: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (error && typeof error === "object" && "type" in error && error.type === "entity.too.large") return res.status(413).json({ error: "Attachment exceeds the 20 MiB limit" });
    return next(error);
  },
);
filesApi.get("/files/:id/content", async (req, res) => {
  const a = await actor(req);
  const key = z.string().uuid().parse(req.params.id);
  const f = (
    await pool.query(
      "SELECT f.*,a.request_id FROM file_record f LEFT JOIN service_request_attachment a ON a.file_id=f.id WHERE f.id=$1 AND f.status='ready'",
      [key],
    )
  ).rows[0];
  if (!f) throw new HttpError(404, "File not found");
  if (f.request_id) {
    requireRole(a.role, [...requestRoles]);
    await requestAttachmentAccess(a, f.request_id);
  } else await propertyAccess(a, f.property_id);
  if (!f.request_id && a.role === "client" && !f.published)
    throw new HttpError(404, "File not found");
  if (!f.request_id && a.role === "crew") {
    const w = await pool.query(
      "SELECT 1 FROM work_order WHERE id=$1 AND assigned_to=$2",
      [f.work_order_id, a.id],
    );
    if (!w.rowCount) throw new HttpError(404, "File not found");
  }
  const result = await storage().send(
    new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: f.object_key }),
  );
  if (!result.Body) throw new HttpError(404, "File unavailable");
  res
    .type(f.mime)
    .set("Cache-Control", "no-store")
    .set("Content-Disposition", f.request_id ? `attachment; filename="${String(f.name).replace(/["\\]/g, "_")}"` : "inline")
    .send(Buffer.from(await result.Body.transformToByteArray()));
});
filesApi.post("/files/:id/publish", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, ["owner", "manager"]);
  const key = z.string().uuid().parse(req.params.id);
  await transaction(async (c) => {
    await requireOperationalChild(c,"file_record",key);
    const r = await c.query(
      "UPDATE file_record f SET published=true FROM work_order w WHERE f.id=$1 AND f.work_order_id=w.id AND w.property_id=f.property_id AND w.status='reviewed' AND f.status='ready' RETURNING f.id",
      [key],
    );
    if (!r.rowCount)
      throw new HttpError(409, "Review the associated work before publishing");
    await c.query(
      "INSERT INTO audit_event(id,user_id,action,entity_id) VALUES($1,$2,$3,$4)",
      [randomUUID(), a.id, "photo.published", key],
    );
  });
  res.json({ ok: true });
});
