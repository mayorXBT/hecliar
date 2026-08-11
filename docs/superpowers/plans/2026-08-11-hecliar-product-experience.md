# Hecliar Product Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Hecliar’s landing page and game application as a clear, premium, product-led confidential dice experience with real gameplay explanations, diagrams, motion, and a complete footer.

**Architecture:** Keep game logic and transport untouched. Build the marketing experience from focused presentational React components and data-driven content, then apply a shared light-shell/dark-table token system to existing setup and match components. CSS owns progressive motion and reduced-motion behavior; React state is used only where interaction is meaningful, such as accessible technical-demo tabs.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4 plus project CSS, Vitest, Testing Library.

## Global Constraints

- Main canvas is `#FAFAF7`; primary ink is `#101312`; signal accent is `#16B8B1`; table surface is `#0B1110`; Challenge uses `#E45E50`.
- Do not copy 0x branding, layouts, illustrations, or wording.
- Do not use stock photography, heavy gradients, glassmorphism, decorative blobs, fabricated logos, fabricated metrics, fabricated quotations, or audit claims.
- Explain the exact sequence Roll → Raise → Challenge → Reveal.
- State exactly one gadget per side whenever gadgets are enabled.
- Preserve Robot and private-room URLs and all existing game behavior.
- Opponent dice and gadget information must never be added to DOM, APIs, logs, or browser storage before authorized reveal.
- All controls remain keyboard accessible with visible focus and at least 44px targets.
- Motion must explain state and be disabled by `prefers-reduced-motion: reduce`.
- Desktop and 375px layouts must not overflow horizontally.

---

### Task 1: Product-led landing page and explainer system

**Files:**
- Create: `frontend/components/marketing/SectionHeader.tsx`
- Create: `frontend/components/marketing/MetricCard.tsx`
- Create: `frontend/components/marketing/ProductDemoCard.tsx`
- Create: `frontend/components/marketing/FeatureShowcase.tsx`
- Create: `frontend/components/marketing/HowItWorksDiagram.tsx`
- Create: `frontend/components/marketing/PrivacyDiagram.tsx`
- Create: `frontend/components/marketing/CodeDemo.tsx`
- Create: `frontend/components/marketing/CaseStudyCard.tsx`
- Create: `frontend/components/marketing/LogoMarquee.tsx`
- Create: `frontend/components/marketing/SiteFooter.tsx`
- Create: `frontend/components/marketing/LandingPage.tsx`
- Modify: `frontend/app/page.tsx`
- Modify: `frontend/app/globals.css`
- Test: `frontend/test/home.test.tsx`

**Interfaces:**
- `SectionHeader({ eyebrow, title, copy, tone? })`
- `MetricCard({ label, value, copy, visual, tone? })`
- `FeatureShowcase({ id, eyebrow, title, copy, visual, reverse?, tone? })`
- `ProductDemoCard()` renders only a hard-coded illustrative own hand and the label “4 concealed dice”; it receives no live private state.
- `HowItWorksDiagram()` renders four ordered semantic stages.
- `PrivacyDiagram()` renders textual privacy boundaries adjacent to the visual.
- `CodeDemo()` provides keyboard-operable tabs for Private roll, Public bid, and Challenge.
- `SiteFooter()` owns all footer navigation and local/testnet status copy.

- [ ] **Step 1: Strengthen the homepage RED test**

Add assertions to `frontend/test/home.test.tsx` for:

```tsx
expect(screen.getByRole("heading", { name: /every bluff has a private side/i })).toBeInTheDocument();
expect(screen.getByRole("link", { name: /play the robot/i })).toHaveAttribute("href", "/play/robot");
expect(screen.getByRole("link", { name: /create a private room/i })).toHaveAttribute("href", "/play/friend");
for (const stage of ["Roll privately", "Raise publicly", "Challenge the claim", "Reveal only the result"]) {
  expect(screen.getByText(stage)).toBeInTheDocument();
}
expect(screen.getByText(/exactly one secret gadget each/i)).toBeInTheDocument();
expect(screen.getByText(/your encrypted dice/i)).toBeInTheDocument();
expect(screen.getByRole("contentinfo")).toBeInTheDocument();
```

- [ ] **Step 2: Run RED**

Run: `npm --workspace frontend test -- home.test.tsx`

Expected: FAIL because the expanded content and footer do not exist.

- [ ] **Step 3: Build the component system and page**

Implement the interfaces above. Use factual proof labels: “No account required,” “3–6 dice,” “Best of three,” and “Powered by Inco Lightning.” Build page sections in this order: hero/demo, proof cards, how a round works, read the table, gadgets, private-room/Robot paths, confidentiality diagram, dark technical demo, factual use-case marquee, final CTA, footer.

The product demo must show:

