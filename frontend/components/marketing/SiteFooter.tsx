import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="marketing-footer">
      <div className="marketing-footer__brand"><strong>HECLIAR</strong><p>Confidential Liar&apos;s Dice. Read the table, not the other hand.</p></div>
      <nav aria-label="Play"><h2>Play</h2><Link href="/play/robot">Robot</Link><Link href="/play/friend">Private room</Link></nav>
      <nav aria-label="Learn"><h2>Learn</h2><a href="#how-it-works">How it works</a><a href="#rules">Rules</a><a href="#privacy">Confidentiality</a></nav>
      <div><h2>Technology</h2><p>Powered by Inco Lightning</p><p>Base Sepolia · local and testnet play</p></div>
      <div className="marketing-footer__bottom"><span>© {new Date().getFullYear()} Hecliar</span><span>Local preview available · testnet status depends on your connected network</span></div>
    </footer>
  );
}
