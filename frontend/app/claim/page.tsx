"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "../ui";
import { useWalletConnection } from "../wallet-connection";

export default function ClaimPage() {
  const [claimPreviewed, setClaimPreviewed] = useState(false);
  const { connectWallet, connected, error } = useWalletConnection();

  return (
    <main className="claim-page">
      <section className="claim-task">
        <Link className="back-link" href="/"><Icon name="back" size={17} /> Back to Miden Drop</Link>
        <h1>Claim this drop<span>.</span></h1>
        {error && <div className="error-banner" role="alert">{error}</div>}
        <section className="claim-surface clipped-surface" aria-labelledby="claim-details-title">
          <div className="surface-heading">
            <h2 id="claim-details-title">125.00 <span>MID</span></h2>
            <span className="private-badge"><Icon name="lock" size={16} /> Private</span>
          </div>
          <dl className="detail-list">
            <div><dt>From</dt><dd>Private sender</dd></div>
            <div><dt>Network</dt><dd><span className="status-dot" />Miden Testnet</dd></div>
            <div><dt>Expires</dt><dd>In 7 days</dd></div>
            <div><dt>Message</dt><dd>For coffee</dd></div>
          </dl>
          {claimPreviewed ? (
            <div className="success-state" role="status"><span><Icon name="check" /></span><div><strong>Claim preview complete</strong><p>No transaction was submitted. Claim logic will be added next.</p></div></div>
          ) : (
            <button className="primary-button claim-button" type="button" onClick={connected ? () => setClaimPreviewed(true) : connectWallet}><span>{connected ? "Preview claim" : "Connect Wallet to claim"}</span><Icon name="arrow" /></button>
          )}
          <p className="prototype-note"><Icon name="lock" size={14} /> Interface preview — the drop is not imported yet.</p>
        </section>
      </section>
    </main>
  );
}
