# Task 1 Report: Product-led landing page and explainer system

## Delivered

- Replaced the minimal home route with the scoped `LandingPage` marketing composition.
- Added reusable marketing components for section headers, factual proof cards, static product preview, feature modules, round and confidentiality diagrams, code tabs, factual use-case cards/marquee, and footer.
- Added the approved content sequence: hero/demo, factual proof, how a round works, bid rules, gadgets, play paths, confidentiality model, dark technical section, factual use cases, CTA, and footer.
- Kept the preview illustrative and disconnected from all match/private state. No game logic or contracts changed.
- Added responsive CSS under the `.marketing-page` namespace, including the living bid route and reduced-motion overrides.

## TDD evidence

### RED

Expanded `frontend/test/home.test.tsx` before production changes and ran:

```text
npm --workspace frontend test -- home.test.tsx
```

Result: failed as expected because the original home page did not render the heading `Every bluff has a private side.`

### GREEN

After implementation, ran:

```text
npm --workspace frontend test -- home.test.tsx
```

Result: 1 test file passed, 1 test passed.

## Verification

Passed:

```text
npm --workspace frontend test -- home.test.tsx
npx eslint app/page.tsx components/marketing/*.tsx  (from frontend)
npx tsc --noEmit -p frontend/tsconfig.json
```

Browser inspection at the running Hecliar preview confirmed the approved hero loads, no horizontal overflow at narrow and desktop viewports, and the keyboard-focusable code-demo tabs switch to the Public bid panel.

## Known repository-wide lint boundary

`npm --workspace frontend run lint` does not exit cleanly because of pre-existing, out-of-scope errors in already-dirty game/room files:

- `frontend/app/room/[code]/page.tsx` (`react-hooks/set-state-in-effect`)
- `frontend/components/game/TurnTimer.tsx` (`react-hooks/purity`)
- `frontend/hooks/useMatchRecovery.ts` (`react-hooks/set-state-in-effect`)
- `frontend/hooks/usePrivatePlayer.ts` (`react-hooks/set-state-in-effect`)
- `frontend/hooks/usePublicMatch.ts` (`react-hooks/set-state-in-effect`)

The Task 1 route and all new marketing components pass targeted ESLint. These unrelated errors were not modified.

## Review fix round

### Changes

- Implemented roving tab behavior for the confidentiality demo. ArrowLeft, ArrowRight, Home, and End now activate and focus the appropriate tab; only the active tab remains in the normal tab order.
- Replaced unsupported Reroll/Wildcard marketing copy with the implemented gadgets: Echo counts one selected own matching die twice, Jammer ignores one selected opponent matching die, and Scanner checks the current bid after an opening bid.
- Added a small client-side Intersection Observer coordinator. Motion loops run only while their containing preview/marquee is visible; reveal animation is progressive, so content remains visible when JavaScript or Intersection Observer is unavailable. Reduced-motion overrides remain active.
- Removed structural `overflow: clip` from `.marketing-page` and `.marketing-metric-grid`; clipping remains only on decorative route, product-preview, or marquee wrappers.
- Replaced plain pseudocode strings with tokenized keyword, function, number, and comment spans.

### Fix-round RED/GREEN evidence

Added focused tests before the implementation changes. RED confirmed that the prior page lacked Echo/Jammer content and ArrowRight/Home/End tab activation. After implementation:

```text
npm --workspace frontend test -- home.test.tsx
```

Result: 1 test file passed, 2 tests passed.

Also passed:

```text
npx eslint app/page.tsx components/marketing/*.tsx test/home.test.tsx  (from frontend)
npx tsc --noEmit -p frontend/tsconfig.json
```
