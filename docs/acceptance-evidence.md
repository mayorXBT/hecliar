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
| Authorized roll only | PASS | Base Sepolia, friend-e2e step 4: each seat decrypted only its own dice |
| Public state hides raw dice | PASS | `getMyRoundHandles` returns ciphertext handles; plaintext appears only in `getRoundResult` after settlement |
| Opponent cannot access the other roll | PASS | Base Sepolia, friend-e2e step 5: the guest's `attestedDecrypt` of the host's handles was refused |
| No secrets in events/logs | PARTIAL | `ChallengeRequested` carries a handle, not a value; a browser-side sweep has not been done |

### Multiplayer & Recovery
| Check | Status | Evidence |
|---|---|---|
| Guest joins host room | PASS | rooms "admits one distinct guest" |
| Third wallet rejected | PASS | rooms "rejects host and third" |
| Clients converge | PENDING | Needs Playwright |
| Reload restores match | PENDING | Needs Playwright |
| Friend rematch mutual | PENDING | Not yet exercised |
| Friend round settles on chain | PASS | Base Sepolia, friend-e2e steps 6-8: raise, challenge, attested reveal, settle, 1-0 |

### Test Suite Results
| Suite | Count | Result |
|---|---|---|
| game-logic | 50/50 | PASS |
| frontend unit | 55/55 | PASS |
| contract suite (local Inco node) | 47/47 | PASS |
| confidential round on Base Sepolia | 1/1 | PASS |
| TypeScript | clean | PASS |
| Next.js build | succeeds | PASS |

## On-chain evidence

Contract `0xb4c65c3f9485ff6B2d8D270BdE1D5338e54FBA72` on Base Sepolia, driven by
`contracts/scripts/friend-e2e.ts` with two funded wallets. Re-runnable:

```bash
npx hardhat run scripts/friend-e2e.ts --network baseSepolia
```

One recorded run, room `HEC15486`, match 2:

```
host  reads own dice: [5,2,5,3]
guest reads own dice: [4,5,6,1]
REFUSED: the guest cannot read the host's dice
claiming 3 x 5 (true across both hands)
revealed 9 handles, effective count 3
base count 3 · effective count 3 · winner seat 0 · score 1 - 0
```

The arithmetic is checkable from the outside: the host holds two 5s and the
guest one, so three 5s exist across the table. The bid of three 5s therefore
held and the challenge lost. The contract reached the same 3 by computing over
ciphertext it could not itself read, and the count arrived carrying covalidator
signatures that `settleChallenge` verified before scoring.

Settlement cost 509,334 gas. The reveal needed four retries while the
covalidator caught up to the block — the expected lag, not a failure.

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
