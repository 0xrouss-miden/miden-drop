import { describe, expect, it } from "vitest";

import { decryptDropEnvelope, encryptDropEnvelope } from "./crypto";
import { base64UrlToBytes, bytesToBase64Url, type DropEnvelopeV1 } from "./protocol";

const envelope: DropEnvelopeV1 = {
  version: 1,
  network: "mainnet",
  midenRelease: "0.17",
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

  it("identifies authenticated testnet links without accepting them on mainnet", async () => {
    const keyBytes = new Uint8Array(32).fill(7);
    const nonce = new Uint8Array(12).fill(9);
    const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
    const ciphertext = await crypto.subtle.encrypt({
      name: "AES-GCM", iv: nonce,
      additionalData: new TextEncoder().encode("miden-drop:v1:testnet"), tagLength: 128,
    }, key, new TextEncoder().encode(JSON.stringify({ ...envelope, network: "testnet", midenRelease: "0.16" })));
    await expect(decryptDropEnvelope(bytesToBase64Url(keyBytes), bytesToBase64Url(nonce), bytesToBase64Url(new Uint8Array(ciphertext))))
      .rejects.toThrow("another Miden network or release");
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
