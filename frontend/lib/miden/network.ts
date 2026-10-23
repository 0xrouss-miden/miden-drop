import type { WalletAdapterNetwork } from "@miden-sdk/miden-wallet-adapter-base";

export const MIDEN_NETWORK = "mainnet" as const;
export const MIDEN_RELEASE = "0.17" as const;
export const MIDEN_RPC_URL = "https://rpc.cedar.miden.io";
export const MIDEN_STORE_NAME = "miden-drop-public-chain-mainnet-cedar-v0.17";

// Adapter 0.17.6 forwards the network string to Bread, which supports mainnet,
// but its published enum still lists only devnet, testnet and localnet.
export const MIDEN_WALLET_NETWORK = MIDEN_NETWORK as WalletAdapterNetwork;
