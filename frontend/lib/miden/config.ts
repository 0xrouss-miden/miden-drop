export const MIDEN_TOKENS = [
  {
    name: "USDCx",
    symbol: "USDCx",
    faucetId: "mm1arnfum9xuwwlrvgvrefejwvlavn3vk24_qr7qqq9wr6w",
    decimals: 6,
  },
  {
    name: "Ether",
    symbol: "ETH",
    faucetId: "mm1apqelr6tlaeftyfj4f7w59dycysmtawe_qr7qqq9wr6w",
    decimals: 8,
  },
] as const;

export type MidenToken = (typeof MIDEN_TOKENS)[number];

export function findMidenToken(faucetId: string) {
  return MIDEN_TOKENS.find((token) => token.faucetId === faucetId);
}

export const MIDEN_BLOCKS_PER_DAY = 28_800;
