import type { EncryptedDrop } from "./protocol";

export class DropNotFoundError extends Error {}

export async function uploadEncryptedDrop(drop: EncryptedDrop) {
  const response = await fetch("/api/drops", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      version: drop.version,
      locator: drop.locator,
      nonce: drop.nonce,
      ciphertext: drop.ciphertext,
    }),
  });
  if (!response.ok) throw new Error(response.status === 409
    ? "This private link already exists. Create a new encrypted link."
    : "The encrypted drop could not be stored. Try again.");
}

export async function fetchEncryptedDrop(locator: string) {
  const response = await fetch("/api/drops/resolve", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locator }),
  });
  if (response.status === 404) throw new DropNotFoundError("This private drop was not found.");
  if (!response.ok) throw new Error("The private drop could not be loaded. Try again.");
  return await response.json() as { version: 1; nonce: string; ciphertext: string };
}
