import { z } from "zod";

const base64Url = z.string().min(1).regex(/^[A-Za-z0-9_-]+$/);

export const createDropRequestSchema = z.object({
  version: z.literal(1),
  locator: base64Url,
  nonce: base64Url,
  ciphertext: base64Url,
}).strict();

export const resolveDropRequestSchema = z.object({
  locator: base64Url,
}).strict();

export function decodeCreateDropRequest(input: unknown) {
  const parsed = createDropRequestSchema.parse(input);
  const locator = decodeBase64Url(parsed.locator);
  const nonce = decodeBase64Url(parsed.nonce);
  const ciphertext = decodeBase64Url(parsed.ciphertext);

  if (locator.byteLength !== 16) throw new InvalidDropRequestError();
  if (nonce.byteLength !== 12) throw new InvalidDropRequestError();
  if (ciphertext.byteLength < 17 || ciphertext.byteLength > 256 * 1024) {
    throw new InvalidDropRequestError();
  }

  return { locator, nonce, ciphertext };
}

export function decodeResolveDropRequest(input: unknown) {
  const parsed = resolveDropRequestSchema.parse(input);
  const locator = decodeBase64Url(parsed.locator);
  if (locator.byteLength !== 16) throw new InvalidDropRequestError();
  return { locator };
}

export function encodeBase64Url(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64url");
}

function decodeBase64Url(value: string) {
  return new Uint8Array(Buffer.from(value, "base64url"));
}

export class InvalidDropRequestError extends Error {}
