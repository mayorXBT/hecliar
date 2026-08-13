import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, Newsreader } from "next/font/google";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/Header";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";

/* Three roles: display carries the voice, interface carries the copy, and
   mono carries anything a machine produced — counts, addresses, ciphertext
   handles. See styles/tokens.css. */

// Both are variable fonts, so weight is left unset: one file covers the whole
// range, and Newsreader's optical-size axis tracks the display scale.
const display = Newsreader({
  axes: ["opsz"],
  display: "swap",
  subsets: ["latin"],
  variable: "--font-newsreader",
});

const ui = Archivo({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-archivo",
});

const mono = IBM_Plex_Mono({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Hecliar — the bluff is real, the roll is secret",
  description:
    "Confidential liar's dice. Your dice are sealed on-chain, not hidden by the interface, so a challenge settles on state neither player could read.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // The font variables must land on <html>, not <body>: styles/tokens.css
    // declares --type-* on :root, and a custom property is substituted where it
    // is declared. On <body> they would be undefined at :root and the whole
    // declaration would compute to invalid.
    <html
      suppressHydrationWarning
      lang="en"
      className={`${display.variable} ${ui.variable} ${mono.variable}`}
    >
      <body suppressHydrationWarning className="min-h-screen">
        <a className="skip-link" href="#main">Skip to content</a>
        <Providers>
          <Header />
          {children}
        </Providers>
        {/* Page views only. No identifiers, no cookies, and nothing from a
            match: dice never leave the client to begin with. */}
        <Analytics />
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: "hsl(var(--card))",
              color: "hsl(var(--foreground))",
              border: "1px solid hsl(var(--border))",
              fontFamily: "var(--type-mono), ui-monospace, monospace",
              fontSize: "14px",
            },
          }}
        />
      </body>
    </html>
  );
}
