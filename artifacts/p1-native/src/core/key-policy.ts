/** No silent reset when an OS restore/key invalidation strands encrypted work. */
export async function obtainDatabaseKey(input: {
  databaseExists: boolean;
  readKey(): Promise<string | null>;
  generateKey(): Promise<string>;
  persistKey(key: string): Promise<void>;
}) {
  const existing = await input.readKey();
  if (existing) {
    if (!/^[a-f0-9]{64}$/.test(existing))
      throw new Error(
        "Protected storage key is invalid. Recovery is required.",
      );
    return existing;
  }
  if (input.databaseExists)
    throw new Error(
      "Protected work exists but its key is unavailable. Recovery is required.",
    );
  const key = await input.generateKey();
  if (!/^[a-f0-9]{64}$/.test(key))
    throw new Error("Secure key generation failed.");
  await input.persistKey(key);
  return key;
}
