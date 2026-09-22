export const MIDEN_TOKENS = [
  {
    name: "Miden",
    symbol: "MID",
    faucetId: "mtst1aqvpq8a9ytqhfvt9al20wzsrs56g83ec_qr7qqq9wr6w",
    decimals: 6,
  },
  {
    name: "USD Coin",
    symbol: "USDC",
    faucetId: "mtst1apfhc9dxygr5aygc325fg3tv2ggrc5dw_qr7qqq9wr6w",
    decimals: 6,
  },
  {
    name: "Ether",
    symbol: "ETH",
    faucetId: "mtst1aq9nwte8xh3nayfpdkv4hu5mjy90arem_qr7qqq9wr6w",
    decimals: 8,
  },
] as const;

export type MidenToken = (typeof MIDEN_TOKENS)[number];

export function findMidenToken(faucetId: string) {
  return MIDEN_TOKENS.find((token) => token.faucetId === faucetId);
}

export const MIDEN_BLOCKS_PER_DAY = 28_800;
