const PRIVATE_R2_PREFIXES = ["career-resumes/"];

export function isPublicR2Key(key: string): boolean {
  return (
    Boolean(key) &&
    !key.includes("..") &&
    !PRIVATE_R2_PREFIXES.some((prefix) => key.startsWith(prefix))
  );
}
