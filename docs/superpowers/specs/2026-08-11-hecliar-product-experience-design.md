# Hecliar Product Experience Redesign

**Date:** 2026-08-11  
**Status:** Approved visual direction, pending written-spec review  
**Scope:** Landing page, shared navigation/footer, and the existing local and chain-backed game interfaces

## Product thesis

Hecliar is confidential Liar's Dice: a tense bluffing game in which each player sees only their own dice, raises a shared public bid, and reveals the truth only after a challenge. The website's job is to make that loop understandable in under a minute and move a visitor into either a Robot match or a private room.

The experience should borrow the strategic qualities of modern financial/developer-infrastructure sites—clarity, confidence, technical precision, generous space, and product-led storytelling—without copying 0x branding, layouts, illustrations, or wording.

## Visual direction

### Palette

- **Canvas:** `#FAFAF7`, a warm off-white used for the main marketing surface.
- **Paper:** `#FFFFFF`, used for contained panels and game setup cards.
- **Ink:** `#101312`, used for headings and primary controls.
- **Muted:** `#626966`, used for supporting copy.
- **Line:** `#DDDCD5`, used for restrained borders and diagram connectors.
- **Signal:** `#16B8B1`, Hecliar cyan, used only for active state, routes, focus, and decisive calls to action.
- **Table:** `#0B1110`, the near-black game and developer surface.
- **Danger:** `#E45E50`, reserved for Challenge and destructive/action-warning states.

No heavy gradients, glassmorphism, stock photography, decorative blobs, or rainbow accents.

### Type

- A bold modern grotesk sans-serif carries headlines and interface actions.
- A neutral sans-serif carries body copy.
- IBM Plex Mono remains the utility face for bids, dice values, timers, contract language, and compact labels.
- Headlines use tight line-height and slightly negative tracking; supporting copy remains quiet and readable.

### Layout and rhythm

- Marketing content uses a maximum width around 1180px.
- Major sections receive generous vertical space, with mobile spacing reduced without collapsing hierarchy.
- Product visuals are rounded, thin-bordered panels with very restrained shadows.
- Alternating white and subtle gray section tints create rhythm.
- The game app uses the same system but flips to the near-black table surface inside a light application shell.

### Signature element

The memorable device is the **living bid line**: a thin cyan route that moves between two concealed dice hands through the sequence Roll → Raise → Challenge → Reveal. It teaches the turn loop and becomes the visual language for active turns inside the game.

Motion uses CSS transforms and opacity, pauses when appropriate, and becomes static when the user requests reduced motion.

## Responsive wireframe

### Desktop

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ HECLIAR               How it works   Privacy   Rules        Play Robot      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│               Every bluff has a private side.                               │
│       Read the table. Raise the bid. Call the lie.                           │
│                                                                              │
│       [ Play the Robot ]  [ Create a private room ]                          │
│                                                                              │
│          No account · 3–6 dice · Best of three · Inco Lightning              │
│                                                                              │
│  ┌────────────────────── LIVE ROUND PRODUCT DEMO ────────────────────────┐   │
│  │ Opponent: 4 concealed dice      Bid: five 3s       Score 1 — 0       │   │
│  │                cyan bid route / turn state                            │   │
│  │ Your hand: [2] [3] [3] [6]       Raise                 Challenge      │   │
│  └────────────────────────────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────────────────────────┤
│ CONFIDENTIAL BY DESIGN          metric / proof cards with real game states   │
├──────────────────────────────────────────────────────────────────────────────┤
│ HOW A ROUND MOVES                                                           │
│ [ROLL] ───────── [RAISE] ───────── [CHALLENGE] ───────── [REVEAL]            │
│ two concealed hands + animated bid line                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│ READ THE TABLE               │  private dice / public bid diagram            │
├──────────────────────────────────────────────────────────────────────────────┤
│ GADGETS CHANGE THE READ      │  exact one-per-side gadget demo               │
├──────────────────────────────────────────────────────────────────────────────┤
│ PRIVATE UNTIL IT MATTERS     connected-node privacy diagram                  │
├──────────────────────────────────────────────────────────────────────────────┤
│ DARK TECHNICAL SECTION: opaque handles → permitted player → public result    │
├──────────────────────────────────────────────────────────────────────────────┤
│ Best of three / timers / rematch / final CTA                                │
├──────────────────────────────────────────────────────────────────────────────┤
│ Footer: play, learn, technology, testnet status, attribution                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Mobile

```text
┌──────────────────────────┐
│ HECLIAR        Menu/Play │
├──────────────────────────┤
│ Every bluff has          │
│ a private side.          │
│ supporting copy          │
│ [ Play the Robot ]       │
│ [ Private room ]         │
│ proof strip wraps        │
│ ┌── live round demo ──┐  │
│ │ opponent / bid      │  │
│ │ your dice           │  │
│ │ actions stack       │  │
│ └─────────────────────┘  │
├──────────────────────────┤
│ Sections become single   │
│ column; diagrams remain  │
│ horizontally legible.    │
├──────────────────────────┤
│ Footer link groups stack │
└──────────────────────────┘
```

## Landing-page content architecture

### 1. Hero

- Eyebrow: “Confidential Liar's Dice”
- Headline: “Every bluff has a private side.”
- Supporting copy explains the control loop in plain language.
- Primary path: “Play the Robot”
- Secondary path: “Create a private room”
- Proof strip uses factual product signals rather than invented client logos: “No account required,” “3–6 dice,” “Best of three,” and “Powered by Inco Lightning.”
- A realistic game-table preview shows own dice, concealed opponent dice, the current bid, score, turn status, and Raise/Challenge controls.

