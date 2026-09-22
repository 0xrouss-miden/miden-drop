import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it, vi } from "vitest";
import * as sdk from "@miden-sdk/miden-sdk/lazy";

import { getOracleForeignAccounts, PRAGMA_ORACLE_ID } from "./oracle";
import { MIDEN_PRICE_PAIRS } from "./price-pairs";

const PUBLISHER = "0x22a42798e8519c914214f1a63009c8";
const SECOND_PUBLISHER = "0x0b372f2735e33e91216d995bf29b91";

beforeAll(() => {
  // v0.16.2 exports initSync at runtime but omits it from the public type barrel.
  const { initSync } = sdk as typeof sdk & { initSync(input: { module: Buffer }): unknown };
  initSync({ module: readFileSync("node_modules/@miden-sdk/miden-sdk/dist/st/assets/miden_client_web.wasm") });
});

function rpcWithPublishers(publishers: (string | null)[], hasProcedure = true) {
  const free = vi.fn();
  const storage = {
    free,
    getItem: () => new sdk.Word(BigUint64Array.from([BigInt(publishers.length + 2), BigInt(0), BigInt(0), BigInt(0)])),
    getMapItem: (_slot: string, key: sdk.Word) => {
      const publisher = publishers[Number(key.toU64s()[0]) - 2];
      if (!publisher) return new sdk.Word(BigUint64Array.from([BigInt(0), BigInt(0), BigInt(0), BigInt(0)]));
      const id = sdk.AccountId.fromHex(publisher);
      const prefix = id.prefix();
      const suffix = id.suffix();
      try {
        return new sdk.Word(BigUint64Array.from([prefix.asInt(), suffix.asInt(), BigInt(0), BigInt(0)]));
      } finally {
        prefix.free(); suffix.free(); id.free();
      }
    },
  };
  return {
    getAccountDetails: vi.fn().mockResolvedValue({
      free,
      account: () => ({ free, storage: () => storage, code: () => ({ free, hasProcedure: () => hasProcedure }) }),
    }),
  } as unknown as sdk.RpcClient;
}

describe("Pragma foreign accounts with the v0.16 WASM SDK", () => {
  it("serializes the Oracle and multiple publishers without reusing consumed WASM objects", async () => {
    const accounts = await getOracleForeignAccounts(rpcWithPublishers([PUBLISHER, SECOND_PUBLISHER]), MIDEN_PRICE_PAIRS[0], sdk);
    expect(accounts.map((account) => {
      const id = account.account_id();
      try { return id.toString(); } finally { id.free(); }
    })).toEqual([PUBLISHER, SECOND_PUBLISHER, PRAGMA_ORACLE_ID]);
    // ForeignAccountArray takes ownership of its entries; the builder takes ownership of the array.
    const builder = new sdk.TransactionRequestBuilder();
    const withForeign = builder.withForeignAccounts(new sdk.ForeignAccountArray(accounts));
    const withArg = withForeign.withScriptArg(new sdk.Word(BigUint64Array.from([BigInt(16), BigInt(0), BigInt(0), BigInt(0)])));
    const request = withArg.build();
    const restored = sdk.TransactionRequest.deserialize(request.serialize());
    try {
      // Serialization contains hash maps whose order may change across a round trip.
      const arg = restored.scriptArg();
      try { expect(arg?.toU64s()[0]).toBe(BigInt(16)); } finally { arg?.free(); }
      expect(restored.serialize().length).toBe(request.serialize().length);
    } finally {
      restored.free(); request.free(); withArg.free(); withForeign.free(); builder.free();
    }
  });

  it("skips deleted publishers and deduplicates live entries", async () => {
    const accounts = await getOracleForeignAccounts(rpcWithPublishers([null, PUBLISHER, PUBLISHER]), MIDEN_PRICE_PAIRS[1], sdk);
    expect(accounts).toHaveLength(2);
    accounts.forEach((account) => account.free());
  });

  it("rejects an Oracle whose pinned procedure is no longer deployed", async () => {
    await expect(getOracleForeignAccounts(rpcWithPublishers([PUBLISHER], false), MIDEN_PRICE_PAIRS[0], sdk)).rejects.toThrow("deployment has changed");
  });

  it("rejects a registry with no live publishers", async () => {
    await expect(getOracleForeignAccounts(rpcWithPublishers([null]), MIDEN_PRICE_PAIRS[0], sdk)).rejects.toThrow("no active publishers");
  });
});
