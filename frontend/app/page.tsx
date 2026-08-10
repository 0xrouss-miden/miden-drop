import Link from "next/link";
import { Icon, ProofField } from "./ui";

export default function HomePage() {
  return (
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
        <h2 id="landing-story-title">Share money as easily as a link<span>.</span></h2>
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
        <Link className="primary-button" href="/send"><span>Create a private drop</span><Icon name="arrow" /></Link>
      </section>
    </main>
  );
}
