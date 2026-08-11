"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "../ui";

export default function ReceivePage() {
  const router = useRouter();
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reviewDrop(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const value = link.trim();
      const parsed = value.startsWith("#") ? new URL(`/claim${value}`, window.location.origin) : new URL(value);
      if (!parsed.hash.startsWith("#v1.")) throw new Error();
      router.push(`/claim${parsed.hash}`);
    } catch {
      setError("Paste the complete private drop link, including the secret after #.");
    }
  }

  return (
    <main className="receive-page">
      <section className="receive-section">
        <div className="section-intro">
          <Link className="back-link" href="/"><Icon name="back" size={17} /> Back to home</Link>
          <h1>Receive a drop<span>.</span></h1>
        </div>
        {error && <div className="error-banner" role="alert">{error}</div>}
        <div className="receive-workspace clipped-surface" aria-live="polite">
          <form className="paste-form" onSubmit={reviewDrop}>
            <label htmlFor="claim-link">Private drop link</label>
            <input id="claim-link" type="text" inputMode="url" autoComplete="off" spellCheck={false} value={link} onChange={(event) => setLink(event.target.value)} placeholder="https://drop.miden.xyz/claim#v1…" />
            <button className="primary-button" type="submit" disabled={!link.trim()}><span>Review drop</span><Icon name="arrow" /></button>
            <p><Icon name="lock" size={14} /> The secret stays on this device while the drop is opened.</p>
          </form>
        </div>
      </section>
    </main>
  );
}
