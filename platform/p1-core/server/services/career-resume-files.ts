import { constants } from "node:fs";
import { open, realpath } from "node:fs/promises";
import path from "node:path";

function contained(directory: string, file: string): boolean {
  const relative = path.relative(directory, file);
  return (
    Boolean(relative) &&
    !path.isAbsolute(relative) &&
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`)
  );
}

/** Read only regular files contained in the configured resume storage directory. */
export async function readLocalCareerResume(
  directory: string,
  file: string,
): Promise<Buffer | null> {
  if (!file || file.includes("\0") || path.isAbsolute(file)) return null;
  const candidate = path.resolve(directory, file);
  if (!contained(directory, candidate)) return null;
  try {
    // Resolve both sides so a configured symlink root works, but escaping links do not.
    const root = await realpath(directory);
    const target = await realpath(candidate);
    if (!contained(root, target)) return null;
    const handle = await open(
      target,
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
    try {
      if (!(await handle.stat()).isFile()) return null;
      return await handle.readFile();
    } finally {
      await handle.close();
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (["ENOENT", "ENOTDIR", "ELOOP"].includes(code || "")) return null;
    throw error;
  }
}
