import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  storeEncryptedDrop: vi.fn(),
  resolveEncryptedDrop: vi.fn(),
  DropAlreadyExistsError: class DropAlreadyExistsError extends Error {},
}));

vi.mock("@/lib/server/drops", () => ({
  DropAlreadyExistsError: mocks.DropAlreadyExistsError,
  storeEncryptedDrop: mocks.storeEncryptedDrop,
  resolveEncryptedDrop: mocks.resolveEncryptedDrop,
}));

import { POST as createDrop } from "./route";
import { POST as resolveDrop } from "./resolve/route";
import { DropAlreadyExistsError } from "@/lib/server/drops";
import { encodeBase64Url } from "@/lib/server/drop-request";

const locator = encodeBase64Url(new Uint8Array(16).fill(1));
const nonce = encodeBase64Url(new Uint8Array(12).fill(2));
const ciphertext = encodeBase64Url(new Uint8Array(17).fill(3));

describe("encrypted drop Route Handlers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stores a validated encrypted payload without caching", async () => {
    const response = await createDrop(jsonRequest("http://localhost/api/drops", { version: 1, locator, nonce, ciphertext }));
    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.storeEncryptedDrop).toHaveBeenCalledOnce();
  });

  it("returns 409 for a locator collision", async () => {
    mocks.storeEncryptedDrop.mockRejectedValueOnce(new DropAlreadyExistsError());
    const response = await createDrop(jsonRequest("http://localhost/api/drops", { version: 1, locator, nonce, ciphertext }));
    expect(response.status).toBe(409);
  });

  it("returns the encrypted blob for a valid locator", async () => {
    mocks.resolveEncryptedDrop.mockResolvedValueOnce({
      version: 1,
      nonce: new Uint8Array(12).fill(2),
      ciphertext: new Uint8Array(17).fill(3),
    });
    const response = await resolveDrop(jsonRequest("http://localhost/api/drops/resolve", { locator }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ version: 1, nonce, ciphertext });
  });

  it("uses the same 404 for malformed and unknown locators", async () => {
    mocks.resolveEncryptedDrop.mockResolvedValueOnce(null);
    const unknown = await resolveDrop(jsonRequest("http://localhost/api/drops/resolve", { locator }));
    const malformed = await resolveDrop(jsonRequest("http://localhost/api/drops/resolve", { locator: "bad" }));
    expect(unknown.status).toBe(404);
    expect(malformed.status).toBe(404);
    expect(await unknown.json()).toEqual(await malformed.json());
  });
});

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
