import Link from "next/link";
import { HeroDemo } from "@/components/landing/HeroDemo";
import { BidLine } from "@/components/ui/BidLine";
import { ButtonLink } from "@/components/ui/Button";
import { DiceRow } from "@/components/ui/Die";
import { Receipt } from "@/components/ui/Receipt";
import { Reveal } from "@/components/ui/Reveal";
import { SealChip } from "@/components/ui/SealChip";
import { StatusPip } from "@/components/ui/StatusPip";
import { Surface } from "@/components/ui/Surface";

const MOVES = [
  "At least three dice show 5",
  "Challenge",
  "Echo — one of your dice counts twice",
  "At least four dice show 2",
  "Jammer — ignore one opponent die",
  "At least two dice show 6",
  "Scanner — is the current bid true?",
  "Challenge",
];

const PROBLEM = [
  {
    n: "The host can see",
    body: "Every browser dice game asks you to believe an operator you cannot audit. The dice are a number on their server. Nothing stops them being read, and nothing proves they were not.",
    demo: (
      <div className="frag frag--log">
        <p className="frag-label">Server, in the clear</p>
        <code>
          room_41 · seat_0 · dice=[5,2,5,1]
          <br />
          room_41 · seat_1 · dice=[5,6,3,5]
        </code>
      </div>
    ),
  },
  {
    n: "On chain, everyone can see",
    body: "Moving the game on chain makes it worse before it makes it better. Public state is readable by anyone with an RPC endpoint, so hiding a die in the interface hides it from precisely nobody.",
    demo: (
      <div className="frag frag--log">
        <p className="frag-label">eth_getStorageAt · anyone</p>
        <code>
          slot 0x03 → 0x0502050100000000
          <br />
          slot 0x04 → 0x0506030500000000
        </code>
      </div>
    ),
  },
  {
    n: "So nothing is at stake",
    body: "A bluff only means something if the other side genuinely cannot know. Once hidden information is not really hidden, the raise is theatre and the challenge is a formality. That is not a hard game. It is not a game.",
    demo: (
      <div className="frag frag--quiet">
        <p className="frag-label">What is left</p>
        <p className="frag-line">A dice game where nobody is bluffing.</p>
      </div>
    ),
  },
];

const PROOF = [
  {
    title: "Dice are sealed before they exist to anyone",
    body: "Each roll is written as an Inco Lightning ciphertext handle. The contract holds the handle and can compute on it. It cannot read the value, and neither can the opponent, the operator, or an indexer.",
  },
  {
    title: "Only the owner is granted the plaintext",
    body: "Access is granted per address at the moment of the roll. Your client decrypts your own dice. There is no branch of the code where the other seat is given the same grant.",
  },
  {
    title: "A challenge is counted, not trusted",
    body: "Settlement counts matching faces across both sealed hands and compares the total to the claimed quantity. The count runs over the ciphertext; the result is what gets revealed.",
  },
  {
    title: "The gadget stays secret even after it fires",
    body: "Each side draws one gadget per round. Its effect lands in the settlement arithmetic without the kind being published, so a used Jammer looks the same on chain as a used Echo.",
  },
];

const COMPARE = [
  {
    criterion: "Who can read your dice",
    web2: "The operator, always",
    naive: "Anyone with an RPC endpoint",
    hecliar: "Only you",
  },
  {
    criterion: "What settles a challenge",
    web2: "The operator's word",
    naive: "Public state anyone already read",
    hecliar: "A count over sealed dice",
  },
  {
    criterion: "What a bluff is worth",
    web2: "Whatever you trust it to be",
    naive: "Nothing — the hand is visible",
    hecliar: "The thing the game is made of",
  },
  {
    criterion: "To start playing",
    web2: "An account",
    naive: "A wallet and gas",
    hecliar: "Nothing, against the robot",
  },
];

