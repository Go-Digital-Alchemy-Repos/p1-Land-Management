import { constants } from "node:fs";
import { open } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";
import { validateLegacyUploadApproval } from "../services/legacy-upload-source-verification";

export async function readApplyInput(path: string) {
  if (!path || path.length > 4096 || path.includes("\0")) throw new Error("Invalid input");
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = await file.stat();
    if (
      !stat.isFile() ||
      stat.size > 65536 ||
      (stat.mode & 0o777) !== 0o600 ||
      stat.uid !== process.getuid?.()
    )
      throw new Error("Invalid input file");
    const buffer = Buffer.alloc(65537);
    let length = 0;
    while (length < buffer.length) {
      const { bytesRead } = await file.read(buffer, length, buffer.length - length, null);
      if (!bytesRead) break;
      length += bytesRead;
    }
    if (length > 65536) throw new Error("Input limit exceeded");
    return {
      value: JSON.parse(buffer.subarray(0, length).toString("utf8")) as unknown,
      device: stat.dev,
      inode: stat.ino,
    };
  } finally {
    await file.close();
  }
}

const reference = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine(
    (value) =>
      !Array.from(value).some(
        (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
      ),
  );
const applyApprovalSchema = z
  .object({
    schemaVersion: z.literal(1),
    action: z.literal("copy-exact-object"),
    sourceApproval: z.unknown(),
    writerDrainAttestationId: reference,
  })
  .strict();
const drainSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: reference,
    planId: z.string(),
    sourceIdentity: z.unknown(),
    target: z.unknown(),
    operatorReference: reference,
    attestedAt: z.string().datetime(),
    statement: z.literal("writers-drained-and-frozen"),
  })
  .strict();

export function validateApplyInputs(
  planInput: unknown,
  approvalInput: unknown,
  drainInput: unknown,
) {
  const approval = applyApprovalSchema.parse(approvalInput);
  const verified = validateLegacyUploadApproval(approval.sourceApproval, planInput);
  if (verified.plan.schemaVersion !== 2 || verified.plan.entries.length !== 1)
    throw new Error("Apply requires one exact v2 object");
  const drain = drainSchema.parse(drainInput);
  if (drain.id !== approval.writerDrainAttestationId || drain.planId !== verified.plan.planId)
    throw new Error("Drain attestation mismatch");
  validateLegacyUploadApproval(
    { ...verified.approval, sourceIdentity: drain.sourceIdentity, target: drain.target },
    verified.plan,
  );
  return { ...verified, drain };
}

export interface ApplyLedger {
  append(record: Record<string, unknown>): Promise<void>;
  close(): Promise<void>;
}
export async function createApplyLedger(path: string): Promise<ApplyLedger> {
  if (!path || path.length > 4096 || path.includes("\0")) throw new Error("Invalid ledger path");
  const file = await open(
    path,
    constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
    0o600,
  );
  let failed = false;
  try {
    const stat = await file.stat();
    if (
      !stat.isFile() ||
      stat.nlink !== 1 ||
      (stat.mode & 0o777) !== 0o600 ||
      stat.uid !== process.getuid?.()
    )
      throw new Error("Invalid ledger file");
    // Persist the new directory entry as well as each subsequent result record.
    const directory = await open(dirname(path), constants.O_RDONLY | constants.O_DIRECTORY);
    try {
      await directory.sync();
    } finally {
      await directory.close();
    }
  } catch (error) {
    await file.close();
    throw error;
  }
  return {
    async append(record) {
      if (failed) throw new Error("Ledger is unavailable");
      try {
        await file.writeFile(JSON.stringify(record) + "\n");
        await file.sync();
      } catch (error) {
        failed = true;
        throw error;
      }
    },
    async close() {
      await file.close();
    },
  };
}
