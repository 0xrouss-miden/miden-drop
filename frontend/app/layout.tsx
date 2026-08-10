import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";
import AppShell from "./app-shell";
import WalletProviderLoader from "./wallet-provider-loader";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "Miden Drop — Private money you can send as a link",
  description: "Create a private Miden payment and share it through a link or QR code.",
};

const designContract = `THESIS: Private value becomes a calm, credible consumer action while the proof remains visible as structure, never complexity. OWN-WORLD: warm white, charcoal and Miden vermilion; editorial sans; clipped financial surfaces; stippled commitment geometry and precise node lines. STORY: understand the promise, compose a drop, share the private link, receive or claim. FIRST VIEWPORT: 48/52 promise and composer; proof field crosses behind the form; process and network visibility begin at the fold. FORM: Local Proof, Hero Composer, direction seed fd1eba74. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md.`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${manrope.variable} ${plexMono.variable}`}>
      <body>
        <span className="design-contract" aria-hidden="true" data-design-contract={designContract} dangerouslySetInnerHTML={{ __html: `<!-- ${designContract} -->` }} />
        <WalletProviderLoader><AppShell>{children}</AppShell></WalletProviderLoader>
      </body>
    </html>
  );
}
