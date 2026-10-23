"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "../ui";
import { ActionButton, ErrorNotice } from "../motion";

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
    <main className="receive-page" id="main-content">
      <section className="receive-section">
        <div className="task-intro">
          <h1>Receive a drop<span>.</span></h1>
          <p>Paste a private link to see what’s inside.</p>
        </div>
        <ErrorNotice id="link-error" message={error} />
        <div className="receive-workspace">
          <form className="paste-form" onSubmit={reviewDrop}>
            <label htmlFor="claim-link">Private drop link</label>
            <textarea id="claim-link" rows={3} inputMode="url" autoCapitalize="none" autoComplete="off" spellCheck={false} value={link} onChange={(event) => { setLink(event.target.value); setError(null); }} placeholder="Paste your drop link here" aria-invalid={!!error} aria-describedby={error ? "link-error" : undefined} />
            <ActionButton className="primary-button" type="submit" disabled={!link.trim()}><span>Review drop</span><Icon name="arrow" /></ActionButton>
            <p className="privacy-note"><Icon name="lock" size={15} />Review first. Nothing is claimed until you approve.</p>
          </form>
        </div>
        <p className="receive-help">Already have a drop link in a message? Open it directly to review and claim.</p>
      </section>
    </main>
  );
}