export default function Home() {
  return (
    <main id="main">
      {/* 2 — hero */}
      <section className="hero">
        <div className="shell hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Confidential liar&rsquo;s dice · Inco Lightning</p>
            <h1>
              The bluff is real.
              <br />
              The roll is <em>secret</em>.
            </h1>
            <p className="lead">
              Your dice are sealed on chain, not hidden by the interface. The contract can
              count them without reading them, so a challenge settles on state neither
              player could have looked up.
            </p>
            <div className="hero-actions">
              <ButtonLink href="/play/robot" variant="primary">
                Play the robot
              </ButtonLink>
              <ButtonLink href="/play/friend" variant="secondary">
                Play a friend
              </ButtonLink>
            </div>
            <p className="hero-trust">
              No wallet, no transaction, no signup to play the robot. A match takes about
              two minutes.
            </p>
          </div>

          <div className="hero-demo">
            <HeroDemo />
          </div>
        </div>
      </section>

      {/* 3 — move strip */}
      <section aria-label="Moves you can make" className="strip">
        <div className="strip-track">
          {[...MOVES, ...MOVES].map((move, index) => (
            <span className="strip-item" key={index}>
              {move}
            </span>
          ))}
        </div>
      </section>

      {/* 4 — problem */}
      <section aria-labelledby="problem-title" className="band band--tight" id="problem">
        <div className="shell">
          <Reveal>
            <p className="eyebrow">The problem</p>
            <h2 className="section-title" id="problem-title">
              Online liar&rsquo;s dice has always been a trust exercise pretending to be a
              game.
            </h2>
          </Reveal>

          <ol className="beats">
            {PROBLEM.map((beat, index) => (
              <Reveal as="li" className="beat" key={beat.n} order={index}>
                <div className="beat-copy">
                  <h3>{beat.n}</h3>
                  <p>{beat.body}</p>
                </div>
                <div className="beat-demo">{beat.demo}</div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* 5 — transition */}
      <section aria-labelledby="turn-title" className="turn">
        <div className="shell">
          <Reveal>
            <h2 className="turn-title" id="turn-title">
              The contract holds the secret.
              <br />
              It cannot read it either.
            </h2>
          </Reveal>
        </div>
      </section>

      {/* 6 — demonstrations */}
      <section aria-labelledby="round-title" className="band" id="round">
        <div className="shell">
          <Reveal>
            <p className="eyebrow">A round, end to end</p>
            <h2 className="section-title" id="round-title">
              Four moves, and one of them ends it.
            </h2>
          </Reveal>

          <Reveal className="demo-row">
            <div className="demo-copy">
              <h3>The roll nobody can read</h3>
              <p>
                Four dice per side, sealed at the moment they are rolled. You see your own
                as values. Everything the chain holds about them is a handle.
              </p>
              <SealChip handle="0x8f3ad4c07be95521c21" />
            </div>
            <Surface className="demo-card" level={2}>
              <p className="card-label">Your hand</p>
              <DiceRow dice={[5, 2, 5, 1]} label="Your dice" state="face" />
              <p className="card-label card-label--spaced">The same hand, on chain</p>
              <DiceRow count={4} label="Your dice as stored" seedPrefix="proof" state="sealed" />
            </Surface>
          </Reveal>

          <Reveal className="demo-row demo-row--flip">
            <div className="demo-copy">
              <h3>The raise that has to mean something</h3>
              <p>
                A raise goes up on quantity, or holds quantity and goes up on face. The
                table offers the next legal raises so the arithmetic never gets in the way
                of the decision.
              </p>
            </div>
            <Surface className="demo-card" level={2}>
              <p className="card-label">Standing bid</p>
              <BidLine bid={{ quantity: 2, face: 5 }} size="lead" />
              <p className="card-label card-label--spaced">Next legal raise</p>
              <div className="chip-row">
                <span className="chip">3 × 5</span>
                <span className="chip">3 × 6</span>
                <span className="chip">4 × 1</span>
              </div>
            </Surface>
          </Reveal>

          <Reveal className="demo-row">
            <div className="demo-copy">
              <h3>The challenge, counted over sealed dice</h3>
              <p>
                Settlement counts matching faces across both hands without either hand
                being read, then reveals the result. The arithmetic is itemised because
                the point is that you can check it.
              </p>
              <StatusPip tone="verified">Settled on chain</StatusPip>
            </div>
            <Surface className="demo-card" level={2}>
              <Receipt
                caption="Challenge settlement"
                outcome="held"
                rows={[
                  { label: "Dice showing 5", value: "4", kind: "base" },
                  { label: "echo (yours)", value: "+1", kind: "adjust" },
                  { label: "Counted against a bid of 3", value: "5", kind: "total" },
                ]}
                verdict="5 is enough. The bidder takes the round."
              />
            </Surface>
          </Reveal>

          <Reveal className="demo-row demo-row--flip">
            <div className="demo-copy">
              <h3>One gadget, and they never learn which</h3>
              <p>
                Each side draws one per round. Echo counts a die twice, Jammer ignores one
                of theirs, Scanner tells you whether the standing bid is true. The kind
                stays sealed even after it has changed the count.
              </p>
            </div>
            <Surface className="demo-card" level={2}>
              <p className="card-label">Their gadget this round</p>
              <div className="gadget-grid">
                <span className="gadget-face">Echo</span>
                <span className="gadget-face">Jammer</span>
                <span className="gadget-face">Scanner</span>
              </div>
              <p className="card-note">
                One of these is in play. Nothing on chain says which.
              </p>
            </Surface>
          </Reveal>
        </div>
      </section>

      {/* 7 — proof */}
      <section aria-labelledby="proof-title" className="band band--alt" id="proof">
        <div className="shell">
          <Reveal>
            <p className="eyebrow">Why the claim survives inspection</p>
            <h2 className="section-title" id="proof-title">
              Four mechanisms, not four adjectives.
            </h2>
          </Reveal>
          <div className="proof-grid">
            {PROOF.map((item, index) => (
              <Reveal className="proof-item" key={item.title} order={index}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 8 — comparison */}
      <section aria-labelledby="compare-title" className="band band--tight">
        <div className="shell">
          <Reveal>
            <p className="eyebrow">The alternatives</p>
            <h2 className="section-title" id="compare-title">
              What you are actually choosing between.
            </h2>
          </Reveal>

          <Reveal>
            <div className="compare-scroll">
              <table className="compare">
                <caption className="sr-only">
                  Hecliar compared with a browser dice game and a naive on-chain game
                </caption>
                <thead>
                  <tr>
                    <th scope="col">&nbsp;</th>
                    <th scope="col">Browser dice game</th>
                    <th scope="col">Naive on-chain game</th>
                    <th className="is-ours" scope="col">
                      Hecliar
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE.map((row) => (
                    <tr key={row.criterion}>
                      <th scope="row">{row.criterion}</th>
                      <td>{row.web2}</td>
                      <td>{row.naive}</td>
                      <td className="is-ours">{row.hecliar}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 9 — cost */}
      <section aria-labelledby="start-title" className="band band--alt" id="start">
        <div className="shell">
          <Reveal>
            <p className="eyebrow">Before you start</p>
            <h2 className="section-title" id="start-title">
              What it actually costs you.
            </h2>
          </Reveal>

          <div className="cost-grid">
            <Reveal className="cost-item" order={0}>
              <h3>Against the robot</h3>
              <p className="cost-price">Free</p>
              <p>
                No wallet, no transaction, no account. The match runs locally against a
                rule-based opponent — fixed rules and probability, no model and no API.
              </p>
              <ButtonLink href="/play/robot" variant="primary">
                Play the robot
              </ButtonLink>
            </Reveal>

            <Reveal className="cost-item" order={1}>
              <h3>Against a friend</h3>
              <p className="cost-price">Testnet gas</p>
              <p>
                A wallet and Base Sepolia. One player creates a private room and shares
                the code; there is no lobby and no matchmaking.
              </p>
              <ButtonLink href="/play/friend" variant="secondary">
                Create a room
              </ButtonLink>
            </Reveal>

            <Reveal className="cost-item" order={2}>
              <h3>Privacy</h3>
              <p className="cost-price">Not a tier</p>
              <p>
                Confidential dice are not a setting you enable or a plan you upgrade to.
                They are the rule the game is built on. There is no mode that turns them
                off.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 10 — close */}
      <section aria-labelledby="close-title" className="close">
        <div className="shell">
          <Reveal>
            <h2 className="close-title" id="close-title">
              Two 4s and a hunch.
            </h2>
            <p className="close-lead">
              That is the whole game, and it only works if the other side truly cannot
              know. Now they cannot.
            </p>
            <ButtonLink href="/play/robot" variant="primary">
              Play the robot
            </ButtonLink>
            <p className="hero-trust">
              Nothing to install. Nothing to sign. About two minutes.
            </p>
          </Reveal>
        </div>
      </section>

      <footer className="site-foot">
        <div className="shell site-foot-bar">
          <span>Hecliar · confidential liar&rsquo;s dice on Inco Lightning</span>
          <Link href="/play/robot">Play the robot</Link>
        </div>
      </footer>
    </main>
  );
}
