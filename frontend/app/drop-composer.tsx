"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import * as m from "motion/react-m";
import type { Asset } from "@miden-sdk/miden-wallet-adapter-base";
import { useWallet } from "@miden-sdk/miden-wallet-adapter-react";

import { uploadEncryptedDrop } from "@/lib/drop/api";
import { formatDecimalUnits, parseDecimalUnits } from "@/lib/drop/amount";
import { encryptDropEnvelope } from "@/lib/drop/crypto";
import { buildDropFragment, type EncryptedDrop } from "@/lib/drop/protocol";
import { MIDEN_BLOCKS_PER_DAY, MIDEN_TOKENS } from "@/lib/miden/config";
import { createMidenDrop } from "@/lib/miden/drop-client";
import { toCreationError } from "@/lib/miden/wallet-errors";
import { MIDEN_PRICE_PAIRS, findMidenPricePair, formatMidenTargetPrice, parseMidenTargetPrice } from "@/lib/miden/price-pairs";
import { useWalletConnection } from "./wallet-connection";
import { Icon, QrPreview } from "./ui";
import { ActionButton, Disclosure, ErrorNotice, PendingMark, StatusLabel, SuccessMark } from "./motion";

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

export default function DropComposer() {
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
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balanceState, setBalanceState] = useState<BalanceState>({ status: "idle" });
  const linkRef = useRef("");
  const qrRef = useRef("");
  const pendingUploadRef = useRef<EncryptedDrop | null>(null);
  const scrollTimer = useRef<number | null>(null);
  const copiedTimer = useRef<number | null>(null);
  const balanceRequestRef = useRef("");
  const { address, connected, requestAssets, requestGuardianInfo, requestTransaction, waitForTransaction } = useWallet();
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
    if (busy || phase === "upload-failed" || phase === "ready") return;
    if (!connected) {
      await connectWallet();
      return;
    }
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
        wallet: { address, requestGuardianInfo, requestTransaction, waitForTransaction },
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
        () => {
          const resultHeading = document.querySelector<HTMLElement>("#drop-result-title");
          resultHeading?.focus({ preventScroll: true });
          resultHeading?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
        },
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
      if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("The link could not be copied. Select it manually instead.");
    }
  }

  async function shareLink() {
    if (!linkRef.current || sharing) return;
    if (!navigator.share) {
      await copyLink();
      return;
    }
    setSharing(true);
    try {
      await navigator.share({ title: "A private Miden Drop", url: linkRef.current });
    } catch (shareError) {
      if (!(shareError instanceof Error && shareError.name === "AbortError")) {
        await copyLink();
      }
    } finally {
      setSharing(false);
    }
  }

  function startAnotherDrop() {
    linkRef.current = "";
    qrRef.current = "";
    setResult(null);
    setAmount("");
    setAmountTouched(false);
    setMessage("");
    setPricePairId("");
    setTargetPrice("");
    setTargetTouched(false);
    setCopied(false);
    setError(null);
    setPhase("idle");
  }

  return (
    <main className="send-view" id="main-content">
      <section className="send-page">
        <div className="task-intro">
          <h1>{phase === "ready" ? "Your drop is ready" : "Create a drop"}<span>.</span></h1>
          <p>{phase === "ready" ? "Send the link. They claim it to their wallet." : "Turn a private note into a link you can share."}</p>
        </div>
        <ErrorNotice message={error || connectionError} />
        {phase !== "ready" && (
          <form className="composer" id="composer" onSubmit={createDrop}>
            <fieldset className="composer-fields" disabled={busy || phase === "upload-failed"}>
              <legend className="sr-only">Drop details</legend>
              <div className="amount-row">
                <label htmlFor="drop-amount">Amount</label>
                <div className="amount-input-row">
                  <input id="drop-amount" inputMode="decimal" autoComplete="off" value={amount} placeholder="0.00" onBlur={() => setAmountTouched(true)} onChange={(event) => { setAmount(event.target.value); setAmountTouched(true); }} aria-invalid={amountTouched && !amountIsValid} aria-describedby="amount-error available-balance" />
                  <span className="token-select">
                    <m.span key={selectedToken.faucetId} aria-hidden="true" initial={{ scale: 0.85 }} animate={{ scale: 1 }}>{selectedToken.symbol.slice(0, 1)}</m.span>
                    <select value={tokenId} onChange={(event) => { setTokenId(event.target.value); setAmountTouched(true); }} aria-label="Token to send">
                      {MIDEN_TOKENS.map((token) => <option key={token.faucetId} value={token.faucetId}>{token.symbol}</option>)}
                    </select>
                  </span>
                </div>
                <p className="available-balance" id="available-balance" aria-live="polite">{connected ? <>Available: <strong>{availableBalance.label}</strong></> : "Connect Bread to see your balance"}</p>
                {amountTouched && !amountIsValid && <p className="field-error" id="amount-error" role="alert">{amountError}</p>}
              </div>
              <Disclosure className="drop-options" title={<span><strong>Drop options</strong><small>{selectedPricePair ? `${selectedPricePair.id} price condition · ` : ""}Recover unclaimed funds after {expirationDays} {expirationDays === 1 ? "day" : "days"}</small></span>}>
                <div className="composer-options">
                  <label><span>Recovery window</span><select value={expirationDays} onChange={(event) => setExpirationDays(Number(event.target.value))} aria-label="Sender recovery delay">{EXPIRATIONS.map((option) => <option key={option.days} value={option.days}>{option.label}</option>)}</select></label>
                  <p className="field-hint">After this window, only you can recover an unclaimed drop using its link. Timing follows Miden blocks.</p>
                  <label><span>Private message <span className="optional-label">(optional)</span></span><input value={message} maxLength={42} onChange={(event) => setMessage(event.target.value)} placeholder="A little something for you" /></label>
                </div>
                <fieldset className="price-condition">
                  <legend>Price condition <span className="optional-label">(optional)</span></legend>
                  <div className="condition-fields">
                    <label>
                      <span>Claim when</span>
                      <select value={pricePairId} onChange={(event) => { setPricePairId(event.target.value); setTargetPrice(""); setTargetTouched(false); }} aria-label="Price pair">
                        <option value="">Any time before recovery</option>
                        {MIDEN_PRICE_PAIRS.map((pair) => <option key={pair.id} value={pair.id}>{pair.id} reaches a target</option>)}
                      </select>
                    </label>
                    {selectedPricePair && <label>
                      <span>Target price (USD)</span>
                      <span className="target-price-input">
                        <span aria-hidden="true">$</span>
                        <input inputMode="decimal" value={targetPrice} placeholder={selectedPricePair.placeholder} onBlur={() => setTargetTouched(true)} onChange={(event) => { setTargetPrice(event.target.value); setTargetTouched(true); }} aria-label={`${selectedPricePair.baseSymbol} target price in US dollars`} aria-invalid={targetTouched && !targetIsValid} aria-describedby="target-price-error" />
                      </span>
                    </label>}
                  </div>
                  {selectedPricePair && targetTouched && !targetIsValid && <p className="field-error" id="target-price-error" role="alert">{parsedTargetPrice.error}</p>}
                </fieldset>
              </Disclosure>
            </fieldset>
            <div className="composer-action">
              <ActionButton className="primary-button composer-submit" type="submit" disabled={(connected && (!amountIsValid || !targetIsValid)) || busy || phase === "upload-failed" || connectionPending} aria-busy={busy}>
                <StatusLabel state={`${phase}-${connected}-${connectionPending}`}>{phase === "creating" ? "Confirming private note…" : phase === "uploading" ? "Securing private link…" : connected ? "Create drop" : connectionPending ? "Connecting wallet…" : "Connect Bread to create"}</StatusLabel>
                {busy || connectionPending ? <PendingMark /> : <Icon name="arrow" />}
              </ActionButton>
              <p className="privacy-note"><Icon name="lock" size={15} /> {selectedPricePair ? `Claimable when ${selectedPricePair.id} reaches your target, before recovery.` : "Anyone with the link can claim before recovery."}</p>
            </div>
          </form>
        )}

        {phase === "upload-failed" && result && (
          <section className="relay-recovery" role="alert">
            <div><strong>Your note is created. Finish saving the link.</strong><p>Keep this page open and retry. The encrypted note remains only in this tab until it is stored.</p></div>
            <ActionButton className="secondary-button" type="button" onClick={retryUpload}>Retry secure upload</ActionButton>
          </section>
        )}

        {phase === "ready" && result && (
          <section id="drop-result" className="drop-result" aria-labelledby="drop-result-title">
            <div className="result-heading">
              <SuccessMark />
              <h2 id="drop-result-title" tabIndex={-1}>{result.amount} <span>{result.symbol}</span></h2>
              <p>Keep a copy of this link to recover the drop if it goes unclaimed.</p>
            </div>
            <dl className="detail-list">
              <div><dt>Claim condition</dt><dd>{result.pricePair ? `${result.pricePair} ≥ ${result.targetPrice}` : "Anyone with the link"}</dd></div>
              <div><dt>Recovery opens</dt><dd>Block {result.expirationBlock.toLocaleString()}</dd></div>
            </dl>
            <div className="result-share">
              <label className="sr-only" htmlFor="created-link">Your private drop link</label>
              <input className="created-link" id="created-link" readOnly value={linkRef.current} onFocus={(event) => event.target.select()} />
              <ActionButton className="primary-button" type="button" onClick={shareLink} disabled={sharing}><Icon name="share" />{sharing ? "Opening share…" : "Share drop"}</ActionButton>
              <ActionButton className="secondary-button" type="button" onClick={copyLink}><m.span className="button-icon" key={copied ? "copied" : "copy"} initial={{ scale: 0.8 }} animate={{ scale: 1 }}><Icon name={copied ? "check" : "copy"} size={18} /></m.span><StatusLabel state={copied ? "copied" : "copy"}>{copied ? "Link copied" : "Copy link"}</StatusLabel></ActionButton>
              <span className="sr-only" role="status">{copied ? "Private drop link copied to clipboard" : ""}</span>
              <p className="privacy-note"><Icon name="lock" size={15} />Share only with the person you want to claim it.</p>
            </div>
            <Disclosure className="qr-details" title="Show QR code"><div className="result-qr">{qrRef.current && <QrPreview source={qrRef.current} />}<p>Scan to open this private drop.</p></div></Disclosure>
            <Disclosure className="transaction-details" title="Transaction details"><p className="transaction-reference">{result.transactionId}</p><Link className="text-action" href={linkRef.current}>Open claim page <Icon name="arrow" size={18} /></Link></Disclosure>
            <ActionButton className="text-action create-another" type="button" onClick={startAnotherDrop}>Create another drop<Icon name="arrow" size={18} /></ActionButton>
          </section>
        )}
        {phase === "idle" && <Disclosure className="how-it-works" title="How do drops work?"><p>Create a private note from your wallet, then share its encrypted link. The recipient opens it and claims the funds to their own wallet. Keep the link: you can use it to recover unclaimed funds once the recovery window opens.</p></Disclosure>}
      </section>
    </main>
  );
}
