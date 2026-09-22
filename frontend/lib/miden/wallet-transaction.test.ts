import { readFileSync } from "node:fs";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import * as sdk from "@miden-sdk/miden-sdk/lazy";
import { Transaction } from "@miden-sdk/miden-wallet-adapter-base";

import { createWalletTransactionBuilder } from "./wallet-transaction";

beforeAll(() => {
  const { initSync } = sdk as typeof sdk & { initSync(input: { module: Buffer }): unknown };
  initSync({ module: readFileSync("node_modules/@miden-sdk/miden-sdk/dist/st/assets/miden_client_web.wasm") });
});

afterEach(() => vi.restoreAllMocks());

function wallet(isGuardianAccount: boolean) {
  return { requestGuardianInfo: vi.fn().mockResolvedValue({ isGuardianAccount }) };
}

async function serializedSalt(account: ReturnType<typeof wallet>) {
  const builder = await createWalletTransactionBuilder(account, sdk);
  const request = builder.build();
  const transaction = Transaction.createCustomTransaction("sender", "sender", request);
  if (!("transactionRequest" in transaction.payload)) throw new Error("Expected custom transaction");
  const restored = sdk.TransactionRequest.deserialize(Buffer.from(transaction.payload.transactionRequest, "base64"));
  const salt = restored.feeConversionSalt();
  try {
    expect(restored.authArg()).toBeUndefined();
    return salt ? Array.from(salt.toU64s()) : undefined;
  } finally {
    salt?.free(); restored.free(); request.free(); builder.free();
  }
}

describe("wallet custom transaction fee salt", () => {
  it("sends a fresh replay salt through the wallet payload for each guardian transaction", async () => {
    const guardian = wallet(true);
    const first = await serializedSalt(guardian);
    const second = await serializedSalt(guardian);
    expect(first).toHaveLength(4);
    expect(second).toHaveLength(4);
    expect(first).not.toEqual(second);
    expect(first).not.toEqual([BigInt(0), BigInt(0), BigInt(0), BigInt(0)]);
    expect(guardian.requestGuardianInfo).toHaveBeenCalledTimes(2);
  });

  it("leaves ordinary wallet requests unsalted", async () => {
    expect(await serializedSalt(wallet(false))).toBeUndefined();
  });

  it("rejects noncanonical random field values instead of reducing or truncating them", async () => {
    const values = [BigInt("18446744069414584321"), BigInt(1), BigInt(2), BigInt(3), BigInt(4)];
    vi.spyOn(crypto, "getRandomValues").mockImplementation((array) => {
      if (!(array instanceof BigUint64Array)) throw new Error("Expected field element buffer");
      array[0] = values.shift()!;
      return array;
    });
    expect(await serializedSalt(wallet(true))).toEqual([BigInt(1), BigInt(2), BigInt(3), BigInt(4)]);
  });

  it("does not silently build an unsalted request when guardian detection fails", async () => {
    const account = { requestGuardianInfo: vi.fn().mockRejectedValue(new Error("wallet locked")) };
    await expect(createWalletTransactionBuilder(account, sdk)).rejects.toThrow("wallet locked");
    await expect(createWalletTransactionBuilder({}, sdk)).rejects.toThrow("cannot report its account type");
  });
});
