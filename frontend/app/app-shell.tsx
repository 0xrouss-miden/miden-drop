"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGroup } from "motion/react";
import * as m from "motion/react-m";
import { useWalletConnection } from "./wallet-connection";
import { BrandMark, Icon } from "./ui";
import { ActionButton, Disclosure, ErrorNotice, PendingMark } from "./motion";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { address, connectWallet, connected, disconnecting, disconnectWallet, error, pending, walletLabel } = useWalletConnection();
  const isCreate = pathname === "/" || pathname === "/send";
  const isReceive = pathname === "/receive" || pathname === "/claim";

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link href="/" className="brand" aria-label="Miden Drop home"><BrandMark /><span>Miden Drop</span></Link>
        <span className="network-label"><span />Mainnet · Cedar</span>
      </header>
      <div className="wallet-bar">
        {connected ? (
          <Disclosure className="wallet-control" label={`Connected wallet ${address ?? ""}. Show wallet details`} title={<span className="wallet-status">
              <Icon name="wallet" size={18} />
              <span>Bread Wallet <span className="wallet-address">{walletLabel}</span></span>
            </span>}>
            <div className="wallet-details">
              <p>{address}</p>
              <ActionButton className="wallet-disconnect" onClick={disconnectWallet} disabled={disconnecting}>
                {disconnecting ? "Disconnecting…" : "Disconnect wallet"}
              </ActionButton>
            </div>
          </Disclosure>
        ) : (
          <>
            <span className="wallet-context"><Icon name="wallet" size={18} />Bread Wallet</span>
            <ActionButton className="wallet-button" onClick={connectWallet} disabled={pending}>
              {pending ? walletLabel : "Connect"}{pending ? <PendingMark /> : <Icon name="arrow" size={16} />}
            </ActionButton>
          </>
        )}
      </div>
      <ErrorNotice message={error} />
      {children}
      <LayoutGroup id="main-navigation">
        <nav className="bottom-nav" aria-label="Main navigation">
          <Link className={isCreate ? "is-active" : ""} aria-current={isCreate ? "page" : undefined} href={pathname === "/send" ? "/send" : "/"}>{isCreate && <m.span layoutId="active-tab" className="nav-active-indicator" aria-hidden="true" />}<Icon name="send" /><span>Create</span></Link>
          <Link className={isReceive ? "is-active" : ""} aria-current={pathname === "/receive" ? "page" : undefined} href="/receive">{isReceive && <m.span layoutId="active-tab" className="nav-active-indicator" aria-hidden="true" />}<Icon name="receive" /><span>Receive</span></Link>
        </nav>
      </LayoutGroup>
    </div>
  );
}
