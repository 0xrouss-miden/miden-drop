"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWalletConnection } from "./wallet-connection";
import { BrandMark, Icon } from "./ui";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { address, connectWallet, connected, error, pending, walletLabel } = useWalletConnection();
  const isLanding = pathname === "/";

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link href="/" className="brand" aria-label="Miden Drop home"><BrandMark /><span>Miden Drop</span></Link>
        <nav className="main-nav" aria-label="Main navigation">
          <Link className={pathname === "/send" ? "is-active" : ""} href="/send">Send</Link>
          <Link className={pathname === "/receive" ? "is-active" : ""} href="/receive">Receive</Link>
          <span className="network-label"><span />Miden Testnet</span>
        </nav>
        {connected ? (
          <div className="wallet-button is-connected" role="status" aria-label={`Wallet connected: ${address ?? "address available"}`}><Icon name="wallet" size={18} /><span className="wallet-label">{walletLabel}</span></div>
        ) : (
          <button className="wallet-button" type="button" onClick={connectWallet} disabled={pending}>
            <Icon name="wallet" size={18} />
            <span className="wallet-label">{!pending ? <><span className="wallet-label-full">Connect Wallet</span><span className="wallet-label-short">Connect</span></> : walletLabel}</span>
          </button>
        )}
      </header>
      {error && <div className="error-banner" role="alert">{error}</div>}
      {children}
      <footer className={`site-footer${isLanding ? "" : " site-footer--compact"}`}>
        <Link className="brand" href="/"><BrandMark /><span>Miden Drop</span></Link>
        <p>Private, programmable money you can send as a link.</p>
        <span className="network-label"><span />Miden Testnet</span>
      </footer>
    </div>
  );
}
