# Hecliar MVP Acceptance Evidence
**Generated:** 2026-08-11
**Worktree:** .worktrees/hecliar-mvp

## PRD Acceptance Checklist

### Rules
| Check | Status | Evidence |
|---|---|---|
| Every permitted bid increase accepted | PASS | bids.test.ts + rounds.test.ts |
| Equal/lower bids rejected | PASS | bids.test.ts + contract rounds |
| Truthful bid awards round | PASS | rounds "settles truthful" |
| False bid awards challenger | PASS | rounds "settles false" |
| No double settlement | PASS | rounds "rejects duplicate" |
| First-to-two ends match | PASS | rounds "completes 2-0" |
| Dice counts 3-6 work | PASS | rooms test + confidential |

### Confidentiality
| Check | Status | Evidence |
|---|---|---|
| Authorized roll only | PENDING | Needs Docker covalidator |
| Public state hides raw dice | PENDING | Needs Docker |
| Robot cannot access human roll | PENDING | Needs Docker |
| No secrets in events/logs | PENDING | Needs Docker + browser |

### Multiplayer & Recovery
| Check | Status | Evidence |
|---|---|---|
| Guest joins host room | PASS | rooms "admits one distinct guest" |
| Third wallet rejected | PASS | rooms "rejects host and third" |
| Clients converge | PENDING | Needs Playwright |
| Reload restores match | PENDING | Needs Playwright |
| Friend rematch mutual | PENDING | Needs Docker |

### Test Suite Results
| Suite | Count | Result |
|---|---|---|
| game-logic | 50/50 | PASS |
| frontend unit | 25/25 | PASS |
| contract hardhat-network | 28/28 | PASS |
| contract confidential | 10 | PENDING |
| TypeScript | clean | PASS |
| Next.js build | succeeds | PASS |

## Remaining Work
- Docker: start Inco node, run confidential + Playwright E2E tests
- Base Sepolia: deploy, wire frontend, smoke test
- Final clean-checkout verification

## Product Experience Redesign Verification — 2026-08-11

### Automated checks

| Command | Result | Evidence |
|---|---|---|
| `npm --workspace frontend test` | PASS | 5 test files, 28/28 tests passed. Includes the narrow technical-demo shrink regression. |
| `npx tsc --noEmit -p frontend/tsconfig.json` | PASS | Exit 0; no diagnostics. |
| `npm --workspace frontend run build` | PASS | Exit 0; all 6 application routes compiled and static pages generated. Non-blocking warning: `frontend/tailwind.config.ts` is reparsed as ESM because `frontend/package.json` lacks `type: module`. |
| `npm --workspace frontend run lint` | KNOWN BASELINE FAILURE | Exit 1 with 5 errors and 14 warnings. Errors are in the room/recovery/live-game code: `app/room/[code]/page.tsx`, `components/game/TurnTimer.tsx`, `hooks/useMatchRecovery.ts`, `hooks/usePrivatePlayer.ts`, and `hooks/usePublicMatch.ts`. This verification did not modify those unrelated paths. |

### Browser checks

| Viewport / flow | Result | Evidence |
|---|---|---|
| Desktop landing page, 1440px | PASS | `scrollWidth` 1434 <= 1440. One H1 and ordered H2/H3 hierarchy render; both game CTAs, all Roll/Raise/Challenge/Reveal stages, and all footer links render. ArrowRight moves the confidentiality tabs and updates the active panel. No browser console errors. |
| Robot setup and local match, desktop | PASS | `/play/robot` renders dice, difficulty, gadget, and Start match controls. Starting a local game renders four labelled private dice and Raise/Challenge controls; a Raise action transitions to Robot thinking, then returns control with a new public bid. No browser console errors. |
| Landing page, 375px | PASS after regression fix | Initial inspection reproduced horizontal overflow (`scrollWidth` 384 > `innerWidth` 375). The code-demo's intrinsic grid item width expanded the single-column technical section. Adding `.marketing-technical > * { min-width: 0; }` reduces `scrollWidth` to 369 <= 375. Hero CTAs stack as 329px-wide controls, both diagrams are 329px wide with no internal overflow, and the footer becomes one column. |
| Active game, 375px | PASS | `scrollWidth` 369 <= 375. Four own dice remain visible (y 636–681); the fixed action region is fully reachable (y 710–802 in an 812px viewport); Raise and Challenge buttons remain within it. No browser console errors. |

### Reduced motion

The app supplies explicit `prefers-reduced-motion: reduce` rules that disable marketing animations, transforms, transitions, and smooth scrolling while content remains ordinary static DOM. The available browser adapter supports viewport overrides but not media-feature emulation, so an actual reduced-motion browser-emulation run is an environment limitation; this entry is source-level verification only.
