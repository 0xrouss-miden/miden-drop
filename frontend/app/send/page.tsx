"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import type { Asset } from "@miden-sdk/miden-wallet-adapter-base";
import { useWallet } from "@miden-sdk/miden-wallet-adapter-react/dist/useWallet.js";

import { uploadEncryptedDrop } from "@/lib/drop/api";
import { formatDecimalUnits, parseDecimalUnits } from "@/lib/drop/amount";
import { encryptDropEnvelope } from "@/lib/drop/crypto";
import { buildDropFragment, type EncryptedDrop } from "@/lib/drop/protocol";
import { MIDEN_BLOCKS_PER_DAY, MIDEN_TOKENS } from "@/lib/miden/config";
import { createMidenDrop } from "@/lib/miden/drop-client";
import { MIDEN_PRICE_PAIRS, findMidenPricePair, formatMidenTargetPrice, parseMidenTargetPrice } from "@/lib/miden/price-pairs";
import { useWalletConnection } from "../wallet-connection";
import { Icon, QrPreview } from "../ui";

const EXPIRATIONS = [
  { label: "1 day", days: 1 },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
] as const;

type SendPhase = "idle" | "creating" | "uploading" | "upload-failed" | "ready";
type DropResult = { amount: string; symbol: string; expirationBlock: number; transactionId: string; pricePair?: string; targetPrice?: string };
type BalanceState =
  | { status: "idle" }
  | { status: "unavailable"; address: string }
  | { status: "ready"; address: string; assets: Asset[] };

