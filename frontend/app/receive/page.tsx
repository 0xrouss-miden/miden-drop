"use client";

import dynamic from "next/dynamic";

const WalletConnection = dynamic(() => import("../wallet-connection"), {
  loading: () => <main className="loading-screen"><span className="loading-mark" />Loading Receive…</main>,
  ssr: false,
});

export default function ReceivePage() {
  return <WalletConnection initialView="receive" />;
}
