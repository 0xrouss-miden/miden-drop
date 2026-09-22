"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useWallet } from "@miden-sdk/miden-wallet-adapter-react";

import { DropNotFoundError, fetchEncryptedDrop } from "@/lib/drop/api";
import { formatDecimalUnits } from "@/lib/drop/amount";
import { decryptDropEnvelope } from "@/lib/drop/crypto";
import { assertCurrentMidenRelease, IncompatibleMidenReleaseError, parseDropFragment, type DropEnvelopeV1 } from "@/lib/drop/protocol";
import { claimMidenDrop, type ClaimProgress } from "@/lib/miden/claim-client";
import { findMidenToken } from "@/lib/miden/config";
import { getCurrentMidenBlock } from "@/lib/miden/drop-client";
import { findMidenPricePair, formatMidenTargetPrice } from "@/lib/miden/price-pairs";
import { Icon } from "../ui";
import { useWalletConnection } from "../wallet-connection";

type ClaimPhase = "loading" | "ready" | "claiming" | "claimed" | "invalid" | "missing" | "failed";
type ClaimDetails = { amount: string; symbol: string; expirationBlock: number; message?: string; expired: boolean; pricePair?: string; targetPrice?: string };

export default function ClaimPage() {
  const [phase, setPhase] = useState<ClaimPhase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<ClaimDetails | null>(null);
  const [claimProgress, setClaimProgress] = useState<ClaimProgress>("validating");
  const [completedAsRecovery, setCompletedAsRecovery] = useState(false);
  const envelopeRef = useRef<DropEnvelopeV1 | null>(null);
  const currentBlockRef = useRef(0);
  const { address, importPrivateNote, requestTransaction, waitForTransaction } = useWallet();
  const { connectWallet, connected, error: connectionError, pending } = useWalletConnection();
  const pageTitle = phase === "claimed"
    ? completedAsRecovery ? "Drop recovered" : "Drop claimed"
    : details?.expired ? "Recover this drop" : "Claim this drop";
  useEffect(() => {
    let cancelled = false;

    async function loadDrop() {
      try {
        const secret = parseDropFragment(window.location.hash);
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
        const encrypted = await fetchEncryptedDrop(secret.locator);
        const decrypted = await decryptDropEnvelope(secret.key, encrypted.nonce, encrypted.ciphertext);
        assertCurrentMidenRelease(decrypted);
        const token = findMidenToken(decrypted.faucetId);
        if (!token) throw new Error("This drop uses an unsupported token.");
        const pricePair = decrypted.pricePair ? findMidenPricePair(decrypted.pricePair) : undefined;
        if (decrypted.pricePair && !pricePair) throw new Error("This drop uses an unsupported price pair.");
        const targetPrice = pricePair && decrypted.rawTargetPrice
          ? formatMidenTargetPrice(BigInt(decrypted.rawTargetPrice), pricePair)
          : undefined;
        const currentBlock = await getCurrentMidenBlock().catch(() => 0);
        if (cancelled) return;
        envelopeRef.current = decrypted;
        currentBlockRef.current = currentBlock;
        setDetails({
          amount: formatDecimalUnits(BigInt(decrypted.amount), token.decimals),
          symbol: token.symbol,
          expirationBlock: decrypted.expirationBlock,
          message: decrypted.message,
          expired: currentBlock >= decrypted.expirationBlock,
          ...(pricePair && targetPrice ? { pricePair: pricePair.id, targetPrice } : {}),
        });
        setPhase("ready");
      } catch (loadError) {
        if (cancelled) return;
        if (loadError instanceof IncompatibleMidenReleaseError) {
          setPhase("failed");
          setError(loadError.message);
        } else if (loadError instanceof DropNotFoundError) {
          setPhase("missing");
          setError("This private drop was not found. Check that you opened the complete original link.");
        } else if (loadError instanceof Error && loadError.message.toLowerCase().includes("link")) {
          setPhase("invalid");
          setError("This private drop link is incomplete or invalid.");
        } else {
          setPhase("failed");
          setError("This private drop could not be decrypted. Ask the sender for the original link.");
        }
      }
    }

    void loadDrop();
    return () => {
      cancelled = true;
      envelopeRef.current = null;
    };
  }, []);

  async function claimDrop() {
    setError(null);
    if (!connected) {
      await connectWallet();
      return;
    }
    const currentEnvelope = envelopeRef.current;
    if (!currentEnvelope) {
      setError("Open the original private link again before claiming.");
      return;
    }
    try {
      setPhase("claiming");
      setClaimProgress("validating");
      await claimMidenDrop(
        { address, importPrivateNote, requestTransaction, waitForTransaction },
        currentEnvelope,
        setClaimProgress,
      );
      envelopeRef.current = null;
      setCompletedAsRecovery(currentBlockRef.current >= currentEnvelope.expirationBlock);
      setPhase("claimed");
    } catch (claimError) {
      setPhase("ready");
      const message = claimError instanceof Error ? claimError.message : "";
      if (claimError instanceof IncompatibleMidenReleaseError) {
        setError(claimError.message);
      } else if (/consum|nullifier|already/iu.test(message)) {
        setError("This drop has already been claimed.");
      } else if (/price has not reached|not tracked|no fresh publisher/iu.test(message)) {
        setError("The current Oracle price has not reached this target yet. Try again after the market moves.");
      } else if (/expired|sender|recovery/iu.test(message)) {
        setError("The recovery window is open, but only the sender account can recover this drop.");
      } else if (/not[_ ]?granted|reject|denied|cancel/iu.test(message)) {
        setError("The wallet request was not approved. Retry and approve both the note import and the claim.");
      } else {
        setError(message || "The wallet could not claim this drop. Sync the wallet and try again.");
      }
    }
  }

  return (
    <main className="claim-page">
      <section className="claim-task">
        <h1>{pageTitle}<span>.</span></h1>
        {(error || connectionError) && <div className="error-banner" role="alert">{error || connectionError}</div>}

        {phase === "loading" ? (
          <section className="claim-surface claim-loading clipped-surface" aria-live="polite">
            <span className="loading-mark" aria-hidden="true" />
            <strong>Opening the encrypted drop…</strong>
            <p>The note is being decrypted on this device.</p>
          </section>
        ) : phase === "claimed" ? (
          <section className="claim-surface clipped-surface">
            <div className="success-state" role="status"><span><Icon name="check" /></span><div><strong>{completedAsRecovery ? "Funds recovered" : "Funds received"}</strong><p>The private note was consumed by your wallet on Miden Testnet.</p></div></div>
            <Link className="primary-button claim-complete-action" href="/">Return home <Icon name="arrow" /></Link>
          </section>
        ) : details ? (
          <section className="claim-surface clipped-surface" aria-labelledby="claim-details-title">
            <div className="surface-heading">
              <h2 id="claim-details-title">{details.amount} <span>{details.symbol}</span></h2>
              <span className="private-badge"><Icon name="lock" size={16} /> Private</span>
            </div>
            <dl className="detail-list">
              <div><dt>From</dt><dd>Private sender</dd></div>
              <div><dt>Claim condition</dt><dd>{details.pricePair ? `${details.pricePair} ≥ ${details.targetPrice}` : "Bearer link · no Oracle"}</dd></div>
              <div><dt>Network</dt><dd><span className="status-dot" />Miden Testnet</dd></div>
              <div><dt>Sender recovery</dt><dd>{details.expired ? "Open now" : `Block ${details.expirationBlock.toLocaleString()}`}</dd></div>
              <div><dt>Message</dt><dd>{details.message || "No message"}</dd></div>
            </dl>
            <button className="primary-button claim-button" type="button" onClick={claimDrop} disabled={phase === "claiming" || pending} aria-busy={phase === "claiming"}>
              <span>{phase === "claiming" ? claimProgressLabel(claimProgress, details.expired) : connected ? details.expired ? "Recover to sender wallet" : details.pricePair ? "Check price & claim" : "Claim drop" : pending ? "Connecting wallet…" : details.expired ? "Connect sender wallet to recover" : "Connect wallet to claim"}</span>
              <Icon name={phase === "claiming" ? "lock" : "arrow"} />
            </button>
            <p className="prototype-note"><Icon name="lock" size={14} /> {details.expired ? "Only the creating account can recover after this block." : details.pricePair ? `Pragma checks ${details.pricePair} inside the claim proof.` : "No Oracle check; possession of this private link grants the claim."}</p>
          </section>
        ) : (
          <section className="claim-surface claim-unavailable clipped-surface">
            <Icon name="lock" size={28} />
            <strong>{phase === "missing" ? "Drop not found" : phase === "invalid" ? "Invalid private link" : "Drop unavailable"}</strong>
            <p>Nothing was imported into your wallet.</p>
            <Link className="secondary-button" href="/receive">Try another link</Link>
          </section>
        )}
      </section>
    </main>
  );
}

function claimProgressLabel(progress: ClaimProgress, recovering: boolean) {
  if (progress === "importing") return "Approve note import in wallet…";
  if (progress === "requesting") return recovering ? "Approve recovery in wallet…" : "Approve claim in wallet…";
  if (progress === "confirming") return "Waiting for Testnet confirmation…";
  return "Validating private note…";
}
