"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { PendingMark } from "./motion";

const WalletRuntime = dynamic(() => import("./wallet-runtime"), {
  loading: () => <main className="loading-screen"><PendingMark />Loading wallet…</main>,
  ssr: false,
});

export default function WalletProviderLoader({ children }: { children: ReactNode }) {
  return <WalletRuntime>{children}</WalletRuntime>;
}
