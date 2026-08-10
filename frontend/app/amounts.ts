export function isValidTokenAmount(value: string, decimals: number) {
  if (!Number.isInteger(decimals) || decimals < 0) return false;

  const normalized = value.replace(",", ".");
  const amountPattern = decimals === 0 ? /^\d+$/ : new RegExp(`^\\d+(?:\\.\\d{0,${decimals}})?$`);
  if (!amountPattern.test(normalized)) return false;

  return toBaseUnits(normalized, decimals) > BigInt(0);
}

export function toBaseUnits(value: string, decimals: number) {
  if (!Number.isInteger(decimals) || decimals < 0) {
    throw new RangeError("Token decimals must be a non-negative integer.");
  }

  const normalized = value.replace(",", ".");
  const amountPattern = decimals === 0 ? /^\d+$/ : new RegExp(`^\\d+(?:\\.\\d{0,${decimals}})?$`);
  if (!amountPattern.test(normalized)) {
    throw new RangeError(`Amount must have at most ${decimals} decimal places.`);
  }

  const [whole, fraction = ""] = normalized.split(".");
  const scale = BigInt(10) ** BigInt(decimals);
  const fractionalUnits = fraction ? BigInt(fraction.padEnd(decimals, "0")) : BigInt(0);
  return BigInt(whole) * scale + fractionalUnits;
}
