"use client";

import dynamic from "next/dynamic";

const WalletConnection = dynamic(
  () => import("./wallet-connection"),
  {
    loading: () => (
      <main className="loading-screen">
        <span className="loading-mark" />
        Loading Miden Drop…
      </main>
    ),
    ssr: false,
  },
);

export default function Home() {
  return <WalletConnection />;
}
