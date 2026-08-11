import { describe, expect, it } from "vitest";

import { decryptDropEnvelope, encryptDropEnvelope } from "./crypto";
import { base64UrlToBytes, bytesToBase64Url, type DropEnvelopeV1 } from "./protocol";

const envelope: DropEnvelopeV1 = {
  version: 1,
  network: "testnet",
  noteFile: bytesToBase64Url(new Uint8Array([1, 2, 3, 4])),
  noteId: "0x1234",
  faucetId: "mtst1faucet",
  amount: "125000000",
  expirationBlock: 42_000,
  pricePair: "BTC/USD",
  rawTargetPrice: "6500000000000",
  message: "For coffee ☕",
};

describe("drop encryption", () => {
  it("encrypts and decrypts an authenticated envelope", async () => {
    const encrypted = await encryptDropEnvelope(envelope);
    await expect(decryptDropEnvelope(encrypted.key, encrypted.nonce, encrypted.ciphertext)).resolves.toEqual(envelope);
  });

  it("rejects the wrong key", async () => {
    const encrypted = await encryptDropEnvelope(envelope);
    const wrongKey = bytesToBase64Url(new Uint8Array(32).fill(1));
    await expect(decryptDropEnvelope(wrongKey, encrypted.nonce, encrypted.ciphertext)).rejects.toThrow();
  });

  it("rejects modified ciphertext", async () => {
    const encrypted = await encryptDropEnvelope(envelope);
    const modified = base64UrlToBytes(encrypted.ciphertext);
    modified[0] ^= 1;
    await expect(decryptDropEnvelope(encrypted.key, encrypted.nonce, bytesToBase64Url(modified))).rejects.toThrow();
  });
});
