# Task 3 Verification Report

**Date:** 2026-08-11
**Scope:** Product-experience redesign responsive, accessibility, and production verification.

## Result

The redesign's production build, TypeScript check, and unit suite pass. A 375px landing-page overflow was reproduced, given a narrow regression, and fixed with one CSS grid sizing rule. The final narrow browser pass shows no horizontal overflow and reachable game actions.

## Exact automated evidence

- `npm --workspace frontend test`: 5 files and 28/28 tests passed.
- `npx tsc --noEmit -p frontend/tsconfig.json`: exit 0, no diagnostics.
- `npm --workspace frontend run build`: exit 0. Next.js generated all 6 application routes. It emitted only the known `MODULE_TYPELESS_PACKAGE_JSON` warning for `frontend/tailwind.config.ts`.
- `npm --workspace frontend run lint`: exit 1, 5 errors and 14 warnings. The errors are the known React hook/purity baseline in `app/room/[code]/page.tsx`, `components/game/TurnTimer.tsx`, `hooks/useMatchRecovery.ts`, `hooks/usePrivatePlayer.ts`, and `hooks/usePublicMatch.ts`; they are outside the verified responsive change and were not changed here.

## Browser evidence

- At 1440px, homepage width was 1434px; hierarchy, CTAs, all explainer stages, footer links, and keyboard tab movement worked with no console errors.
- `/play/robot` setup worked. A live local Robot match rendered four labelled own dice; Raise transitioned through Robot thinking and returned a public bid and reachable actions, with no console errors.
- At 375px, initial homepage width was 384px. The technical code demo's intrinsic grid item width forced overflow. After adding `.marketing-technical > * { min-width: 0; }`, homepage width became 369px and diagrams stayed within their 329px content column. The stacked hero CTAs and one-column footer remained readable.
- At 375px, the game table width was 369px. The four own dice were visible above the fixed action region and both action buttons stayed within the 812px viewport.

## Reduced-motion limitation

The CSS includes dedicated `prefers-reduced-motion: reduce` rules that remove marketing animation, transforms, transitions, and smooth scrolling. The available browser adapter exposes viewport control but not a media-feature emulator, so reduced-motion behavior was verified from the applied CSS rather than an emulated media setting.

## Change made

- `frontend/app/globals.css`: permits children of the responsive technical grid to shrink.
- `frontend/test/marketing-layout.test.ts`: regression guard for that sizing contract.
- `docs/acceptance-evidence.md`: appended exact check and browser evidence.