export default function SendPage() {
  const [amount, setAmount] = useState("");
  const [tokenId, setTokenId] = useState<string>(MIDEN_TOKENS[0].faucetId);
  const [amountTouched, setAmountTouched] = useState(false);
  const [expirationDays, setExpirationDays] = useState(7);
  const [pricePairId, setPricePairId] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [targetTouched, setTargetTouched] = useState(false);
  const [message, setMessage] = useState("");
  const [phase, setPhase] = useState<SendPhase>("idle");
  const [result, setResult] = useState<DropResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balanceState, setBalanceState] = useState<BalanceState>({ status: "idle" });
  const linkRef = useRef("");
  const qrRef = useRef("");
  const pendingUploadRef = useRef<EncryptedDrop | null>(null);
  const scrollTimer = useRef<number | null>(null);
  const copiedTimer = useRef<number | null>(null);
  const balanceRequestRef = useRef("");
  const { address, connected, requestAssets, requestTransaction, waitForTransaction } = useWallet();
  const { connectWallet, error: connectionError, pending: connectionPending } = useWalletConnection();
  const selectedToken = MIDEN_TOKENS.find((token) => token.faucetId === tokenId) ?? MIDEN_TOKENS[0];
  const selectedPricePair = findMidenPricePair(pricePairId);
  const normalizedAmount = amount.replace(",", ".");
  const normalizedTargetPrice = targetPrice.replace(",", ".");
  const parsedAmount = useMemo(() => {
    try {
      return { units: parseDecimalUnits(normalizedAmount, selectedToken.decimals), error: "" };
    } catch (amountError) {
      return { units: null, error: amountError instanceof Error ? amountError.message : "Enter a valid amount." };
    }
  }, [normalizedAmount, selectedToken.decimals]);
  const parsedTargetPrice = useMemo(() => {
    if (!selectedPricePair) return { units: null, error: "" };
    try {
      return { units: parseMidenTargetPrice(normalizedTargetPrice, selectedPricePair), error: "" };
    } catch (targetError) {
      const message = targetError instanceof Error ? targetError.message : "Enter a valid target price.";
      return { units: null, error: message.replace("amount", "target price") };
    }
  }, [normalizedTargetPrice, selectedPricePair]);
  const busy = phase === "creating" || phase === "uploading";
  const availableBalance = useMemo(() => {
    if (!connected) return { label: "Connect wallet to view", fullLabel: "Connect wallet to view", units: null };
    if (balanceState.status === "idle" || balanceState.address !== address) return { label: "Checking…", fullLabel: "Checking…", units: null };
    if (balanceState.status === "unavailable") return { label: "Unavailable", fullLabel: "Unavailable", units: null };

    const asset = balanceState.assets.find((candidate) => candidate.faucetId === selectedToken.faucetId);
    try {
      const units = BigInt(asset?.amount ?? "0");
      const formatted = formatDecimalUnits(units, selectedToken.decimals);
      const label = `${formatted} ${selectedToken.symbol}`;
      return { label, fullLabel: label, units };
    } catch {
      return { label: "Unavailable", fullLabel: "Unavailable", units: null };
    }
  }, [address, balanceState, connected, selectedToken]);
  const balanceError = parsedAmount.units !== null
    && availableBalance.units !== null
    && parsedAmount.units > availableBalance.units
    ? `You only have ${availableBalance.label} available.`
    : "";
  const amountError = parsedAmount.error || balanceError;
  const amountIsValid = parsedAmount.units !== null && !amountError;
  const targetIsValid = !selectedPricePair || (parsedTargetPrice.units !== null && !parsedTargetPrice.error);

  useEffect(() => {
    if (!connected || !address || !requestAssets) {
      balanceRequestRef.current = "";
      return;
    }

    if (balanceRequestRef.current === address) return;
    balanceRequestRef.current = address;
    let active = true;
    void requestAssets()
      .then((assets) => {
        if (active) setBalanceState({ status: "ready", address, assets });
      })
      .catch(() => {
        if (active) setBalanceState({ status: "unavailable", address });
      });

    return () => {
      active = false;
    };
  }, [address, connected, requestAssets]);

  useEffect(() => () => {
    if (scrollTimer.current !== null) window.clearTimeout(scrollTimer.current);
    if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current);
    linkRef.current = "";
    qrRef.current = "";
    pendingUploadRef.current = null;
  }, []);

  async function createDrop(event: FormEvent) {
    event.preventDefault();
    setAmountTouched(true);
    if (selectedPricePair) setTargetTouched(true);
    setError(null);
    if (!amountIsValid || parsedAmount.units === null || !targetIsValid) return;
    if (!connected || !address || !requestTransaction || !waitForTransaction) {
      await connectWallet();
      return;
    }
    setPhase("creating");
    setResult(null);
    setCopied(false);
    pendingUploadRef.current = null;
    try {
      const commonDropInput = {
        wallet: { address, requestTransaction, waitForTransaction },
        amount: parsedAmount.units,
        expirationDays,
        message: message.trim() || undefined,
        faucetId: selectedToken.faucetId,
        blocksPerDay: MIDEN_BLOCKS_PER_DAY,
      };
      const created = selectedPricePair && parsedTargetPrice.units !== null
        ? await createMidenDrop({
            ...commonDropInput,
            pricePair: selectedPricePair.id,
            rawTargetPrice: parsedTargetPrice.units,
          })
        : await createMidenDrop(commonDropInput);
      const encrypted = await encryptDropEnvelope(created.envelope);
      pendingUploadRef.current = encrypted;
      setResult({
        amount: normalizedAmount,
        symbol: selectedToken.symbol,
        expirationBlock: created.envelope.expirationBlock,
        transactionId: created.transactionId,
        ...(selectedPricePair && parsedTargetPrice.units !== null ? {
          pricePair: selectedPricePair.id,
          targetPrice: formatMidenTargetPrice(parsedTargetPrice.units, selectedPricePair),
        } : {}),
      });
      setBalanceState((current) => {
        if (current.status !== "ready" || current.address !== address) return current;
        return {
          status: "ready",
          address: current.address,
          assets: current.assets.map((asset) => {
            if (asset.faucetId !== selectedToken.faucetId) return asset;
            try {
              const remaining = BigInt(asset.amount) - parsedAmount.units;
              return { ...asset, amount: (remaining > BigInt(0) ? remaining : BigInt(0)).toString() };
            } catch {
              return asset;
            }
          }),
        };
      });
      await finishUpload(encrypted);
    } catch (creationError) {
      setPhase(pendingUploadRef.current ? "upload-failed" : "idle");
      setError(toCreationError(creationError, pendingUploadRef.current !== null, selectedToken.symbol));
    }
  }

  async function finishUpload(encrypted: EncryptedDrop) {
    try {
      setError(null);
      setPhase("uploading");
      await uploadEncryptedDrop(encrypted);
      const link = `${window.location.origin}/claim${buildDropFragment(encrypted)}`;
      linkRef.current = link;
      qrRef.current = await QRCode.toDataURL(link, { width: 280, margin: 2, errorCorrectionLevel: "M" });
      pendingUploadRef.current = null;
      setPhase("ready");
      scrollTimer.current = window.setTimeout(
        () => document.querySelector("#drop-result")?.scrollIntoView({ behavior: "smooth", block: "center" }),
        80,
      );
    } catch (uploadError) {
      setPhase("upload-failed");
      setError(uploadError instanceof Error ? uploadError.message : "The encrypted drop could not be stored. Try again.");
    }
  }

  async function retryUpload() {
    const encrypted = pendingUploadRef.current;
    if (encrypted) await finishUpload(encrypted);
  }

  async function copyLink() {
    try {
      if (!linkRef.current) return;
      await navigator.clipboard.writeText(linkRef.current);
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
          <h1>Send a drop<span>.</span></h1>
        </div>
        <div className="composer-stage">
          <form className="composer clipped-surface" id="composer" onSubmit={createDrop}>
            <div className="amount-row">
              <div className="amount-meta-row">
                <label htmlFor="drop-amount">You send</label>
                <span className="available-balance" title={`Available: ${availableBalance.fullLabel}`} aria-live="polite">
                  Available: <strong>{availableBalance.label}</strong>
                </span>
              </div>
              <div className="amount-input-row">
                <input id="drop-amount" inputMode="decimal" value={amount} placeholder="0.00" onBlur={() => setAmountTouched(true)} onChange={(event) => { setAmount(event.target.value); setAmountTouched(true); }} aria-label="Amount to send" aria-invalid={amountTouched && !amountIsValid} aria-describedby="amount-error" />
                <span className="token-select">
                  <span aria-hidden="true">{selectedToken.symbol.slice(0, 1)}</span>
                  <select value={tokenId} onChange={(event) => { setTokenId(event.target.value); setAmountTouched(true); }} aria-label="Token to send">
                    {MIDEN_TOKENS.map((token) => <option key={token.faucetId} value={token.faucetId}>{token.symbol}</option>)}
                  </select>
                </span>
              </div>
              <p className="field-error" id="amount-error" aria-live="polite">{amountTouched && !amountIsValid ? amountError : ""}</p>
            </div>
            <fieldset className="price-condition">
              <legend>Claim condition</legend>
              <div className="condition-fields">
                <label>
                  <span>Asset price</span>
                  <select value={pricePairId} onChange={(event) => { setPricePairId(event.target.value); setTargetPrice(""); setTargetTouched(false); }} aria-label="Price pair">
                    <option value="">No Oracle</option>
                    {MIDEN_PRICE_PAIRS.map((pair) => <option key={pair.id} value={pair.id}>{pair.id}</option>)}
                  </select>
                </label>
                <label>
                  <span>{selectedPricePair ? "Reaches" : "Target price"}</span>
                  <span className={`target-price-input${selectedPricePair ? "" : " is-disabled"}`}>
                    {selectedPricePair && <span aria-hidden="true">$</span>}
                    <input inputMode="decimal" value={targetPrice} disabled={!selectedPricePair} placeholder={selectedPricePair?.placeholder ?? "Not required"} onBlur={() => setTargetTouched(true)} onChange={(event) => { setTargetPrice(event.target.value); setTargetTouched(true); }} aria-label={selectedPricePair ? `${selectedPricePair.baseSymbol} target price in US dollars` : "No target price required"} aria-invalid={selectedPricePair ? targetTouched && !targetIsValid : undefined} aria-describedby="target-price-error" />
                  </span>
                </label>
              </div>
              <p className="field-error" id="target-price-error" aria-live="polite">{selectedPricePair && targetTouched && !targetIsValid ? parsedTargetPrice.error : ""}</p>
            </fieldset>
            <div className="composer-options">
              <label><span>Sender recovers after</span><select value={expirationDays} onChange={(event) => setExpirationDays(Number(event.target.value))} aria-label="Sender recovery delay">{EXPIRATIONS.map((option) => <option key={option.days} value={option.days}>{option.label}</option>)}</select></label>
              <label><span>Message</span><input value={message} maxLength={42} onChange={(event) => setMessage(event.target.value)} placeholder="Optional" /></label>
            </div>
            <button className="primary-button composer-submit" type="submit" disabled={!amountIsValid || !targetIsValid || busy || connectionPending} aria-busy={busy}>
              <span>{phase === "creating" ? "Confirming private note…" : phase === "uploading" ? "Securing private link…" : connected ? "Create private link" : connectionPending ? "Connecting wallet…" : "Connect wallet to create"}</span>
              <Icon name={busy ? "lock" : "arrow"} />
            </button>
            <p className="prototype-note"><Icon name="lock" size={14} /> {selectedPricePair ? `Before recovery, another bearer can claim when ${selectedPricePair.id} reaches your target.` : "Before recovery, another bearer with the link can claim."}</p>
          </form>
        </div>
      </section>

      {phase === "upload-failed" && result && (
        <section className="relay-recovery clipped-surface" role="alert">
          <div><strong>Your transaction is confirmed, but the private link is not available yet.</strong><p>Keep this page open and retry. The encrypted note remains only in this tab until it is stored.</p></div>
          <button className="secondary-button" type="button" onClick={retryUpload}>Retry secure upload</button>
        </section>
      )}

      <section id="drop-result" className={`drop-result${phase === "ready" ? " is-visible" : ""}`} aria-live="polite">
        <div className="result-copy">
          <div className="result-heading">
            <p className="result-status"><span><Icon name="check" size={18} /></span>Your private drop is ready</p>
            <h2>{result?.amount ?? amount} {result?.symbol ?? selectedToken.symbol}, ready to share<span>.</span></h2>
            <p>The note is encrypted before it reaches Miden Drop. Send this bearer link only through a channel you trust.</p>
          </div>
          {result && <p className="result-condition"><span>Claim condition</span><strong>{result.pricePair ? `${result.pricePair} ≥ ${result.targetPrice}` : "Bearer link · no Oracle"}</strong></p>}
          <div className="result-share">
            <div className="link-output"><code>{linkRef.current}</code><button type="button" onClick={copyLink}><Icon name={copied ? "check" : "copy"} size={18} />{copied ? "Copied" : "Copy link"}</button></div>
            {linkRef.current && <Link className="text-action" href={linkRef.current}>Open claim page <Icon name="arrow" size={18} /></Link>}
          </div>
        </div>
        <div className="result-qr">{qrRef.current && <QrPreview source={qrRef.current} />}<span>Scan to open the private bearer link</span></div>
        {result && <p className="transaction-reference"><Icon name="lock" size={14} />Transaction {result.transactionId} · sender recovery at block {result.expirationBlock.toLocaleString()}</p>}
      </section>
    </main>
  );
}

function toCreationError(error: unknown, noteWasCreated: boolean, tokenSymbol: string) {
  if (noteWasCreated) return "The transaction is confirmed, but the encrypted link could not be stored. Retry without closing this page.";
  const message = error instanceof Error ? error.message : "";
  if (/reject|denied|cancel/iu.test(message)) return "The wallet request was cancelled. Your funds have not moved.";
  if (/insufficient|balance/iu.test(message)) return `Your wallet does not have enough ${tokenSymbol} for this drop.`;
  if (/network|fetch|rpc|offline|timeout/iu.test(message)) return "Miden Testnet could not be reached. Check your connection and try again.";
  return message || "The wallet could not create this drop. Your funds have not moved.";
}
