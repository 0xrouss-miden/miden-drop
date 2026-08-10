"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AllowedPrivateData,
  PrivateDataPermission,
  WalletAdapterNetwork,
} from "@miden-sdk/miden-wallet-adapter-base";
import { useWallet } from "@miden-sdk/miden-wallet-adapter-react/dist/useWallet.js";

const previewLink = "https://drop.miden.xyz/claim#7x8k9m2q";

type IconName =
  | "arrow"
  | "back"
  | "calendar"
  | "check"
  | "copy"
  | "link"
  | "lock"
  | "scan"
  | "wallet";

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    arrow: <><path d="M5 12h14" /><path d="m14 7 5 5-5 5" /></>,
    back: <><path d="M19 12H5" /><path d="m10 7-5 5 5 5" /></>,
    calendar: <><path d="M5 4v3M19 4v3M4 9h16" /><rect x="4" y="6" width="16" height="14" rx="1" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    copy: <><rect x="8" y="8" width="11" height="11" rx="1" /><path d="M16 8V5H5v11h3" /></>,
    link: <><path d="m9.5 14.5 5-5" /><path d="M7 17H5a4 4 0 0 1 0-8h4M17 7h2a4 4 0 0 1 0 8h-4" /></>,
    lock: <><rect x="5" y="10" width="14" height="10" rx="1" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" /></>,
    scan: <><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" /><rect x="8" y="8" width="8" height="8" rx="2" /></>,
    wallet: <><path d="M4 7h15a2 2 0 0 1 2 2v10H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12v3" /><path d="M16 12h5v4h-5a2 2 0 0 1 0-4Z" /></>,
  };

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function BrandMark() {
  return (
    <svg aria-hidden="true" className="brand-mark" viewBox="0 0 28 28">
      <path d="M2 2h8v8H2zM18 2h8v8h-8zM10 10h8v8h-8zM2 18h8v8H2zM18 18h8v8h-8z" />
    </svg>
  );
}

function ProofField({ compact = false }: { compact?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={compact ? "proof-field proof-field--compact" : "proof-field"}
      viewBox="0 0 620 650"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <pattern id={compact ? "proof-dots-small" : "proof-dots"} width="7" height="7" patternUnits="userSpaceOnUse">
          <circle cx="1.2" cy="1.2" r="1" fill="currentColor" />
        </pattern>
      </defs>
      <g className="proof-orbit" fill="none" stroke="currentColor" strokeWidth="1">
        <path d="M73 177 308 38l235 139v276L308 592 73 453Z" />
        <path d="m73 177 235 139 235-139M308 316v276M73 453l235-137 235 137" />
        <path d="M151 132 387 270v276M229 86l235 138v276M151 500V224l235-139M73 315l235-138 235 138" opacity=".55" />
      </g>
      <g fill={`url(#${compact ? "proof-dots-small" : "proof-dots"})`} opacity=".78">
        <path d="m73 177 235 139v276L73 453Z" />
        <path d="m308 38 235 139-235 139L73 177Z" opacity=".5" />
        <path d="m308 316 235-139v276L308 592Z" opacity=".36" />
        <path d="m229 224 79-47 78 47-78 46Z" opacity=".9" />
      </g>
      <g fill="currentColor">
        {[[73,177],[308,38],[543,177],[543,453],[308,592],[73,453],[308,316],[151,132],[464,224],[151,500]].map(([x,y]) => (
          <rect key={`${x}-${y}`} x={x - 4} y={y - 4} width="8" height="8" />
        ))}
        <circle cx="574" cy="315" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      </g>
    </svg>
  );
}

function QrPreview() {
  const cells = useMemo(() => Array.from({ length: 21 * 21 }, (_, index) => {
    const row = Math.floor(index / 21);
    const column = index % 21;
    const inFinder = (originRow: number, originColumn: number) => {
      const y = row - originRow;
      const x = column - originColumn;
      if (x < 0 || y < 0 || x > 6 || y > 6) return false;
      return x === 0 || y === 0 || x === 6 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4);
    };
    return inFinder(0, 0) || inFinder(0, 14) || inFinder(14, 0) || ((index * 17 + row * row + column * 7) % 13 < 6);
  }), []);

  return (
    <div className="qr-preview" role="img" aria-label="Illustrative QR code for the generated drop">
      {cells.map((active, index) => <span className={active ? "is-active" : ""} key={index} />)}
    </div>
  );
}