```text
Opponent · 4 concealed dice
Bid · five 3s
Score · 1—0
Your illustrative hand · 2, 3, 3, 6
Raise / Challenge
```

The demo is explanatory and must be labeled as a preview rather than connected to a match.

- [ ] **Step 4: Add restrained responsive motion and styling**

Add marketing styles under a `.marketing-page` namespace. Implement the living bid line with CSS pseudo-elements and transforms. Add `@media (prefers-reduced-motion: reduce)` rules that remove animation and transforms. Use `overflow: clip` only on decorative/diagram wrappers, never to hide content overflow.

- [ ] **Step 5: Run GREEN and quality checks**

Run:

```text
npm --workspace frontend test -- home.test.tsx
npm --workspace frontend run lint
npx tsc --noEmit -p frontend/tsconfig.json
```

Expected: all exit 0.

- [ ] **Step 6: Commit**

Commit message: `feat: build Hecliar product-led landing page`

---

### Task 2: Shared navigation and game-app visual system

**Files:**
- Modify: `frontend/components/Header.tsx`
- Modify: `frontend/app/layout.tsx`
- Modify: `frontend/app/globals.css`
- Modify: `frontend/components/setup/MatchSetup.tsx`
- Modify: `frontend/components/game/GameTable.tsx`
- Modify: `frontend/components/game/BidControls.tsx`
- Modify: `frontend/components/game/RoundResult.tsx`
- Modify: `frontend/components/game/MatchResult.tsx`
- Modify: `frontend/components/room/WaitingRoom.tsx`
- Test: `frontend/test/home.test.tsx`
- Test: existing component tests under `frontend/test`

**Interfaces:**
- `Header` exposes Home, How it works, Privacy, and a Play Robot action while retaining wallet controls.
- Existing game component props and gateway interfaces remain unchanged.
- Marketing hash links are `/#how-it-works`, `/#privacy`, and `/#rules`.

- [ ] **Step 1: Write navigation and regression RED tests**

Extend the header test coverage to require the three navigation destinations and preserve the wallet button. Add/retain assertions in existing game tests for visible current bid, score, own dice, concealed opponent count, Raise, Challenge, and rematch controls.

- [ ] **Step 2: Run RED**

Run: `npm --workspace frontend test`

Expected: homepage/header navigation assertions fail before implementation; existing privacy tests remain green.

- [ ] **Step 3: Implement shared shell and game visual redesign**

Restyle existing components without changing their props, state flow, action methods, rendering gates, storage behavior, or private/public projections. Use the light application shell and near-black `.table-surface`. Add a stable status rail for score/current bid/turn when the existing props expose those values. Keep Challenge red, Raise cyan, and own dice tactile. Do not synthesize or render opponent values.

- [ ] **Step 4: Run full component verification**

Run:

```text
npm --workspace frontend test
npm --workspace frontend run lint
npx tsc --noEmit -p frontend/tsconfig.json
```

Expected: all exit 0 with privacy assertions unchanged.

- [ ] **Step 5: Commit**

Commit message: `feat: unify Hecliar game product experience`

---

### Task 3: Responsive, accessibility, and production verification

**Files:**
- Modify only files implicated by a demonstrated failure.
- Update: `docs/acceptance-evidence.md`

**Interfaces:**
- Homepage remains available at `/`.
- Robot setup remains `/play/robot`.
- Friend setup remains `/play/friend`.
- Private-room flow remains `/room/[code]`.

- [ ] **Step 1: Run automated verification**

Run:

```text
npm --workspace frontend test
npm --workspace frontend run lint
npx tsc --noEmit -p frontend/tsconfig.json
npm --workspace frontend run build
```

Capture exact pass counts and warnings.

- [ ] **Step 2: Inspect desktop**

At `http://localhost:3100`, verify at approximately 1440px:

- heading hierarchy and CTA links;
- all explainer stages and footer links;
- keyboard-operable code tabs;
- no console errors;
- Robot setup and an active local game remain usable.

- [ ] **Step 3: Inspect mobile**

At 375px width, assert `document.documentElement.scrollWidth <= window.innerWidth`, verify the hero CTA stack, explainer readability, footer stacking, dice visibility, and reachable game actions.

- [ ] **Step 4: Verify reduced motion**

Emulate reduced motion and confirm looping bid-line/marquee animations are disabled while all explanatory content remains visible.

- [ ] **Step 5: Fix only reproduced issues test-first**

For each issue, add the narrowest automated regression when practical, observe failure, apply the minimal fix, and rerun the relevant focused plus full checks.

- [ ] **Step 6: Record evidence and commit**

Append commands, pass counts, viewport results, and any environment-only limitations to `docs/acceptance-evidence.md`.

Commit message: `test: verify redesigned Hecliar experience`
