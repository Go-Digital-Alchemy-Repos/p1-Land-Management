import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import {
  raw,
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import sharp from "sharp";
import { actor } from "./access";
import { pool, transaction } from "./database";
import { HttpError } from "./policy";

export const profileApi = Router();

// Avatar uploads are buffered before Sharp decodes them. Keep that short-lived
// memory and CPU work bounded independently of the caller's network speed.
// Authentication still occurs before a slot is claimed, so unauthenticated
// traffic cannot exhaust the limit.
let activeAvatarUploads = 0;
const avatarUploadLimit = 4;

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

function supportedImage(bytes: Buffer, mime: string) {
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

profileApi.get("/profile/avatar", async (req, res) => {
  const a = await actor(req);
  const avatar = (
    await pool.query(
      "SELECT object_key,mime FROM account_avatar WHERE user_id=$1",
      [a.id],
    )
  ).rows[0];
  if (!avatar) throw new HttpError(404, "Avatar not found");
  const object = await storage().send(
    new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: avatar.object_key,
    }),
  );
  if (!object.Body) throw new HttpError(404, "Avatar unavailable");
  res
    .type(avatar.mime)
    .set("Cache-Control", "private, no-store")
    .send(Buffer.from(await object.Body.transformToByteArray()));
});

profileApi.post(
  "/profile/avatar",
  async (req: Request, res: Response) => {
    const a = await actor(req);
    if (activeAvatarUploads >= avatarUploadLimit)
      throw new HttpError(429, "Avatar uploads are busy; retry shortly");
    activeAvatarUploads++;
    try {
      await new Promise<void>((resolve, reject) =>
        raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: "5mb" })(
          req,
          res,
          (error) => (error ? reject(error) : resolve()),
        ),
      );
      const original = req.body as Buffer;
      const mime = String(req.headers["content-type"] || "");
      if (!Buffer.isBuffer(original) || !supportedImage(original, mime))
        throw new HttpError(400, "Upload a JPEG, PNG, or WebP image");
      let image: Buffer;
      try {
        image = await sharp(original, { limitInputPixels: 16_000_000 })
          .rotate()
          .resize(512, 512, { fit: "cover", position: "attention" })
          .webp({ quality: 86 })
          .toBuffer();
      } catch {
        throw new HttpError(
          400,
          "Image cannot be decoded or exceeds the image size limit",
        );
      }
      const objectKey = `avatars/${a.id}/${randomUUID()}.webp`;
      await storage().send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: objectKey,
          Body: image,
          ContentType: "image/webp",
          CacheControl: "private, no-store",
        }),
      );
      const previous = await transaction(async (client) => {
        const old = (
          await client.query(
            "SELECT object_key FROM account_avatar WHERE user_id=$1 FOR UPDATE",
            [a.id],
          )
        ).rows[0];
        await client.query(
          `INSERT INTO account_avatar(user_id,object_key,mime,bytes,updated_at)
           VALUES($1,$2,'image/webp',$3,now())
           ON CONFLICT(user_id) DO UPDATE SET object_key=EXCLUDED.object_key,mime=EXCLUDED.mime,bytes=EXCLUDED.bytes,updated_at=now()`,
          [a.id, objectKey, image.length],
        );
        await client.query(
          "INSERT INTO audit_event(id,user_id,action,entity_id) VALUES($1,$2,'account.avatar.updated',$2)",
          [randomUUID(), a.id],
        );
        return old?.object_key as string | undefined;
      });
      if (previous)
        await storage()
          .send(
            new DeleteObjectCommand({
              Bucket: process.env.S3_BUCKET,
              Key: previous,
            }),
          )
          .catch(() => undefined);
      res
        .status(201)
        .json({ avatarUrl: `/api/v1/profile/avatar?v=${Date.now()}` });
    } finally {
      activeAvatarUploads--;
    }
  },
  (error: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (
      error &&
      typeof error === "object" &&
      "type" in error &&
      error.type === "entity.too.large"
    ) {
      res
        .status(413)
        .json({ error: "Avatar image exceeds the 5 MiB upload limit" });
      return;
    }
    next(error);
  },
);
