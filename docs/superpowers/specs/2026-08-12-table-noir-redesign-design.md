# Hecliar — Table Noir redesign

> **Status:** Approved 12 August 2026
> **Scope:** Presentation layer of `frontend/` — landing page and game app.
> **Out of scope:** `contracts/**`, `packages/game-logic/**`, and the `GameGateway`
> interface. This redesign sits on top of a stable contract and changes nothing
> beneath it.

## 1. Objective

Turn Hecliar from a working prototype with placeholder presentation into a paced
product story and a game table that makes its own tension legible.

A visitor must understand, in order: what Hecliar is, that hidden information in
online dice games has never actually been hidden, that this is why nothing is at
stake, that Hecliar seals dice at the chain level, how a round actually plays,
why the confidentiality claim survives inspection, and what it costs to start.

Two audiences carry equal weight:

- **A judge** evaluating in three minutes needs the confidential-state mechanic
  to be undeniable and visible on screen.
- **A player** needs a tense, comprehensible bluffing game.

These are served by the same page. The proof layer is dense enough for the judge
and skippable enough for the player.

## 2. Audit of the existing build

### 2.1 What remains

| Asset | Disposition |
| --- | --- |
| `MatchScreen.tsx` refresh / retry / automatic-recovery state machine | Preserved without behavioural change. Extracted to a hook; its logic is not rewritten. |
| `DiceTray.tsx` `PIP_POSITIONS` grid-area geometry | Correct. Ported into the new `Die` primitive. |
| `legalRaises()` wiring in `BidControls.tsx` | Correct. The surrounding UI is rebuilt; the legality source stays. |
| `MatchSetup.tsx` / `WaitingRoom.tsx` form semantics | Labelled and grouped correctly. Restyled, not restructured. |
| Copy in `ui-redesign-2026-08-11/index.html` | Harvested as source material. The HTML, CSS and Python build script are discarded. |

### 2.2 What is rewritten

**`app/globals.css`.** Two token systems compete. A shadcn HSL set
(`--card`, `--popover`, `--ring`, and the rest) is declared and almost entirely
unused; a hardcoded hex set (`--ink`, `--cyan`, `--amber`, `--coral`) does the
actual work. Three specific defects follow:

1. `body` hardcodes `background: var(--ink)`, so `ThemeToggle` toggles nothing
   visible. Light mode has never rendered.
2. `.dark` sets `--radius: 0`, silently flattening every corner that consumes it.
3. `button, a { min-height: 44px }` applies a tap-target rule globally, inflating
   every inline link in prose.

Lines 72–80 are minified single-line walls that cannot be reviewed or diffed.

**`app/page.tsx`.** Seventeen lines: an eyebrow, a headline, a paragraph, two
links. There is no landing page to redesign, only a placeholder to replace.

**`components/game/GameTable.tsx`.** Twelve lines, one of which is a single JSX
statement containing the opponent zone, the bid zone, the hand zone, the gadget
target picker and the scanner result.

**`components/Header.tsx`.** The only file consuming the shadcn tokens, so it
shares a visual language with nothing else on screen.

### 2.3 What weakens the hierarchy

1. `.hecliar-panel` and `.table-surface` resolve to the same gradient card, applied
   identically to the opponent, the current bid and your hand. Nothing directs the
   eye.
2. The current bid — the single most important fact in a bluffing game — sits in a
   card visually indistinguishable from every other card.
3. **Challenge**, the only irreversible action in the game, is a coral button of
   the same width as Raise, immediately beside it. The interface assigns no weight
   to the decision the game is built around.
4. The bid picker renders `diceCount * 2` quantity buttons plus six face buttons
   as undifferentiated targets, with no indication of which are legal. At six dice
   that is eighteen identical controls.

### 2.4 Dead and dormant code

| File | Finding | Action |
| --- | --- | --- |
| `components/game/GadgetPanel.tsx` | Unreferenced. `GameTable` inlines a divergent gadget chip instead, so two implementations disagree. | Superseded by `GadgetCard`; delete. |
| `components/game/TurnTimer.tsx` | Unreferenced, **but not dead by design.** `PublicMatchView.deadlines.actionDeadline` is real state and `GameGateway.claimTurnTimeout()` / `claimAbandonment()` are real methods. The data and the actions exist; only the UI is missing. | Wire in, do not delete. |
| `framer-motion`, `canvas-confetti` | Installed, zero imports. | The bundle cost is already paid; spend it. |

