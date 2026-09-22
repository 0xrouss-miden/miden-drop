"use client";

import type { ReactNode } from "react";
import {
  AllowedPrivateData,
  PrivateDataPermission,
  WalletAdapterNetwork,
} from "@miden-sdk/miden-wallet-adapter-base";
import { MidenWalletAdapter } from "@miden-sdk/miden-wallet-adapter-miden";
import { WalletProvider } from "@miden-sdk/miden-wallet-adapter-react";

const wallets = [new MidenWalletAdapter({ appName: "Miden Drop" })];

export default function WalletRuntime({ children }: { children: ReactNode }) {
  return (
    <WalletProvider
      wallets={wallets}
      network={WalletAdapterNetwork.Testnet}
      privateDataPermission={PrivateDataPermission.Auto}
      allowedPrivateData={AllowedPrivateData.Assets}
      autoConnect
    >
      {children}
    </WalletProvider>
  );
}
