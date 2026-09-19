import { beforeEach, afterEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ snapshot: vi.fn(), send: vi.fn(), domain: vi.fn(), client: vi.fn(), mailgun: vi.fn() }));
vi.mock("../storage/index", () => ({ storage: { settings: { getCategorySnapshot: state.snapshot } } }));
vi.mock("@aws-sdk/client-s3", () => ({ S3Client: class { constructor(config: unknown) { state.client(config); } send = state.send; }, ...Object.fromEntries(["PutObjectCommand", "GetObjectCommand", "DeleteObjectCommand", "HeadBucketCommand", "ListObjectsV2Command"].map(name => [name, class { constructor(public input: unknown) {} }])) }));
vi.mock("mailgun.js", () => ({ default: class { client(config: unknown) { state.mailgun(config); return { domains: { get: state.domain } }; } } }));
vi.mock("../utils/logger", () => ({ logger: { r2: { warn: vi.fn(), error: vi.fn() }, backup: { warn: vi.fn(), error: vi.fn() }, email: { warn: vi.fn(), error: vi.fn() } } }));
import { testMailgunConnection } from "./email.service";
import { testConnection, resetClient } from "./r2.service";
import { getBackupStorageInfo, resetBackupStorageClient } from "./backup-storage.service";
let values: Record<string, string>;
beforeEach(() => {
  vi.clearAllMocks(); resetClient(); resetBackupStorageClient();
  for (const prefix of ["S3", "BACKUP_S3"]) for (const key of ["ENDPOINT", "ACCESS_KEY_ID", "SECRET_ACCESS_KEY", "BUCKET", "REGION", "FORCE_PATH_STYLE"]) vi.stubEnv(`${prefix}_${key}`, undefined);
  for (const key of ["ACCOUNT_ID", "ACCESS_KEY_ID", "SECRET_ACCESS_KEY", "BUCKET_NAME"]) vi.stubEnv(`BACKUP_R2_${key}`, undefined);
  values = { mailgun_api_key: "old", mailgun_domain: "mg.example.com", r2_account_id: "account", r2_access_key_id: "key", r2_secret_access_key: "old", r2_bucket_name: "old-bucket" };
  state.snapshot.mockImplementation(async () => ({ values: { ...values }, version: "revision" }));
  state.send.mockResolvedValue({}); state.domain.mockResolvedValue({});
});
afterEach(() => vi.unstubAllEnvs());
it("Mailgun observes replacement and clearing without local reset, and fails closed on read error", async () => {
  expect((await testMailgunConnection()).success).toBe(true);
  values.mailgun_api_key = "new";
  expect((await testMailgunConnection()).success).toBe(true);
  expect(state.mailgun.mock.calls.map(args => args[0].key)).toEqual(["old", "new"]);
  values.mailgun_api_key = "";
  expect((await testMailgunConnection()).success).toBe(false);
  values.mailgun_api_key = "new"; state.snapshot.mockRejectedValueOnce(new Error("unavailable"));
  expect((await testMailgunConnection()).success).toBe(false); expect(state.mailgun).toHaveBeenCalledTimes(2);
});
it("upload and backup clients independently observe shared database updates without resets", async () => {
  await testConnection(); expect((await getBackupStorageInfo())?.bucketName).toBe("old-bucket");
  values.r2_secret_access_key = "new"; values.r2_bucket_name = "new-bucket";
  await testConnection(); expect((await getBackupStorageInfo())?.bucketName).toBe("new-bucket");
  expect(state.client.mock.calls.map(args => args[0].credentials.secretAccessKey)).toEqual(["old", "old", "new", "new"]);
  values.r2_secret_access_key = "";
  expect((await testConnection()).success).toBe(false); expect(await getBackupStorageInfo()).toBeNull();
  values.r2_secret_access_key = "restored";
  await testConnection(); expect((await getBackupStorageInfo())?.bucketName).toBe("new-bucket");
});
it("failed fresh reads never reuse an established storage client", async () => {
  await testConnection(); await getBackupStorageInfo();
  state.snapshot.mockRejectedValue(new Error("database unavailable"));
  expect((await testConnection()).success).toBe(false); expect(await getBackupStorageInfo()).toBeNull(); expect(state.send).toHaveBeenCalledOnce();
});
it("deployment precedence avoids database reads and partial deployment fails closed", async () => {
  for (const [key, value] of Object.entries({ ENDPOINT: "https://storage.example.test", ACCESS_KEY_ID: "env", SECRET_ACCESS_KEY: "env-secret", BUCKET: "env-bucket" })) vi.stubEnv(`S3_${key}`, value);
  await testConnection(); expect((await getBackupStorageInfo())?.bucketName).toBe("env-bucket"); expect(state.snapshot).not.toHaveBeenCalled();
  vi.stubEnv("S3_SECRET_ACCESS_KEY", "");
  expect((await testConnection()).success).toBe(false); expect(await getBackupStorageInfo()).toBeNull(); expect(state.snapshot).not.toHaveBeenCalled();
});
it("unchanged fresh config reuses clients, and an already-started request can finish after rotation", async () => {
  let finish!: (value: unknown) => void;
  state.send.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const prior = testConnection();
  await vi.waitFor(() => expect(state.send).toHaveBeenCalledOnce());
  values.r2_secret_access_key = "rotated";
  expect((await testConnection()).success).toBe(true);
  finish({}); expect((await prior).success).toBe(true);
  await testConnection(); expect(state.client).toHaveBeenCalledTimes(2);
});