### 2.5 Claims lacking visual proof

| Claim | Missing evidence |
| --- | --- |
| Dice are confidential at the chain level | The ciphertext is never shown. Needs the handle displayed beside the plaintext die. |
| The opponent is a rule-based robot, not AI | Its decision is never surfaced. |
| Challenges settle by attested reveal | Stated in prose; needs a settlement receipt. |

## 3. Narrative

| # | Section | Beat |
| --- | --- | --- |
| 1 | Navigation | Brand, four links, one CTA |
| 2 | Hero | *The bluff is real. The roll is secret.* Plus a scripted, replayable round |
| 3 | Move strip | Real bids and moves, marqueed — breadth in four seconds |
| 4 | Problem, three beats | The host can see → the chain can see → **so nothing is at stake** |
| 5 | Transition | *The contract holds the secret. It cannot read it either.* |
| 6 | Demonstrations, four | The sealed roll · The raise · The challenge · The gadget |
| 7 | Proof, four points | Four mechanisms, not four adjectives |
| 8 | Comparison | Hecliar vs. a web2 dice app vs. a naive onchain game |
| 9 | Cost | *What it actually costs you* — replaces a pricing section |
| 10 | Close | *Two 4s and a hunch.* |

### 3.1 Problem escalation

The three beats escalate to a consequence rather than repeating a complaint:

1. **The host can see your dice.** Every web2 dice game asks you to trust an
   operator you cannot audit.
2. **The chain can see them too.** Moving onchain makes it worse — public state is
   readable by anyone, so hiding in the interface hides nothing.
3. **So nobody plays for anything.** Hidden information that is not really hidden
   means there is nothing at stake, which means it is not a bluffing game.

Beat three is the tension the product releases. Section 5 releases it.

### 3.2 Hero demonstration

A deterministic scripted sequence — roll, open bid, raise, challenge, reveal,
verdict — approximately seven seconds, replayable via a visible control.

It is built from the same `Die` and `BidLine` primitives the game itself renders.
It is **not** a screenshot and **not** the live gateway. Determinism is
deliberate: a judge who watches it twice sees the same round both times. The real
game is one click away via the primary CTA.

### 3.3 Section 9 replaces pricing

Hecliar has no price. The conversion section answers what it costs to start:

- Playing the robot: free, no wallet, no transaction — the local in-memory
  gateway.
- Playing a friend: a wallet and Base Sepolia testnet gas.
- Privacy: not a tier. It is the mechanic.

## 4. Design tokens

### 4.1 Colour

```
felt-900   #0B0E13   page canvas
felt-800   #10151C   alternating band
felt-700   #161D26   raised surface
felt-600   #1E2833   inset / well
edge       #26313E   hairline border
edge-strong #35434F  emphasised border
bone       #F2EDE3   primary text, die face
bone-dim   #A9B4BF   secondary text
bone-mute  #6B7885   tertiary text, disabled
coral-500  #C4472F   CHALLENGE ONLY
coral-300  #E4735A   challenge hover
ember      #C99A3F   pending / awaiting machine state
verify     #4E9E7E   settled / attested
```

**Accent discipline.** Coral is never a link, never a border, never decoration,
never a generic hover state. It marks the irreversible action and nothing else.
At most one coral element is visible per viewport. The rule is load-bearing: when
coral appears, something is about to be settled.

`ember` and `verify` are status colours, not accents. They appear only on
`StatusPip` and inside `Receipt`.

**Light mode** inverts the felt/bone relationship to warm paper rather than being
disabled: canvas `#F4F1EA`, surface `#FFFFFF`, ink `#171512`, hairline `#CFC7B8`.
Coral, ember and verify hold their roles and darken one step for contrast.

### 4.2 Typography

Three roles, loaded through `next/font/google`, matching the existing
`IBM_Plex_Mono` pattern — self-hosted at build time, no external requests, no
layout shift.

| Role | Family | Applied to |
| --- | --- | --- |
| Display | Newsreader (variable optical size) | `h1`, `h2` only |
| Interface | Archivo (variable) | All body and control copy |
| Machine | IBM Plex Mono | State, counts, addresses, ciphertext handles |

Scale, `clamp()`-driven: 12 · 14 · 16 · 18 · 22 · 28 · 40 · 56 · 76.

The display/interface split is the editorial contrast. Mono is reserved for
things a machine produced, which makes ciphertext handles read as artefacts
rather than styling.

