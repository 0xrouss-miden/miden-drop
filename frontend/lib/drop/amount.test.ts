import { describe, expect, it } from "vitest";

import { expirationBlockFromDays, formatDecimalUnits, parseDecimalUnits } from "./amount";

describe("token amounts", () => {
  it("converts decimal input without floating point arithmetic", () => {
    expect(parseDecimalUnits("125.01", 6)).toBe(BigInt(125_010_000));
    expect(parseDecimalUnits("0,000001", 6)).toBe(BigInt(1));
    expect(formatDecimalUnits(BigInt(125_010_000), 6)).toBe("125.01");
  });

  it("rejects zero, excess precision, and malformed values", () => {
    expect(() => parseDecimalUnits("0", 6)).toThrow();
    expect(() => parseDecimalUnits("1.0000001", 6)).toThrow();
    expect(() => parseDecimalUnits("1e6", 6)).toThrow();
  });

  it("converts days into an absolute expiration block", () => {
    expect(expirationBlockFromDays(100, 7, 28_800)).toBe(201_700);
  });
});
