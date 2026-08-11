import { createHash } from "node:crypto";

import { eq } from "drizzle-orm";

import { getDatabase } from "./db";
import { encryptedDrops } from "./db/schema";

export type StoredEncryptedDrop = {
  version: 1;
  nonce: Uint8Array;
  ciphertext: Uint8Array;
};

export class DropAlreadyExistsError extends Error {}

export function hashLocator(locator: Uint8Array) {
  return createHash("sha256").update(locator).digest("hex");
}

export async function storeEncryptedDrop(
  locator: Uint8Array,
  nonce: Uint8Array,
  ciphertext: Uint8Array,
) {
  try {
    await getDatabase().insert(encryptedDrops).values({
      locatorHash: hashLocator(locator),
      ciphertext: Buffer.from(ciphertext),
      nonce: Buffer.from(nonce),
      protocolVersion: 1,
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new DropAlreadyExistsError();
    throw error;
  }
}

export async function resolveEncryptedDrop(locator: Uint8Array): Promise<StoredEncryptedDrop | null> {
  const [record] = await getDatabase()
    .select({
      version: encryptedDrops.protocolVersion,
      nonce: encryptedDrops.nonce,
      ciphertext: encryptedDrops.ciphertext,
    })
    .from(encryptedDrops)
    .where(eq(encryptedDrops.locatorHash, hashLocator(locator)))
    .limit(1);

  if (!record || record.version !== 1) return null;
  return {
    version: 1,
    nonce: new Uint8Array(record.nonce),
    ciphertext: new Uint8Array(record.ciphertext),
  };
}

function isUniqueViolation(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; cause?: { code?: string } };
  return candidate.code === "23505" || candidate.cause?.code === "23505";
}
