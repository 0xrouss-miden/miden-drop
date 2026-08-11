import { describe, expect, it } from "vitest";

import { findMidenPricePair, formatMidenTargetPrice, parseMidenTargetPrice } from "./price-pairs";

describe("Miden Pragma price pairs", () => {
  it("encodes BTC/USD and ETH/USD targets with eight decimals", () => {
    const btc = findMidenPricePair("BTC/USD");
    const eth = findMidenPricePair("ETH/USD");
    expect(btc && parseMidenTargetPrice("65000", btc)).toBe(BigInt("6500000000000"));
    expect(eth && parseMidenTargetPrice("2000", eth)).toBe(BigInt("200000000000"));
  });

  it("formats raw targets for claim review", () => {
    const btc = findMidenPricePair("BTC/USD");
    expect(btc && formatMidenTargetPrice(BigInt("6500050000000"), btc)).toBe("$65,000.5");
  });
});
