import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { MidenTransaction } from "@miden-sdk/miden-wallet-adapter-base";
import * as sdk from "@miden-sdk/miden-sdk/lazy";

import { createMidenDrop } from "./drop-client";

// Only the chain client/compiler and wallet are mocked. Notes, request builders,
// fee salts and the adapter's serialized payload use the actual browser WASM SDK.
vi.mock("@miden-sdk/miden-sdk/lazy", async (importOriginal) => {
  const real = await importOriginal<typeof sdk>();
  return {
    ...real,
    MidenClient: {
      ready: async () => {},
      createTestnet: async () => ({
        syncChain: async () => {},
        getSyncHeight: async () => 100,
        compile: { noteScript: async () => real.NoteScript.p2id() },
      }),
    },
  };
});

beforeAll(() => {
  const { initSync } = sdk as typeof sdk & { initSync(input: { module: Buffer }): unknown };
  initSync({ module: readFileSync("node_modules/@miden-sdk/miden-sdk/dist/st/assets/miden_client_web.wasm") });
});

describe("drop creation wallet requests", () => {
  it.each([false, true])("preserves the private output note and guardian=%s fee salt", async (guardian) => {
    let outputNotes: sdk.Note[] = [];
    let salt: bigint[] | undefined;
    const wallet = {
      address: "0x3b306d819a19b691205480e1619b5c",
      requestGuardianInfo: vi.fn().mockResolvedValue({ isGuardianAccount: guardian }),
      requestTransaction: vi.fn(async (transaction: MidenTransaction) => {
        if (!("transactionRequest" in transaction.payload)) throw new Error("Expected custom transaction");
        const request = sdk.TransactionRequest.deserialize(Buffer.from(transaction.payload.transactionRequest, "base64"));
        const feeSalt = request.feeConversionSalt();
        try {
          salt = feeSalt ? Array.from(feeSalt.toU64s()) : undefined;
          outputNotes = request.expectedOutputOwnNotes();
        } finally {
          feeSalt?.free(); request.free();
        }
        return "tx-created";
      }),
      waitForTransaction: vi.fn(async () => ({ txHash: "tx-created", outputNotes })),
    };
    try {
      const result = await createMidenDrop({
        wallet, amount: BigInt(100), expirationDays: 1, blocksPerDay: 28800,
        faucetId: "0x18101fa522c174b165efd4f70a0385",
      });
      expect(result.transactionId).toBe("tx-created");
      expect(result.envelope.midenRelease).toBe("0.16");
      expect(result.envelope.expirationBlock).toBe(28900);
      expect(outputNotes).toHaveLength(1);
      const id = outputNotes[0].id();
      try { expect(result.envelope.noteId).toBe(id.toString()); } finally { id.free(); }
      expect(wallet.requestGuardianInfo).toHaveBeenCalledOnce();
      if (guardian) expect(salt).toHaveLength(4);
      else expect(salt).toBeUndefined();
    } finally {
      outputNotes.forEach((note) => note.free());
    }
  });
});
