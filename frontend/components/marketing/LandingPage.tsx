import Link from "next/link";
import { CaseStudyCard } from "./CaseStudyCard";
import { CodeDemo } from "./CodeDemo";
import { FeatureShowcase } from "./FeatureShowcase";
import { HowItWorksDiagram } from "./HowItWorksDiagram";
import { LogoMarquee } from "./LogoMarquee";
import { MetricCard } from "./MetricCard";
import { MarketingMotion } from "./MarketingMotion";
import { PrivacyDiagram } from "./PrivacyDiagram";
import { ProductDemoCard } from "./ProductDemoCard";
import { SectionHeader } from "./SectionHeader";
import { SiteFooter } from "./SiteFooter";

function ReadTableVisual() {
  return <div className="marketing-rule-demo"><span>Current bid</span><strong>five 3s</strong><div><b>five 4s</b><b>six 2s</b><b>Challenge</b></div><p>Raise the quantity, raise the face, or call it.</p></div>;
}

function GadgetVisual() {
  return <div className="marketing-gadget-demo"><div><span>Echo</span><b>One own match counts twice</b></div><div><span>Jammer</span><b>Ignore one opponent match</b></div><div><span>Scanner</span><b>Check the current bid</b></div><p>Echo and Jammer apply only when their selected die matches the challenged face. Scanner needs an opening bid.</p></div>;
}

function PathsVisual() {
  return <div className="marketing-path-demo"><div><span>01</span><strong>Robot</strong><p>Choose dice and difficulty. Start immediately.</p></div><div><span>02</span><strong>Private room</strong><p>Create a code, invite one opponent, then rematch.</p></div><small>Default table: four dice per side</small></div>;
}

export function LandingPage() {
  return (
    <main className="marketing-page">
      <MarketingMotion />
      <section className="marketing-hero" aria-labelledby="landing-title">
        <div className="marketing-hero__intro">
          <p className="marketing-kicker">Confidential Liar&apos;s Dice</p>
          <h1 id="landing-title">Every bluff has a private side.</h1>
          <p>Read the public bid. Protect what only you can see. Raise the claim or challenge it when the table stops making sense.</p>
          <div className="marketing-hero__actions">
            <Link className="marketing-button marketing-button--signal" href="/play/robot">Play the Robot</Link>
            <Link className="marketing-button marketing-button--quiet" href="/play/friend">Create a private room</Link>
          </div>
        </div>
        <ul className="marketing-proof-strip" aria-label="Hecliar game facts">
          <li>No account required</li><li>3–6 dice</li><li>Best of three</li><li>Powered by Inco Lightning</li>
        </ul>
        <div data-marketing-motion data-marketing-reveal><ProductDemoCard /></div>
      </section>

      <section className="marketing-section marketing-section--proof" aria-labelledby="proof-title">
        <SectionHeader eyebrow="Confidential by design" title="A social game where the uncertainty is real." copy="The table carries only what everyone needs to reason about the next move. Your hand stays yours until the round resolves." />
        <div className="marketing-metric-grid" data-marketing-reveal>
          <MetricCard label="Private hand" value="Yours only" copy="Only your dice are yours to see." visual={<div className="marketing-mini-dice"><b>2</b><b>3</b><b>?</b><b>?</b></div>} />
          <MetricCard label="Shared table" value="One bid" copy="A public claim gives both players something to test." visual={<div className="marketing-mini-line"><i /><i /><i /></div>} tone="signal" />
          <MetricCard label="Optional gadgets" value="1 per side" copy="Exactly one secret gadget each whenever gadgets are enabled." visual={<div className="marketing-mini-gadget">assigned</div>} />
          <MetricCard label="Match score" value="First to 2" copy="Best-of-three keeps the stakes clear and the rematch close." visual={<div className="marketing-mini-score"><b>1</b><i /><b>0</b></div>} />
        </div>
      </section>

      <section id="how-it-works" className="marketing-section marketing-section--round" aria-labelledby="round-title">
        <SectionHeader eyebrow="How a round moves" title="The bid is public. The evidence is not." copy="A round travels through four states. The route makes the sequence visible without making either player&apos;s dice visible." />
        <div data-marketing-reveal><HowItWorksDiagram /></div>
      </section>

      <FeatureShowcase id="rules" eyebrow="Read the table" title="A legal raise must change the story." copy="Bids move quantity first, then face. You can push the count, push the value, or decide the claim has gone far enough." visual={<ReadTableVisual />} />
      <FeatureShowcase id="gadgets" eyebrow="Change the read" title="One secret tool creates a new angle." copy="When the table enables gadgets, each player receives exactly one. Echo and Jammer change the challenge count only when their selected die matches; Scanner checks whether the current bid is supported." visual={<GadgetVisual />} reverse tone="tint" />
      <FeatureShowcase id="play" eyebrow="Play your way" title="Start a quick match or set a private table." copy="Play the Robot for a fast local game, or create a room code for a two-player table. Choose three to six dice; four is the default." visual={<PathsVisual />} />

      <section id="privacy" className="marketing-section marketing-section--privacy" aria-labelledby="privacy-title">
        <SectionHeader eyebrow="Private until it matters" title="The round can settle without turning your hand into a broadcast." copy="Hecliar uses Inco Lightning authorization boundaries to keep a hand available to its permitted player while a challenge resolves a public outcome." />
        <div data-marketing-reveal><PrivacyDiagram /></div>
      </section>

      <section className="marketing-technical" aria-labelledby="technical-title">
        <div><p className="marketing-kicker">A smaller public surface</p><h2 id="technical-title">Keep the game legible. Keep the hand constrained.</h2><p>Private rolls, public bids, and challenge settlement have different jobs. The interface makes that boundary easy to inspect without pretending secrets live in the browser.</p></div>
        <div data-marketing-reveal><CodeDemo /></div>
        <div className="marketing-resource-links"><a href="#privacy">Confidentiality model</a><a href="#how-it-works">Round states</a><a href="#rules">Bid rules</a></div>
      </section>

      <section className="marketing-section marketing-section--honest" aria-labelledby="honest-title">
        <SectionHeader eyebrow="Built for an honest reveal" title="The tension comes from the right information staying hidden." copy="No customer logos, volume claims, or invented proof. Just the real ways to use the current game." />
        <div className="marketing-case-grid">
          <CaseStudyCard detail="Quick start" title="Robot match" copy="Set the table, make the first read, and play immediately." />
          <CaseStudyCard detail="Two players" title="Private room" copy="Share one code to start a confined, rematch-ready table." />
          <CaseStudyCard detail="Adaptable table" title="Variable dice and gadgets" copy="Tune the table from three to six dice with optional one-per-side tools." />
        </div>
        <div data-marketing-motion><LogoMarquee /></div>
      </section>

      <section className="marketing-final-cta" aria-labelledby="final-cta-title"><p className="marketing-kicker">Your next move</p><h2 id="final-cta-title">Make a claim you can defend.</h2><p>Start with the Robot or bring one opponent to a private table.</p><div><Link className="marketing-button marketing-button--signal" href="/play/robot">Start a Robot match</Link><Link className="marketing-button marketing-button--quiet" href="/play/friend">Open a private table</Link></div></section>
      <SiteFooter />
    </main>
  );
}