function shortAddress(address?: string | null) {
  if (!address) return "Connected";
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

type AppView = "landing" | "send" | "receive" | "claim";

function MidenDropApp({ initialView = "landing" }: { initialView?: AppView }) {
  const router = useRouter();
  const {
    address,
    connect,
    connected,
    connecting,
    select,
    wallet,
    wallets: availableWallets,
  } = useWallet();
  const [error, setError] = useState<string | null>(null);
  const [connectRequested, setConnectRequested] = useState(false);
  const [amount, setAmount] = useState("125.00");
  const [amountTouched, setAmountTouched] = useState(false);
  const [expiry, setExpiry] = useState("7 days");
  const [note, setNote] = useState("");
  const [dropCreated, setDropCreated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [receiveMode, setReceiveMode] = useState<"scan" | "paste">("scan");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [claimPreviewed, setClaimPreviewed] = useState(false);
  const normalizedAmount = amount.replace(",", ".");
  const amountValid = /^\d+(?:[.,]\d{0,2})?$/.test(amount) && Number.isFinite(Number(normalizedAmount)) && Number(normalizedAmount) > 0;

  useEffect(() => {
    if (!connectRequested || !wallet) return;

    void connect(
      PrivateDataPermission.UponRequest,
      WalletAdapterNetwork.Testnet,
      AllowedPrivateData.None,
    )
      .catch((connectionError: unknown) => {
        setError(connectionError instanceof Error ? connectionError.message : "Could not connect to the wallet.");
      })
      .finally(() => setConnectRequested(false));
  }, [connect, connectRequested, wallet]);

  async function handleWalletConnection() {
    setError(null);
    if (connected) return;

    try {
      if (!wallet) {
        const availableWallet = availableWallets[0];
        if (!availableWallet) throw new Error("Bread Wallet is not available in this browser.");
        setConnectRequested(true);
        select(availableWallet.adapter.name);
      } else {
        await connect(
          PrivateDataPermission.UponRequest,
          WalletAdapterNetwork.Testnet,
          AllowedPrivateData.None,
        );
      }
    } catch (connectionError) {
      setError(connectionError instanceof Error ? connectionError.message : "Could not connect to the wallet.");
    }
  }

  function createDrop(event?: FormEvent) {
    event?.preventDefault();
    setAmountTouched(true);
    if (!amountValid) return;
    setDropCreated(true);
    window.setTimeout(() => document.querySelector("#drop-result")?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(previewLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("The link could not be copied. Select it manually instead.");
    }
  }

  const walletLabel = connecting || connectRequested ? "Connecting…" : connected ? shortAddress(address) : "Connect Wallet";

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link href="/" className="brand" aria-label="Miden Drop home">
          <BrandMark />
          <span>Miden Drop</span>
        </Link>
        <nav className="main-nav" aria-label="Main navigation">
          <Link className={initialView === "send" ? "is-active" : ""} href="/send">Send</Link>
          <Link className={initialView === "receive" ? "is-active" : ""} href="/receive">Receive</Link>
          <span className="network-label"><span />Miden Testnet</span>
        </nav>
        {connected ? (
          <div className="wallet-button is-connected" role="status" aria-label={`Wallet connected: ${address ?? "address available"}`}>
            <Icon name="wallet" size={18} />
            <span className="wallet-label">{walletLabel}</span>
          </div>
        ) : (
          <button className="wallet-button" type="button" onClick={handleWalletConnection} disabled={connecting || connectRequested}>
            <Icon name="wallet" size={18} />
            <span className="wallet-label">
              {!connecting && !connectRequested ? (
                <><span className="wallet-label-full">Connect Wallet</span><span className="wallet-label-short">Connect</span></>
              ) : walletLabel}
            </span>
          </button>
        )}
      </header>

      {error && <div className="error-banner" role="alert">{error}</div>}

      {initialView === "claim" ? (
        <main className="claim-page">
          <div className="claim-proof"><ProofField compact /></div>
          <section className="claim-intro">
            <Link className="back-link" href="/"><Icon name="back" size={17} /> Back to Miden Drop</Link>
            <h1>A private drop is waiting for you<span>.</span></h1>
            <p>Review the payment details, connect your wallet, and claim it privately on Miden Testnet.</p>
          </section>
          <section className="claim-surface clipped-surface" aria-labelledby="claim-details-title">
            <div className="surface-heading">
              <div>
                <p className="surface-label">Drop details</p>
                <h2 id="claim-details-title">125.00 <span>MID</span></h2>
              </div>
              <span className="private-badge"><Icon name="lock" size={16} /> Private note</span>
            </div>
            <dl className="detail-list">
              <div><dt>From</dt><dd>Private sender</dd></div>
              <div><dt>Network</dt><dd><span className="status-dot" />Miden Testnet</dd></div>
              <div><dt>Expires</dt><dd>In 7 days</dd></div>
              <div><dt>Message</dt><dd>For coffee</dd></div>
            </dl>
            {claimPreviewed ? (
              <div className="success-state" role="status">
                <span><Icon name="check" /></span>
                <div><strong>Claim preview complete</strong><p>No transaction was submitted. Claim logic will be added next.</p></div>
              </div>
            ) : (
              <button className="primary-button claim-button" type="button" onClick={connected ? () => setClaimPreviewed(true) : handleWalletConnection}>
                <span>{connected ? "Preview claim" : "Connect Wallet to claim"}</span><Icon name="arrow" />
              </button>
            )}
            <p className="prototype-note"><Icon name="lock" size={14} /> This is an interface preview. The link payload is not imported yet.</p>
          </section>
        </main>
      ) : initialView === "landing" ? (
        <main className="landing-page">
          <section className="landing-hero">
            <div className="hero-copy">
              <h1>Private money,<br />ready to share<span>.</span></h1>
              <p>Send value through a private link. The recipient can review and claim it from their own wallet.</p>
              <div className="hero-actions">
                <Link className="primary-button" href="/send"><span>Create a drop</span><Icon name="arrow" /></Link>
                <Link className="text-action" href="/receive">Receive a drop <Icon name="arrow" size={18} /></Link>
              </div>
              <p className="privacy-line"><Icon name="lock" size={16} /> Self-custodial and private by design.</p>
            </div>
            <div className="landing-proof" aria-hidden="true">
              <ProofField />
              <div className="proof-message clipped-surface">
                <span><Icon name="lock" size={18} /> Private note</span>
                <strong>Only the proof travels onchain.</strong>
                <small>The payment details stay with the people involved.</small>
              </div>
            </div>
          </section>

          <section className="landing-story" aria-labelledby="landing-story-title">
            <div>
              <h2 id="landing-story-title">Share money as easily as a link<span>.</span></h2>
            </div>
            <div className="landing-story-copy">
              <p>Miden Drop turns a private note into a simple bearer link. Create it locally, send it through a channel you trust, and let the recipient claim it to their wallet.</p>
              <p>The network verifies a zero-knowledge proof without receiving the private payment details.</p>
            </div>
          </section>

          <section className="explain-strip landing-explain" aria-label="How Miden Drop works">
            <div className="process-block">
              <h2>From wallet to wallet</h2>
              <ol className="process-list">
                <li><span>1</span><div><strong>Create privately</strong><p>Choose an amount and create the drop on your device.</p></div></li>
                <li><span>2</span><div><strong>Share securely</strong><p>Send the private bearer link through a trusted channel.</p></div></li>
                <li><span>3</span><div><strong>Claim to wallet</strong><p>The recipient reviews and claims the drop.</p></div></li>
              </ol>
            </div>
            <div className="visibility-block">
              <h2>What Miden sees</h2>
              <div className="visibility-comparison">
                <div><strong>You and the recipient</strong><p>Amount · Message · Claim data</p></div>
                <Icon name="arrow" size={18} />
                <div className="network-view"><strong>Miden network</strong><p>Commitment · Valid proof</p></div>
              </div>
            </div>
          </section>

          <section className="landing-cta">
            <h2>Ready when you are<span>.</span></h2>
            <div><Link className="primary-button" href="/send"><span>Create a private drop</span><Icon name="arrow" /></Link></div>
          </section>
        </main>
      ) : initialView === "receive" ? (
        <main className="receive-page">
          <section className="receive-section">
            <div className="section-intro">
              <Link className="back-link" href="/"><Icon name="back" size={17} /> Back to home</Link>
              <h1>Receive a private drop<span>.</span></h1>
              <p>Open a claim link or scan its QR code. You will see the payment details before connecting your wallet.</p>
            </div>
            <div className="receive-workspace clipped-surface">
              <div className="receive-tabs" aria-label="Receive method">
                <button className={receiveMode === "scan" ? "is-active" : ""} type="button" aria-pressed={receiveMode === "scan"} onClick={() => setReceiveMode("scan")}>Scan QR</button>
                <button className={receiveMode === "paste" ? "is-active" : ""} type="button" aria-pressed={receiveMode === "paste"} onClick={() => setReceiveMode("paste")}>Paste link</button>
              </div>
              {receiveMode === "scan" ? (
                <div className={`scanner${scannerOpen ? " is-open" : ""}`} aria-live="polite">
                  <div className="scanner-frame"><span /><span /><span /><span /><Icon name="scan" size={44} /></div>
                  <h2>{scannerOpen ? "Scanner preview is open" : "Scan a Miden Drop QR"}</h2>
                  <p>{scannerOpen ? "Camera capture will be connected when claim import logic is implemented." : "Preview the scanner area without requesting camera permission."}</p>
                  <button className="secondary-button" type="button" onClick={() => setScannerOpen((open) => !open)}><Icon name="scan" size={18} />{scannerOpen ? "Close scanner preview" : "Preview scanner"}</button>
                </div>
              ) : (
                <form className="paste-form" onSubmit={(event) => { event.preventDefault(); router.push("/claim?drop=preview"); }}>
                  <label htmlFor="claim-link">Private claim link</label>
                  <div><input id="claim-link" type="url" defaultValue={previewLink} /><button className="primary-button" type="submit"><span>Review drop</span><Icon name="arrow" /></button></div>
                  <p>The link can contain sensitive bearer data. Do not post it publicly.</p>
                </form>
              )}
            </div>
          </section>
        </main>
      ) : (
        <main className="send-view">
          <section className="hero send-page">
            <div className="hero-copy send-intro">
              <Link className="back-link" href="/"><Icon name="back" size={17} /> Back to home</Link>
              <h1>Create a private drop<span>.</span></h1>
              <p>Choose an amount, create the private link, and share it through a channel you trust.</p>
              <p className="privacy-line"><Icon name="lock" size={16} /> Your device keeps the payment details.</p>
            </div>
            <div className="composer-stage">
              <ProofField />
              <form className="composer clipped-surface" id="composer" onSubmit={createDrop}>
                <div className="amount-row">
                  <label htmlFor="drop-amount">You send</label>
                  <div className="amount-input-row">
                    <input
                      id="drop-amount"
                      inputMode="decimal"
                      value={amount}
                      onBlur={() => setAmountTouched(true)}
                      onChange={(event) => { setAmount(event.target.value); setAmountTouched(true); }}
                      aria-label="Amount to send"
                      aria-invalid={amountTouched && !amountValid}
                      aria-describedby="amount-error"
                    />
                    <span className="token-select"><span>M</span>MID</span>
                  </div>
                  <p className="field-error" id="amount-error" aria-live="polite">
                    {amountTouched && !amountValid ? "Enter a positive amount with up to two decimal places." : ""}
                  </p>
                </div>
                <div className="field-row field-row--static">
                  <span className="field-icon"><Icon name="link" /></span>
                  <span><small>Recipient</small><strong>Anyone with the link</strong></span>
                  <span className="field-state">Default</span>
                </div>
                <div className="field-row field-row--static">
                  <span className="field-icon"><Icon name="lock" /></span>
                  <span><small>Privacy</small><strong>Private note</strong><em>Only the recipient can view the note.</em></span>
                  <span className="field-state">On</span>
                </div>
                <label className="field-row">
                  <span className="field-icon"><Icon name="calendar" /></span>
                  <span><small>Expires</small>
                    <select value={expiry} onChange={(event) => setExpiry(event.target.value)} aria-label="Drop expiration">
                      <option>1 day</option><option>7 days</option><option>30 days</option>
                    </select>
                  </span>
                </label>
                <label className="note-input"><span>Private message</span><input value={note} maxLength={42} onChange={(event) => setNote(event.target.value)} placeholder="Optional note for the recipient" /></label>
                <button className="primary-button composer-submit" type="submit" disabled={!amountValid}>
                  <span>Create private link</span><Icon name="arrow" />
                </button>
                <p className="prototype-note"><Icon name="lock" size={14} /> Interface preview — no transaction is submitted yet.</p>
              </form>
            </div>
          </section>

          <section className="explain-strip" aria-label="How Miden Drop works">
            <div className="process-block">
              <h2>How it works</h2>
              <ol className="process-list">
                <li><span>1</span><div><strong>Create privately</strong><p>Compose a private drop on your device.</p></div></li>
                <li><span>2</span><div><strong>Share securely</strong><p>Send the bearer link through a channel you trust.</p></div></li>
                <li><span>3</span><div><strong>Claim to wallet</strong><p>The recipient opens the link and claims the drop.</p></div></li>
              </ol>
            </div>
            <div className="visibility-block">
              <h2>What Miden sees</h2>
              <div className="visibility-comparison">
                <div><strong>You and the recipient</strong><p>Amount · Message · Claim data</p></div>
                <Icon name="arrow" size={18} />
                <div className="network-view"><strong>Miden network</strong><p>Commitment · Valid proof</p></div>
              </div>
            </div>
          </section>

          <section id="drop-result" className={`drop-result${dropCreated ? " is-visible" : ""}`} aria-live="polite">
            <div className="result-copy">
              <p className="result-status"><span><Icon name="check" size={16} /></span>Your drop is ready</p>
              <h2>{amount || "125.00"} MID, ready to share<span>.</span></h2>
              <p>The full claim data belongs in the private link. Send it only through a channel you trust.</p>
              <div className="link-output"><code>{previewLink}</code><button type="button" onClick={copyLink}><Icon name={copied ? "check" : "copy"} size={18} />{copied ? "Copied" : "Copy link"}</button></div>
              <Link className="text-action" href="/claim?drop=preview">Open claim preview <Icon name="arrow" size={18} /></Link>
            </div>
            <div className="result-qr"><QrPreview /><span>Illustrative QR preview</span></div>
            <div className="result-life">
              <div className="life-step is-active"><span /><strong>Created</strong><small>Just now</small></div>
              <div className="life-step"><span /><strong>Active</strong><small>{expiry}</small></div>
              <div className="life-step"><span /><strong>Claimed</strong><small>Waiting</small></div>
            </div>
          </section>

        </main>
      )}

      <footer className={`site-footer${initialView === "landing" ? "" : " site-footer--compact"}`}>
        <Link className="brand" href="/"><BrandMark /><span>Miden Drop</span></Link>
        <p>Private, programmable money you can send as a link.</p>
        <span className="network-label"><span />Miden Testnet</span>
      </footer>
    </div>
  );
}

export default function WalletConnection({ initialView = "landing" }: { initialView?: AppView }) {
  return <MidenDropApp initialView={initialView} />;
}
