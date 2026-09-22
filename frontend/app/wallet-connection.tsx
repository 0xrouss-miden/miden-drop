"use client";

import { useEffect, useState } from "react";
import {
  AllowedPrivateData,
  PrivateDataPermission,
  WalletAdapterNetwork,
} from "@miden-sdk/miden-wallet-adapter-base";
import { useWallet } from "@miden-sdk/miden-wallet-adapter-react";

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
    disconnect,
    disconnecting,
    select,
    wallet,
    wallets: availableWallets,
  } = useWallet();
  const [error, setError] = useState<string | null>(null);
  const [connectRequested, setConnectRequested] = useState(false);

  useEffect(() => {
    if (!connectRequested || !wallet) return;

    void connect(
      PrivateDataPermission.Auto,
      WalletAdapterNetwork.Testnet,
      AllowedPrivateData.Assets,
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
        PrivateDataPermission.Auto,
        WalletAdapterNetwork.Testnet,
        AllowedPrivateData.Assets,
      );
    } catch (connectionError) {
      setError(connectionError instanceof Error ? connectionError.message : "Could not connect to the wallet.");
    }
  }

  async function disconnectWallet() {
    setError(null);
    if (!connected || disconnecting) return;

    try {
      await disconnect();
    } catch (disconnectError) {
      setError(disconnectError instanceof Error ? disconnectError.message : "Could not disconnect the wallet. Try again.");
    }
  }

  return {
    address,
    connectWallet,
    connected,
    disconnecting,
    disconnectWallet,
    error,
    pending: connecting || connectRequested || disconnecting,
    walletLabel: connecting || connectRequested ? "Connecting…" : connected ? shortAddress(address) : "Connect Wallet",
  };
}
