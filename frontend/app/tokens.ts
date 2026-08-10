export const SEND_TOKENS = [
  {
    name: "Miden",
    symbol: "MID",
    id: "mtst1aqj93e2yvy5wdv2skadca0vuuypfnp80_qr7qqq9wr6w",
    decimals: 6,
  },
  {
    name: "USDC",
    symbol: "USDC",
    id: "mtst1ar7fpu85mgcw2ytgg5akp6h76uyemg6t_qr7qqq9wr6w",
    decimals: 6,
  },
  {
    name: "ETH",
    symbol: "ETH",
    id: "mtst1aqu8zjdwvcgkeug5a67kpwmnsymvmkg0_qr7qqq9wr6w",
    decimals: 8,
  },
] as const;

export type SendToken = (typeof SEND_TOKENS)[number];