### 4.3 Space, dimension, motion

- **Space** — 4px base: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.
- **Widths** — prose `62ch`, content `1120px`, wide `1320px`.
- **Radius** — 4 chip, 8 control, 12 die, 16 surface, 999 pill.
- **Borders** — 1px `edge`; `edge-strong` for emphasis. No border is coral.
- **Elevation** — `lift-1` inset hairline, `lift-2` raised surface, `lift-3` die
  (physical, carries a bottom edge).
- **Duration** — fast 140ms, base 240ms, slow 420ms, reveal 700ms.
- **Easing** — `ease-out cubic-bezier(.2,.7,.3,1)`,
  `ease-snap cubic-bezier(.3,1.4,.5,1)`.

## 5. Component inventory

### 5.1 Shared primitives — `components/ui/`

These are consumed by both the landing page and the game. The landing page's
product demonstrations *are* the game's components, so there is nothing to keep
in sync and nothing invented.

| Component | Responsibility |
| --- | --- |
| `Die` | One die in state `face` \| `hidden` \| `sealed` \| `revealing` |
| `DiceRow` | A row of dice with staggered entrance |
| `BidLine` | Renders a `Bid` as "at least 3 dice show 5" |
| `StatusPip` | `idle` \| `pending` \| `verified` \| `failed` |
| `Surface` | Elevation levels 1–3 |
| `Button` | `primary` \| `secondary` \| `ghost` \| `challenge` |
| `SealChip` | A truncated ciphertext handle, e.g. `0x8f3a…c21` |
| `Receipt` | Settlement rows: base count, effects, effective count, verdict |
| `Reveal` | Scroll-triggered entrance via `IntersectionObserver` |

`Die`'s `sealed` state is the visual answer to §2.5. It renders the handle rather
than a question mark, which turns "your dice are encrypted" from a claim into
something on screen.

### 5.2 Game — `components/game/`

| Component | Responsibility |
| --- | --- |
| `TableStage` | Three zones: opponent, bid, hand |
| `BidPicker` | Quantity stepper, face row of six die glyphs, and quick chips for the next three legal raises |
| `ChallengeButton` | Full-width coral, deliberately asymmetric to Raise |
| `RevealPanel` | The challenge payoff sequence |
| `GadgetCard` | Consolidates `GadgetPanel` and the inline chip in `GameTable` |
| `RoundLedger` | Score, round number, bid history |
| `ConnectionBar` | Network, pending action, and the turn deadline |

**`BidPicker`** replaces eighteen undifferentiated buttons. The quick chips —
computed from `legalRaises(bid, diceCount)` and taking the first three — reduce
the common turn to a single tap. The stepper and face row remain for arbitrary
raises. Illegal combinations are not rendered as enabled controls.

**`ChallengeButton`** is not symmetric with Raise: full width, coral, below the
raise controls, separated by a rule. Different shape, different weight, different
position. The interface should make a challenge feel like a decision.

**`TurnTimer`** is wired into `ConnectionBar`, driven by
`publicMatch.deadlines.actionDeadline`. When the deadline passes, the timeout
claim becomes available through `gateway.claimTurnTimeout()`. This surfaces state
and actions that already exist.

### 5.3 Landing — `components/landing/`

`Nav`, `Hero`, `MoveStrip`, `ProblemBeat`, `DemoSection`, `ProofGrid`,
`CompareTable`, `CostPanel`, `CloseCTA`.

### 5.4 Refactor of `MatchScreen.tsx`

The file is 493 lines, roughly 290 of which are the recovery state machine —
`refresh`, `refreshAfterError`, `runAction`, `runAutomaticAction`, and the
scheduling effect. That logic is correct and is preserved verbatim in behaviour.

- `hooks/useMatchLifecycle.ts` — the state machine, returning snapshots, pending
  action, error, and the action callbacks.
- `components/game/MatchView.tsx` — presentation, selecting between loading,
  recovery, round result, match result and table states.
- `MatchScreen.tsx` — retains `parseMatchId`, the invalid-link and
  no-gateway guards, and composes the two.

The split is a precondition for restyling, not an independent refactor: the
current file cannot be restyled without editing the state machine's file.

## 6. Motion

