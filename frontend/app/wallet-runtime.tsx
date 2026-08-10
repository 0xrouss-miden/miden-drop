"use client";

import type { ReactNode } from "react";
import { WalletAdapterNetwork } from "@miden-sdk/miden-wallet-adapter-base";
import { MidenWalletAdapter } from "@miden-sdk/miden-wallet-adapter-miden";
import { WalletProvider } from "@miden-sdk/miden-wallet-adapter-react/dist/WalletProvider.js";

const wallets = [new MidenWalletAdapter({ appName: "Miden Drop" })];

export default function WalletRuntime({ children }: { children: ReactNode }) {
  return (
    <WalletProvider wallets={wallets} network={WalletAdapterNetwork.Testnet} autoConnect>
      {children}
    </WalletProvider>
  );
}
