"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useWallet } from "@miden-sdk/miden-wallet-adapter-react/dist/useWallet.js";
import { isValidTokenAmount } from "../amounts";
import { DROP_EXPIRATIONS, CreatedDrop, createDropNote } from "../drop-note";
import { useWalletConnection } from "../wallet-connection";
import { Icon, QrPreview } from "../ui";
import { SEND_TOKENS } from "../tokens";

export default function SendPage() {
  const [amount, setAmount] = useState("125.00");
  const [selectedTokenId, setSelectedTokenId] = useState<string>(SEND_TOKENS[0].id);
  const [amountTouched, setAmountTouched] = useState(false);
  const [expirationBlocks, setExpirationBlocks] = useState<number>(DROP_EXPIRATIONS[1].blocks);
  const [note, setNote] = useState("");
  const [createdDrop, setCreatedDrop] = useState<CreatedDrop | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollTimer = useRef<number | null>(null);
  const copiedTimer = useRef<number | null>(null);
  const { address, connected, requestTransaction } = useWallet();
  const { connectWallet, error: connectionError, pending: connectionPending } = useWalletConnection();
  const normalizedAmount = amount.replace(",", ".");
  const selectedToken = SEND_TOKENS.find((token) => token.id === selectedTokenId) ?? SEND_TOKENS[0];
  const amountValid = isValidTokenAmount(amount, selectedToken.decimals);

  useEffect(() => () => {
    if (scrollTimer.current !== null) window.clearTimeout(scrollTimer.current);
    if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current);
  }, []);

  async function createDrop(event: FormEvent) {
    event.preventDefault();
    setAmountTouched(true);
    if (!amountValid) return;
    setError(null);

    if (!connected || !address || !requestTransaction) {
      await connectWallet();
      return;
    }

    setCreating(true);
    setCreatedDrop(null);
    setCopied(false);
    try {
      const drop = await createDropNote({
        address,
        amount: normalizedAmount,
        decimals: selectedToken.decimals,
        faucetId: selectedToken.id,
        symbol: selectedToken.symbol,
        expirationBlocks,
        message: note.trim(),
        requestTransaction,
      });
      setCreatedDrop(drop);
      scrollTimer.current = window.setTimeout(
        () => document.querySelector("#drop-result")?.scrollIntoView({ behavior: "smooth", block: "center" }),
        80,
      );
    } catch (creationError) {
      const message = creationError instanceof Error ? creationError.message : "";
      if (/reject|denied|cancel/i.test(message)) {
        setError("The wallet request was cancelled. Your funds have not moved.");
      } else if (/insufficient|balance/i.test(message)) {
        setError(`Your wallet does not have enough ${selectedToken.symbol} for this drop.`);
      } else if (/network|fetch|rpc|offline/i.test(message)) {
        setError("Miden Testnet could not be reached. Check your connection and try again.");
      } else {
        setError("The wallet could not create this drop. Your funds have not moved. Please try again.");
      }
    } finally {
      setCreating(false);
    }
  }

  async function copyLink() {
    try {
      if (!createdDrop) return;
      await navigator.clipboard.writeText(createdDrop.link);
      setCopied(true);
      copiedTimer.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("The link could not be copied. Select it manually instead.");
    }
  }

  return (
    <main className="send-view">
      {(error || connectionError) && <div className="error-banner" role="alert">{error || connectionError}</div>}
      <section className="send-page">
        <div className="hero-copy send-intro">
          <Link className="back-link" href="/"><Icon name="back" size={17} /> Back to home</Link>
          <h1>Send a drop<span>.</span></h1>
        </div>
        <div className="composer-stage">
          <form className="composer clipped-surface" id="composer" onSubmit={createDrop}>
            <div className="amount-row">
              <label htmlFor="drop-amount">You send</label>
              <div className="amount-input-row">
                <input id="drop-amount" inputMode="decimal" value={amount} onBlur={() => setAmountTouched(true)} onChange={(event) => { setAmount(event.target.value); setAmountTouched(true); }} aria-label="Amount to send" aria-invalid={amountTouched && !amountValid} aria-describedby="amount-error" />
                <label className="token-select">
                  <span aria-hidden="true">{selectedToken.symbol.slice(0, 1)}</span>
                  <select aria-label="Token to send" value={selectedTokenId} onChange={(event) => setSelectedTokenId(event.target.value)}>
                    {SEND_TOKENS.map((token) => <option key={token.id} value={token.id}>{token.name}</option>)}
                  </select>
                </label>
              </div>
              <p className="field-error" id="amount-error" aria-live="polite">{amountTouched && !amountValid ? `Enter a positive amount with up to ${selectedToken.decimals} decimal places.` : ""}</p>
            </div>
            <div className="composer-options">
              <label><span>Expires after</span><select value={expirationBlocks} onChange={(event) => setExpirationBlocks(Number(event.target.value))} aria-label="Drop expiration in blocks">{DROP_EXPIRATIONS.map((option) => <option key={option.blocks} value={option.blocks}>{option.label}</option>)}</select></label>
              <label><span>Message</span><input value={note} maxLength={42} onChange={(event) => setNote(event.target.value)} placeholder="Optional" /></label>
            </div>
            <button className="primary-button composer-submit" type="submit" disabled={!amountValid || creating || connectionPending} aria-busy={creating}>
              <span>{creating ? "Creating private note…" : connected ? "Create private link" : connectionPending ? "Connecting wallet…" : "Connect wallet to create"}</span>
              <Icon name={creating ? "lock" : "arrow"} />
            </button>
            <p className="prototype-note"><Icon name="lock" size={14} /> The private note data stays in the link fragment. Anyone with the link can claim it before expiry.</p>
          </form>
        </div>
      </section>

      <section id="drop-result" className={`drop-result${createdDrop ? " is-visible" : ""}`} aria-live="polite">
        <div className="result-copy">
          <p className="result-status"><span><Icon name="check" size={16} /></span>Transaction submitted</p>
          <h2>{createdDrop?.amount ?? amount} {createdDrop?.symbol ?? selectedToken.symbol}, ready to share<span>.</span></h2>
          <p>The full claim data is inside this private link. Send it only through a channel you trust.</p>
          <div className="link-output"><code>{createdDrop?.link}</code><button type="button" onClick={copyLink}><Icon name={copied ? "check" : "copy"} size={18} />{copied ? "Copied" : "Copy link"}</button></div>
          {createdDrop && <Link className="text-action" href={createdDrop.link}>Open claim page <Icon name="arrow" size={18} /></Link>}
          {createdDrop && <p className="transaction-reference">Transaction {createdDrop.transactionId} · expires at block {createdDrop.expirationBlock.toLocaleString()}</p>}
        </div>
        <div className="result-qr"><QrPreview /><span>QR preview only — share the link above</span></div>
      </section>
    </main>
  );
}
