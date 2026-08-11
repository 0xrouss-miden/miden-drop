import { formatDecimalUnits, parseDecimalUnits } from "@/lib/drop/amount";

export const MIDEN_PRICE_PAIRS = [
  {
    id: "BTC/USD",
    name: "Bitcoin",
    baseSymbol: "BTC",
    pairPrefix: 1,
    pairSuffix: 0,
    decimals: 8,
    placeholder: "65000",
  },
  {
    id: "ETH/USD",
    name: "Ethereum",
    baseSymbol: "ETH",
    pairPrefix: 2,
    pairSuffix: 0,
    decimals: 8,
    placeholder: "2000",
  },
] as const;

export type MidenPricePair = (typeof MIDEN_PRICE_PAIRS)[number];
export type MidenPricePairId = MidenPricePair["id"];

export function findMidenPricePair(id: string) {
  return MIDEN_PRICE_PAIRS.find((pair) => pair.id === id);
}

export function isMidenPricePairId(id: unknown): id is MidenPricePairId {
  return typeof id === "string" && findMidenPricePair(id) !== undefined;
}

export function parseMidenTargetPrice(value: string, pair: MidenPricePair) {
  return parseDecimalUnits(value, pair.decimals);
}

export function formatMidenTargetPrice(rawPrice: bigint, pair: MidenPricePair) {
  const decimal = formatDecimalUnits(rawPrice, pair.decimals);
  const [whole, fraction] = decimal.split(".");
  const groupedWhole = BigInt(whole).toLocaleString("en-US");
  return `$${fraction ? `${groupedWhole}.${fraction}` : groupedWhole}`;
}