### 2. Proof and capability

Four compact cards:

1. **Only your dice are yours to see** — concealed-hand visualization.
2. **One public bid** — animated bid ladder/status line.
3. **Exactly one secret gadget each** — gadget assignment when enabled.
4. **First to two rounds** — best-of-three score gauge.

No fabricated volume, customer, or security metrics.

### 3. Feature modules

Full-width alternating sections cover:

- **Read the table:** quantity-first bid ordering and legal raises.
- **Change the read:** Scanner, Reroll, and Wildcard-style gadget effects using the PRD's exact behavior and naming.
- **Play your way:** Robot match versus private-room flow, 3–6 dice selection, default four.

Each section combines a label, a decisive headline, concise explanation, and a realistic visual demo.

### 4. How a round works

A four-stage diagram:

1. **Roll privately** — each side receives a confidential hand.
2. **Raise publicly** — bid a quantity and face; every bid must be higher.
3. **Challenge the claim** — stop raising when the table no longer adds up.
4. **Reveal only the result** — settlement counts the relevant dice and awards one round.

The living bid line indicates sequence; the design remains meaningful without animation.

### 5. Confidentiality ecosystem

A connected-node diagram shows:

```text
Your encrypted dice ── permission ──> You
Opponent encrypted dice ─ permission ─> Opponent
Both hidden hands ─ challenge/settlement ─> Public round result
```

Copy must say what the current implementation guarantees. It must not claim formal audits, perfect security, or capabilities beyond Inco Lightning and the contract's authorization boundaries.

### 6. Operational/game value

Realistic UI fragments demonstrate:

- current round and best-of-three score;
- whose turn it is and the turn deadline;
- raise/challenge controls;
- resolution and next-round state;
- private room creation, join, completion, and rematch.

### 7. Dark technical section

Use a near-black section for the confidentiality model. Simple tabs switch between conceptual views such as “Private roll,” “Public bid,” and “Challenge.” The code-style display uses concise pseudocode or actual safe public interfaces; it must never expose secret handles as plaintext dice or imply browser storage contains secrets.

Resource cards link only to available internal sections or known project documentation. No dead links.

### 8. Social proof replacement

The MVP has no approved customer names, quotations, production usage, or quantified case studies. To avoid fabricated proof, this section becomes **“Built for an honest reveal”**:

- product-level trust statements;
- rule and privacy guarantees that are testable;
- a horizontally moving gallery of real use cases: quick Robot match, private two-player room, rematch, variable dice, and gadgets.

Future customer proof can replace this module when genuine evidence exists.

### 9. Footer

The footer includes:

- Hecliar name and one-line description;
- Play: Robot, Private room;
- Learn: How it works, Rules, Confidentiality;
- Technology: Inco Lightning and Base Sepolia labels without implying current mainnet deployment;
- current testnet/local status;
- copyright/project attribution.

## Game application redesign

The redesign must preserve all existing game behavior and privacy boundaries.

- Shared header becomes light, compact, and product-oriented.
- Setup screens use white panels with clear mode, dice, difficulty, and gadget configuration.
- The active table uses the near-black surface with the cyan bid route and a restrained red Challenge action.
- Own dice remain high-contrast and tactile; opponent dice remain clearly concealed.
- Score, turn, deadline, and current bid form a stable information rail.
- Action controls retain at least 44px targets and strong keyboard focus.
- Mobile keeps the action region reachable without covering dice or results.
- Resolution screens make truth/lie, counted dice, round winner, match score, next round, and rematch unmistakable.

No marketing animation runs inside an active match. Only state transitions and the turn/bid indicator move.

## Component system

Reusable components:

- `SectionHeader`
- `MetricCard`
- `FeatureShowcase`
- `ProductDemoCard`
- `HowItWorksDiagram`
- `PrivacyDiagram`
- `LogoMarquee` (used as a truthful use-case marquee, not fake logos)
- `Testimonial` (not rendered until genuine approved content exists)
- `CaseStudyCard` (used for factual gameplay cases)
- `CodeDemo`
- `SiteFooter`

Components should accept content/data props where reuse is real. Do not introduce an abstract design-system framework for one page.

## Interaction and accessibility

- Scroll reveal: opacity plus 12–20px vertical movement using Intersection Observer or progressive CSS; content is visible if JavaScript fails.
- Diagram routes and gauges animate gently and only when visible.
- Card hover elevation is subtle and does not hide information from touch users.
- `prefers-reduced-motion: reduce` removes travel, looping, and smooth scrolling.
- Semantic heading order, landmark elements, descriptive links, visible focus, sufficient contrast, and keyboard-operable tabs are required.
- Diagrams include adjacent text explanations so meaning is not color- or motion-only.

## Testing and acceptance

Write tests before production changes. Acceptance requires:

- Hero headline, explanatory copy, both primary paths, and proof strip render.
- How-it-works content includes Roll, Raise, Challenge, and Reveal.
- Confidentiality explanation distinguishes own, opponent, and public result information.
- Gadget copy states exactly one gadget per side whenever gadgets are enabled.
- Footer and all internal anchor targets render.
- No fabricated customer logos, metrics, quotations, or audit claims.
- Existing Robot and friend entry links remain correct.
- Existing game tests continue to pass.
- Frontend lint, typecheck, unit tests, and production build pass.
- Desktop and narrow viewport inspection show no horizontal overflow, clipped controls, or unreadable diagrams.
- Reduced-motion styles are present and effective.

## Out of scope

- New game rules or contract behavior.
- New external analytics, testimonials, customer logos, or live volume statistics.
- Mainnet claims.
- A documentation portal.
- Stock or generated illustration assets.
