"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";

const WalletRuntime = dynamic(() => import("./wallet-runtime"), {
  loading: () => <main className="loading-screen"><span className="loading-mark" />Loading wallet…</main>,
  ssr: false,
});

export default function WalletProviderLoader({ children }: { children: ReactNode }) {
  return <WalletRuntime>{children}</WalletRuntime>;
}
