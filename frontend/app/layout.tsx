import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";
import AppShell from "./app-shell";
import WalletProviderLoader from "./wallet-provider-loader";
import { MotionProvider } from "./motion";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "Miden Drop — Private money you can send as a link",
  description: "Create a private Miden payment and share it through a link or QR code.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fcfbf8",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${manrope.variable} ${plexMono.variable}`}>
      <body>
        <MotionProvider><WalletProviderLoader><AppShell>{children}</AppShell></WalletProviderLoader></MotionProvider>
      </body>
    </html>
  );
}
