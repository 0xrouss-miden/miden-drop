"use client";

import type { ReactNode } from "react";
import {
  AllowedPrivateData,
  PrivateDataPermission,
} from "@miden-sdk/miden-wallet-adapter-base";
import { MidenWalletAdapter } from "@miden-sdk/miden-wallet-adapter-miden";
import { WalletProvider } from "@miden-sdk/miden-wallet-adapter-react";
import { MIDEN_WALLET_NETWORK } from "@/lib/miden/network";

const wallets = [new MidenWalletAdapter({ appName: "Miden Drop" })];

export default function WalletRuntime({ children }: { children: ReactNode }) {
  return (
    <WalletProvider
      wallets={wallets}
      network={MIDEN_WALLET_NETWORK}
      privateDataPermission={PrivateDataPermission.Auto}
      allowedPrivateData={AllowedPrivateData.Assets}
      localStorageKey="miden-drop-wallet-mainnet-v0.17"
      autoConnect
    >
      {children}
    </WalletProvider>
  );
}
