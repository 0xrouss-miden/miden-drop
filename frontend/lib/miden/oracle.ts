import type { ForeignAccount, RpcClient } from "@miden-sdk/miden-sdk";

import type { MidenPricePair } from "./price-pairs";

export const PRAGMA_ORACLE_ID = "0x3b306d819a19b691205480e1619b5c";
export const PRAGMA_GET_MEDIAN_ROOT = "0xab62a61417fb6c1edc191d24b6a3cc53b2071e671d7013ddd26860267b960b29";
const PUBLISHERS_SLOT = "pragma::oracle::publishers";

// Declare public accounts, so the wallet fetches witnesses at its own execution
// block. Proofs fetched by this page would be stale by the time the user signs.
export async function getOracleForeignAccounts(
  rpc: RpcClient,
  pair: MidenPricePair,
  sdk: typeof import("@miden-sdk/miden-sdk/lazy"),
): Promise<ForeignAccount[]> {
  const allocated: { free(): void }[] = [];
  const keep = <T extends { free(): void }>(value: T): T => {
    allocated.push(value);
    return value;
  };
  const foreignAccounts: ForeignAccount[] = [];
  try {
    const oracleId = keep(sdk.AccountId.fromHex(PRAGMA_ORACLE_ID));
    const fetched = keep(await rpc.getAccountDetails(oracleId));
    const oracle = fetched.account();
    if (!oracle) throw new Error("The Pragma Oracle is unavailable on Miden Testnet.");
    keep(oracle);
    if (!keep(oracle.code()).hasProcedure(keep(sdk.Word.fromHex(PRAGMA_GET_MEDIAN_ROOT)))) {
      throw new Error("The Pragma Oracle deployment has changed. Please update Miden Drop.");
    }
    const storage = keep(oracle.storage());
    const nextIndexWord = storage.getItem("pragma::oracle::next_publisher_index");
    if (!nextIndexWord) throw new Error("The Pragma Oracle publisher registry is unavailable.");
    const nextIndex = keep(nextIndexWord).toU64s()[0];
    if (nextIndex < BigInt(2) || nextIndex > BigInt(258)) {
      throw new Error("The Pragma Oracle publisher registry is invalid.");
    }
    const keys = [];
    const seen = new Set<string>();
    for (let index = BigInt(2); index < nextIndex; index++) {
      const key = keep(new sdk.Word(BigUint64Array.from([index, BigInt(0), BigInt(0), BigInt(0)])));
      keys.push(index);
      const entry = storage.getMapItem(PUBLISHERS_SLOT, key);
      if (!entry) throw new Error("The Pragma Oracle publisher registry is incomplete.");
      const [prefix, suffix] = keep(entry).toU64s();
      // Pragma leaves zeroed entries behind when a publisher is removed.
      if (prefix === BigInt(0) && suffix === BigInt(0)) continue;
      const publisher = keep(sdk.AccountId.fromPrefixSuffix(keep(new sdk.Felt(prefix)), keep(new sdk.Felt(suffix))));
      if (seen.has(publisher.toString())) continue;
      seen.add(publisher.toString());
      const pairKey = new sdk.Word(BigUint64Array.from([BigInt(pair.pairPrefix), BigInt(pair.pairSuffix), BigInt(0), BigInt(0)]));
      const publisherSlot = new sdk.SlotAndKeys("pragma::publisher::entries", [pairKey]);
      const requirements = sdk.AccountStorageRequirements.fromSlotAndKeysArray([publisherSlot]);
      foreignAccounts.push(sdk.ForeignAccount.public(publisher, requirements));
    }
    if (foreignAccounts.length === 0) throw new Error("The Pragma Oracle has no active publishers.");
    const oracleSlot = new sdk.SlotAndKeys(PUBLISHERS_SLOT, keys.map((index) =>
      new sdk.Word(BigUint64Array.from([index, BigInt(0), BigInt(0), BigInt(0)]))));
    const oracleRequirements = sdk.AccountStorageRequirements.fromSlotAndKeysArray([oracleSlot]);
    foreignAccounts.push(sdk.ForeignAccount.public(oracleId, oracleRequirements));
    return foreignAccounts;
  } catch (error) {
    for (const account of foreignAccounts) account.free();
    throw error;
  } finally {
    for (const value of allocated.reverse()) value.free();
  }
}
