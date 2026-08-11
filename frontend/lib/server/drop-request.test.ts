import { describe, expect, it } from "vitest";

import { decodeCreateDropRequest, decodeResolveDropRequest, encodeBase64Url } from "./drop-request";

describe("encrypted drop request validation", () => {
  const locator = encodeBase64Url(new Uint8Array(16).fill(1));
  const nonce = encodeBase64Url(new Uint8Array(12).fill(2));
  const ciphertext = encodeBase64Url(new Uint8Array(17).fill(3));

  it("accepts the exact v1 wire format", () => {
    expect(decodeCreateDropRequest({ version: 1, locator, nonce, ciphertext }).ciphertext).toHaveLength(17);
    expect(decodeResolveDropRequest({ locator }).locator).toHaveLength(16);
  });

  it("rejects extra fields and incorrect binary sizes", () => {
    expect(() => decodeCreateDropRequest({ version: 1, locator, nonce, ciphertext, key: "secret" })).toThrow();
    expect(() => decodeResolveDropRequest({ locator: encodeBase64Url(new Uint8Array(15)) })).toThrow();
    expect(() => decodeCreateDropRequest({ version: 1, locator, nonce, ciphertext: encodeBase64Url(new Uint8Array(256 * 1024 + 1)) })).toThrow();
  });
});
