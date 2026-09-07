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
    next();
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
filesApi.get("/files/:id/content", async (req, res) => {
  const a = await actor(req);
  const key = z.string().uuid().parse(req.params.id);
  const f = (
    await pool.query(
      "SELECT * FROM file_record WHERE id=$1 AND status='ready'",
      [key],
    )
  ).rows[0];
  if (!f) throw new HttpError(404, "File not found");
  await propertyAccess(a, f.property_id);
  if (a.role === "client" && !f.published)
    throw new HttpError(404, "File not found");
  if (a.role === "crew") {
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
