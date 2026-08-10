"use client";

import dynamic from "next/dynamic";

const WalletConnection = dynamic(() => import("../wallet-connection"), {
  loading: () => <main className="loading-screen"><span className="loading-mark" />Loading claim…</main>,
  ssr: false,
});

export default function ClaimPage() {
  return <WalletConnection initialView="claim" />;
}
