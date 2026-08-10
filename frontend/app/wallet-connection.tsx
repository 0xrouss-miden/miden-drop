"use client";

import { useEffect, useState } from "react";
import {
  AllowedPrivateData,
  PrivateDataPermission,
  WalletAdapterNetwork,
} from "@miden-sdk/miden-wallet-adapter-base";
import { useWallet } from "@miden-sdk/miden-wallet-adapter-react/dist/useWallet.js";

function shortAddress(address?: string | null) {
  if (!address) return "Connected";
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

export function useWalletConnection() {
  const {
    address,
    connect,
    connected,
    connecting,
    select,
    wallet,
    wallets: availableWallets,
  } = useWallet();
  const [error, setError] = useState<string | null>(null);
  const [connectRequested, setConnectRequested] = useState(false);

  useEffect(() => {
    if (!connectRequested || !wallet) return;

    void connect(
      PrivateDataPermission.UponRequest,
      WalletAdapterNetwork.Testnet,
      AllowedPrivateData.None,
    )
      .catch((connectionError: unknown) => {
        setError(connectionError instanceof Error ? connectionError.message : "Could not connect to the wallet.");
      })
      .finally(() => setConnectRequested(false));
  }, [connect, connectRequested, wallet]);

  async function connectWallet() {
    setError(null);
    if (connected) return;

    try {
      if (!wallet) {
        const availableWallet = availableWallets[0];
        if (!availableWallet) throw new Error("Bread Wallet is not available in this browser.");
        setConnectRequested(true);
        select(availableWallet.adapter.name);
        return;
      }

      await connect(
        PrivateDataPermission.UponRequest,
        WalletAdapterNetwork.Testnet,
        AllowedPrivateData.None,
      );
    } catch (connectionError) {
      setError(connectionError instanceof Error ? connectionError.message : "Could not connect to the wallet.");
    }
  }

  return {
    address,
    connectWallet,
    connected,
    error,
    pending: connecting || connectRequested,
    walletLabel: connecting || connectRequested ? "Connecting…" : connected ? shortAddress(address) : "Connect Wallet",
  };
}
