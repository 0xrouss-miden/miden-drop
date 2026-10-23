import { formatDecimalUnits, parseDecimalUnits } from "@/lib/drop/amount";

export const MIDEN_PRICE_PAIRS = [
  {
    id: "BTC/USD",
    name: "Bitcoin",
    baseSymbol: "BTC",
    pairPrefix: 1,
    oracleKey: "0xd189b4e9c38c367ba926ddb0044b781ca8fff18dcc10a0c75ff5600a1eb4d0eb",
    pairSuffix: 0,
    decimals: 8,
    placeholder: "65000",
  },
  {
    id: "ETH/USD",
    name: "Ethereum",
    baseSymbol: "ETH",
    pairPrefix: 2,
    oracleKey: "0x9a50f4137c634e0b384a87bea3a186e578e21274af6ae752230ead4631233e1d",
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
