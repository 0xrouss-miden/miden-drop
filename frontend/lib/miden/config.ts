export const MIDEN_TOKENS = [
  {
    name: "Miden",
    symbol: "MID",
    faucetId: "mtst1aqj93e2yvy5wdv2skadca0vuuypfnp80_qr7qqq9wr6w",
    decimals: 6,
  },
  {
    name: "USD Coin",
    symbol: "USDC",
    faucetId: "mtst1ar7fpu85mgcw2ytgg5akp6h76uyemg6t_qr7qqq9wr6w",
    decimals: 6,
  },
  {
    name: "Ether",
    symbol: "ETH",
    faucetId: "mtst1aqu8zjdwvcgkeug5a67kpwmnsymvmkg0_qr7qqq9wr6w",
    decimals: 8,
  },
] as const;

export type MidenToken = (typeof MIDEN_TOKENS)[number];

export function findMidenToken(faucetId: string) {
  return MIDEN_TOKENS.find((token) => token.faucetId === faucetId);
}

export const MIDEN_BLOCKS_PER_DAY = 17_280;
