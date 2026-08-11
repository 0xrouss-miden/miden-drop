import { isMidenPricePairId, type MidenPricePairId } from "@/lib/miden/price-pairs";

export const DROP_PROTOCOL_VERSION = 1 as const;
export const DROP_NETWORK = "testnet" as const;
export const DROP_AAD = "miden-drop:v1:testnet";

export type DropEnvelopeV1 = {
  version: typeof DROP_PROTOCOL_VERSION;
  network: typeof DROP_NETWORK;
  noteFile: string;
  noteId: string;
  faucetId: string;
  amount: string;
  expirationBlock: number;
  pricePair?: MidenPricePairId;
  rawTargetPrice?: string;
  message?: string;
};

export type EncryptedDrop = {
  version: typeof DROP_PROTOCOL_VERSION;
  locator: string;
  key: string;
  nonce: string;
  ciphertext: string;
};

export type DropLinkSecret = {
  version: typeof DROP_PROTOCOL_VERSION;
  locator: string;
  key: string;
};

export function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

export function base64UrlToBytes(value: string) {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw new Error("Invalid base64url value.");
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function buildDropFragment(secret: DropLinkSecret) {
  return `#v${secret.version}.${secret.locator}.${secret.key}`;
}

export function parseDropFragment(fragment: string): DropLinkSecret {
  const match = /^#v1\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/u.exec(fragment);
  if (!match) throw new Error("Invalid private drop link.");

  const locator = base64UrlToBytes(match[1]);
  const key = base64UrlToBytes(match[2]);
  if (locator.byteLength !== 16 || key.byteLength !== 32) {
    throw new Error("Invalid private drop link.");
  }

  return { version: DROP_PROTOCOL_VERSION, locator: match[1], key: match[2] };
}

export function isDropEnvelope(value: unknown): value is DropEnvelopeV1 {
  if (!value || typeof value !== "object") return false;
  const envelope = value as Partial<DropEnvelopeV1>;
  const hasPriceCondition = envelope.pricePair !== undefined || envelope.rawTargetPrice !== undefined;
  return envelope.version === DROP_PROTOCOL_VERSION
    && envelope.network === DROP_NETWORK
    && typeof envelope.noteFile === "string"
    && typeof envelope.noteId === "string"
    && typeof envelope.faucetId === "string"
    && typeof envelope.amount === "string"
    && /^\d+$/u.test(envelope.amount)
    && typeof envelope.expirationBlock === "number"
    && Number.isSafeInteger(envelope.expirationBlock)
    && envelope.expirationBlock > 0
    && (!hasPriceCondition || (
      isMidenPricePairId(envelope.pricePair)
      && typeof envelope.rawTargetPrice === "string"
      && /^[1-9]\d*$/u.test(envelope.rawTargetPrice)
    ))
    && (envelope.message === undefined || typeof envelope.message === "string");
}
