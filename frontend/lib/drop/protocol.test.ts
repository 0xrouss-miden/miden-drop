import { describe, expect, it } from "vitest";

import { base64UrlToBytes, buildDropFragment, bytesToBase64Url, isDropEnvelope, parseDropFragment } from "./protocol";

describe("drop link protocol", () => {
  it("round-trips binary values through base64url", () => {
    const bytes = Uint8Array.from({ length: 64 }, (_, index) => index * 3 % 256);
    expect(base64UrlToBytes(bytesToBase64Url(bytes))).toEqual(bytes);
  });

  it("builds and parses a v1 link fragment", () => {
    const locator = bytesToBase64Url(new Uint8Array(16).fill(7));
    const key = bytesToBase64Url(new Uint8Array(32).fill(9));
    const fragment = buildDropFragment({ version: 1, locator, key });
    expect(parseDropFragment(fragment)).toEqual({ version: 1, locator, key });
  });

  it("rejects malformed or truncated fragments", () => {
    expect(() => parseDropFragment("#v2.bad.bad")).toThrow();
    expect(() => parseDropFragment("#v1.short.short")).toThrow();
  });

  it("requires a supported price pair and positive raw target", () => {
    const envelope = {
      version: 1,
      network: "testnet",
      noteFile: "note",
      noteId: "note-id",
      faucetId: "faucet-id",
      amount: "10",
      expirationBlock: 100,
      pricePair: "BTC/USD",
      rawTargetPrice: "6500000000000",
    };
    expect(isDropEnvelope(envelope)).toBe(true);
    expect(isDropEnvelope({ ...envelope, pricePair: "SOL/USD" })).toBe(false);
    expect(isDropEnvelope({ ...envelope, rawTargetPrice: "0" })).toBe(false);
  });
});