| Moment | Treatment |
| --- | --- |
| Hero entrance | Three-stage stagger, 60ms apart, 420ms, 12px rise. Once per load. |
| Dice roll | Dice land staggered 50ms with a small rotation settle on `ease-snap`. The application's signature motion. |
| Bid raise | The previous bid slides up and dims as the new one enters from below — motion expressing causality. |
| Challenge reveal | Dim 200ms → opponent dice flip in sequence 90ms apart → count tallies → verdict. Approximately 1.6s. |
| Landing reveals | `IntersectionObserver`, 500ms, one-shot, 16px rise. |
| Hover | 140ms, colour and border only. No scale on cards. |

Prohibited: parallax, perpetual floating, per-line text animation, animation on
scroll position rather than scroll entry.

The challenge reveal is the payoff of the entire game and receives the whole
motion budget. Every other moment is restrained so that it lands.

**Reduced motion.** Under `prefers-reduced-motion: reduce`, transforms become
opacity-only and durations collapse to 1ms. The challenge reveal becomes an
instantaneous state change that still displays every number — the information is
never carried by motion alone.

**Library allocation.** `framer-motion` is imported by the game table only. The
landing route uses CSS transitions and `IntersectionObserver`, so no animation
library ships on the marketing page.

## 7. Responsive behaviour

### 7.1 Game table

Designed for mobile rather than stacked. Three zones under 768px:

- **Top** — sticky opponent strip, 56px: hidden dice and score.
- **Middle** — scrolls: current bid, then your dice.
- **Bottom** — fixed action dock with `env(safe-area-inset-bottom)`: Raise and
  Challenge.

Your dice and the action you take on them are always simultaneously visible. The
existing `@media (max-width: 520px)` block approaches this with a fixed
`.table-action-region`; this formalises it and raises the breakpoint.

### 7.2 Landing

- Demonstration windows scroll horizontally with scroll-snap rather than shrinking
  to illegibility.
- The comparison table becomes one card per criterion, each card naming the
  criterion and the three answers.
- The hero demonstration drops to four dice and a single bid line.
- Headline sizes reduce through `clamp()`, not through breakpoint overrides.

## 8. Accessibility and quality

- Semantic sectioning; one `h1` per route; heading order never skips a level.
- Every control reachable and operable by keyboard, including `BidPicker` chips
  and the gadget target picker.
- Focus is visible on every interactive element, using `edge-strong` on felt and
  never removed.
- Text contrast meets WCAG AA: `bone` on `felt-900` and `bone-dim` on `felt-700`
  both verified; `bone-mute` is restricted to non-essential metadata.
- Live regions retained on status, pending actions and results — `aria-live`
  usage in `ActionStatus`, `RoundResult` and `MatchResult` is preserved.
- Dice carry text alternatives; `sealed` dice announce that the value is hidden,
  not a handle string.
- Fonts self-hosted via `next/font`, `display: swap`, with size-adjusted
  fallbacks so no layout shift occurs.
- Colour never carries meaning alone: challenge is coral **and** full-width
  **and** labelled; verified status is `verify` **and** carries a pip **and** a
  word.

## 9. Delivery

Five increments. Each is independently reviewable and each leaves the application
working.

1. **Tokens and base.** `styles/tokens.css` and `styles/base.css` replace
   `globals.css`. Fonts wired. Light mode fixed. Global tap-target rule replaced
   with targeted rules. `GadgetPanel.tsx` deleted. `THIRD_PARTY_NOTICES.md` gains
   an OFL row for the three families.
2. **Primitives.** `components/ui/`, with unit tests for `Die` faces and
   `Reveal`'s reduced-motion behaviour.
3. **Game table.** `useMatchLifecycle` / `MatchView` split, `TableStage`,
   `BidPicker`, `ChallengeButton`, `RevealPanel`, `GadgetCard`, `RoundLedger`,
   `ConnectionBar`, `TurnTimer` wired. `MatchSetup` and `WaitingRoom` restyled.
4. **Landing.** All ten sections, new `Header`.
5. **Verification.** Screenshots at 375, 768, 1280 and 1920 for the landing page
   and every game state. Accessibility, reduced-motion, `vitest`, Playwright,
   lint and build.

Increment 3 precedes increment 4 because it is the demonstration path. If time is
exhausted, a redesigned working game exists without a landing page, which is the
correct thing to be left holding.

## 10. Non-goals

- No change to `contracts/**` or `packages/game-logic/**`.
- No change to the `GameGateway` interface or to any gateway implementation.
- No new game rules, gadgets, or match formats.
- No matchmaking, spectating, onboarding overlay, or share card.
- No component library adopted; `components/ui/` is local and specific.
