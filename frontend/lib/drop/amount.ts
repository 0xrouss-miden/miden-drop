export function parseDecimalUnits(value: string, decimals: number) {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    throw new Error("Invalid asset decimals.");
  }
  const normalized = value.trim().replace(",", ".");
  const match = /^(\d+)(?:\.(\d*))?$/u.exec(normalized);
  if (!match) throw new Error("Enter a positive amount.");

  const fraction = match[2] ?? "";
  if (fraction.length > decimals) throw new Error(`Use no more than ${decimals} decimal places.`);
  const units = BigInt(match[1]) * BigInt(10) ** BigInt(decimals)
    + BigInt((fraction + "0".repeat(decimals)).slice(0, decimals) || "0");
  if (units <= BigInt(0)) throw new Error("Enter a positive amount.");
  return units;
}

export function formatDecimalUnits(units: bigint, decimals: number) {
  const padded = units.toString().padStart(decimals + 1, "0");
  if (decimals === 0) return padded;
  const whole = padded.slice(0, -decimals);
  const fraction = padded.slice(-decimals).replace(/0+$/u, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

export function expirationBlockFromDays(currentBlock: number, days: number, blocksPerDay: number) {
  if (![currentBlock, days, blocksPerDay].every(Number.isSafeInteger) || currentBlock < 0 || days <= 0 || blocksPerDay <= 0) {
    throw new Error("Invalid expiration configuration.");
  }
  const expiration = currentBlock + days * blocksPerDay;
  if (!Number.isSafeInteger(expiration)) throw new Error("Expiration block is too large.");
  return expiration;
}
