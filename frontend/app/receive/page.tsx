"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon, previewLink } from "../ui";

export default function ReceivePage() {
  const router = useRouter();
  const [scannerOpen, setScannerOpen] = useState(false);

  function reviewDrop(event: FormEvent) {
    event.preventDefault();
    router.push("/claim?drop=preview");
  }

  return (
    <main className="receive-page">
      <section className="receive-section">
        <div className="section-intro">
          <Link className="back-link" href="/"><Icon name="back" size={17} /> Back to home</Link>
          <h1>Receive a drop<span>.</span></h1>
        </div>
        <div className="receive-workspace clipped-surface" aria-live="polite">
          {scannerOpen ? (
            <div className="scanner is-open">
              <div className="scanner-frame"><span /><span /><span /><span /><Icon name="scan" size={44} /></div>
              <h2>Scanner preview</h2>
              <p>Camera capture will be connected when claim import is implemented.</p>
              <button className="secondary-button" type="button" onClick={() => setScannerOpen(false)}>Use a link instead</button>
            </div>
          ) : (
            <form className="paste-form" onSubmit={reviewDrop}>
              <label htmlFor="claim-link">Drop link</label>
              <input id="claim-link" type="url" defaultValue={previewLink} />
              <button className="primary-button" type="submit"><span>Review drop</span><Icon name="arrow" /></button>
              <button className="scan-action" type="button" onClick={() => setScannerOpen(true)}><Icon name="scan" size={18} /> Scan QR code</button>
              <p>Keep private drop links out of public channels.</p>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
