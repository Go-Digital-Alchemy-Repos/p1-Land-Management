import { Readable } from "node:stream";
import { GetObjectCommand, PutObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createLegacyUploadStorage } from "./legacy-upload-storage";

function fixture(maxBytes = 10) {
  const send = vi.fn();
  const client = { send } as unknown as S3Client;
  return { send, storage: createLegacyUploadStorage(client, "owned-bucket", maxBytes) };
}
const failure = (code: number) =>
  Object.assign(new Error(`HTTP ${code}`), { $metadata: { httpStatusCode: code } });

describe("legacy upload storage", () => {
  afterEach(() => vi.useRealTimers());

  it.each(["read", "createOnly"] as const)(
    "aborts a stalled SDK %s request at the operation deadline",
    async (operation) => {
      vi.useFakeTimers();
      let observedSignal: AbortSignal | undefined;
      const send = vi.fn(
        (_command, options: { abortSignal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            observedSignal = options.abortSignal;
            options.abortSignal.addEventListener(
              "abort",
              () => reject(new Error("request aborted")),
              { once: true },
            );
          }),
      );
      const storage = createLegacyUploadStorage(
        { send } as unknown as S3Client,
        "owned-bucket",
        10,
        50,
      );
      const pending =
        operation === "read"
          ? storage.read("key")
          : storage.createOnly("key", { body: Buffer.from("a") });
      const rejected = expect(pending).rejects.toThrow("request aborted");
      await vi.advanceTimersByTimeAsync(50);
      await rejected;
      expect(observedSignal?.aborted).toBe(true);
      expect(send).toHaveBeenCalledOnce();
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("uses one deadline across GET headers and stalled body and destroys the body", async () => {
    vi.useFakeTimers();
    const body = new Readable({ read() {} });
    const send = vi.fn(
      (_command, _options) =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ Body: body }), 30);
        }),
    );
    const storage = createLegacyUploadStorage(
      { send } as unknown as S3Client,
      "owned-bucket",
      10,
      50,
    );
    const pending = storage.read("key");
    const rejected = expect(pending).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(30);
    expect(body.destroyed).toBe(false);
    await vi.advanceTimersByTimeAsync(20);
    await rejected;
    expect(body.destroyed).toBe(true);
    expect(send.mock.calls[0][1].abortSignal.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rejects bodies that cannot be cancelled", async () => {
    const { send, storage } = fixture();
    send.mockResolvedValue({
      Body: {
        async *[Symbol.asyncIterator]() {
          yield Buffer.from("a");
        },
      },
    });
    await expect(storage.read("key")).rejects.toThrow("cancellable Node stream");
  });

  it("clears deadlines after successful reads and writes", async () => {
    vi.useFakeTimers();
    const { send, storage } = fixture();
    send
      .mockResolvedValueOnce({ Body: Readable.from([Buffer.from("a")]) })
      .mockResolvedValueOnce({});
    await storage.read("key");
    await storage.createOnly("key", { body: Buffer.from("a") });
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(send.mock.calls.every(([, options]) => !options.abortSignal.aborted)).toBe(true);
  });

  it.each([0, -1, 0.5, Infinity, 300_001])("rejects invalid timeout %s", (timeout) => {
    expect(() => createLegacyUploadStorage({} as S3Client, "owned-bucket", 10, timeout)).toThrow(
      "timeout",
    );
  });
  it("reads exact bucket/key bytes and standard metadata without namespace or environment discovery", async () => {
    const { send, storage } = fixture();
    send.mockResolvedValue({
      Body: Readable.from([Buffer.from([0, 255]), Buffer.from("abc")]),
      ContentLength: 5,
      ContentType: "image/png",
      CacheControl: "public, max-age=60",
      ContentDisposition: "inline",
      ETag: '"v1"',
      VersionId: "source-version",
    });
    expect(await storage.read("old/images/a.png")).toEqual({
      body: Buffer.from([0, 255, 97, 98, 99]),
      contentType: "image/png",
      cacheControl: "public, max-age=60",
      contentDisposition: "inline",
      etag: '"v1"',
      versionId: "source-version",
    });
    expect(storage.bucketName).toBe("owned-bucket");
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toBeInstanceOf(GetObjectCommand);
    expect(send.mock.calls[0][0].input).toEqual({
      Bucket: "owned-bucket",
      Key: "old/images/a.png",
    });
  });

  it("enforces declared size before reading and destroys the stream", async () => {
    const { send, storage } = fixture();
    const body = Readable.from([Buffer.alloc(11)]);
    const iterator = vi.spyOn(body, Symbol.asyncIterator);
    send.mockResolvedValue({ Body: body, ContentLength: 11 });
    await expect(storage.read("key")).rejects.toThrow("byte limit");
    expect(iterator).not.toHaveBeenCalled();
    expect(body.destroyed).toBe(true);
  });

  it("enforces actual cumulative size without trusting missing or understated headers", async () => {
    for (const ContentLength of [undefined, 2]) {
      const { send, storage } = fixture();
      const body = Readable.from([Buffer.alloc(6), Buffer.alloc(5)]);
      send.mockResolvedValue({ Body: body, ContentLength });
      await expect(storage.read("key")).rejects.toThrow("byte limit");
      expect(body.destroyed).toBe(true);
    }
  });

  it("rejects truncated bodies and stream failures", async () => {
    const { send, storage } = fixture();
    send.mockResolvedValueOnce({ Body: Readable.from([Buffer.from("x")]), ContentLength: 2 });
    await expect(storage.read("key")).rejects.toThrow("length does not match");
    send.mockResolvedValueOnce({
      Body: Readable.from(
        (async function* () {
          yield Buffer.from("a");
          throw new Error("stream failed");
        })(),
      ),
    });
    await expect(storage.read("key")).rejects.toThrow("stream failed");
  });

  it("accepts empty objects and exactly the byte limit", async () => {
    const { send, storage } = fixture();
    for (const size of [0, 10]) {
      send.mockResolvedValueOnce({
        Body: Readable.from([Buffer.alloc(size)]),
        ContentLength: size,
      });
      expect((await storage.read("key"))?.body.length).toBe(size);
    }
  });

  it("returns null only for 404 and preserves other SDK errors", async () => {
    const { send, storage } = fixture();
    send.mockRejectedValueOnce(failure(404));
    expect(await storage.read("missing")).toBeNull();
    for (const code of [403, 429, 500]) {
      const error = failure(code);
      send.mockRejectedValueOnce(error);
      await expect(storage.read("key")).rejects.toBe(error);
    }
  });

  it("creates with atomic IfNoneMatch only, preserving content metadata but not source version IDs", async () => {
    const { send, storage } = fixture();
    send.mockResolvedValue({});
    const body = Buffer.from("abc");
    expect(
      await storage.createOnly("clients/core/uploads/a", {
        body,
        contentType: "image/png",
        cacheControl: "max-age=30",
        contentDisposition: "inline",
        etag: "old",
        versionId: "old-version",
      }),
    ).toBe("created");
    expect(send.mock.calls[0][0]).toBeInstanceOf(PutObjectCommand);
    expect(send.mock.calls[0][0].input).toEqual({
      Bucket: "owned-bucket",
      Key: "clients/core/uploads/a",
      Body: body,
      ContentLength: 3,
      ContentType: "image/png",
      CacheControl: "max-age=30",
      ContentDisposition: "inline",
      IfNoneMatch: "*",
    });
  });

  it("reports a 412 race without overwrite; propagates 409 without adapter retry", async () => {
    const { send, storage } = fixture();
    send.mockRejectedValueOnce(failure(412));
    expect(await storage.createOnly("key", { body: Buffer.from("a") })).toBe("already-exists");
    const conflict = failure(409);
    send.mockRejectedValueOnce(conflict);
    await expect(storage.createOnly("key", { body: Buffer.from("a") })).rejects.toBe(conflict);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls.every(([command]) => command.input.IfNoneMatch === "*")).toBe(true);
  });

  it("rejects oversized writes and invalid paths before SDK calls", async () => {
    const { send, storage } = fixture();
    await expect(storage.createOnly("key", { body: Buffer.alloc(11) })).rejects.toThrow();
    for (const key of ["", "/root", "a/../b", "a//b", "a\\b", "a\nkey"]) {
      await expect(storage.read(key)).rejects.toThrow();
      await expect(storage.createOnly(key, { body: Buffer.alloc(1) })).rejects.toThrow();
    }
    expect(send).not.toHaveBeenCalled();
  });

  it.each([0, -1, 0.5, Infinity, 100 * 1024 * 1024 + 1])(
    "rejects invalid configured size %s",
    (limit) => {
      expect(() => fixture(limit)).toThrow();
    },
  );
});
