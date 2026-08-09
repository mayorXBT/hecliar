# Task 4 — Local Single-Player Vertical Slice

## Status

Implemented the local Robot best-of-three vertical slice in the isolated `hecliar-mvp` worktree. The local adapter is in-memory, keeps public and private projections separate, and exposes no opponent roll or gadget data until a challenge result is available.

## Implementation design note

**Subject and job.** Hecliar is a confidential bluffing table for a player deciding whether to raise or challenge; this slice’s single job is to make that decision loop immediate and readable without disclosing the robot’s hand.

**Tokens.** Ink `#07131f`, table navy `#0d2030`, ivory `#f5eedf`, private/verified cyan `#4be5e1`, pending amber `#f5ba4c`, and Challenge coral `#fa786b`. IBM Plex Mono is retained for compact, tabular bids and scores. The subtle cyan grid is atmosphere, not a dashboard decoration.

**Layout.** The table is a three-surface stack: opponent/public score, current bid/turn status, and the player’s hand/actions. The score and bid use tabular numerals; tactile ivory dice distinguish authorized private information. At narrow widths controls wrap/scroll within their own compact selector rather than expanding the page.

**Signature.** The hidden-hand line paired with raised physical dice makes the privacy boundary visible: “4 hidden dice” is deliberately as concrete as the player’s own four dice.

**Critique/revision.** The first narrow rendering allowed the quantity selector’s grid intrinsic width to push the entire table to 420px at a 375px viewport. Adding `min-width: 0` to table grid items confines the compact selector’s overflow to itself. The final in-app browser measurement is `scrollWidth: 369` at `innerWidth: 375`.

## TDD evidence

1. `packages/game-logic/test/local-game.test.ts` was created before `LocalGameGateway`; its first run failed with `Cannot find module '../src/local-game'` as expected. Minimal implementation then made all six focused tests pass: dice counts 3–6, settle-once enforcement, alternating fresh rounds, fresh rematch rolls, and public projection shape.
2. `frontend/test/MatchSetup.test.tsx` and `frontend/test/GameTable.test.tsx` were created before their components; the RED run failed because both imports did not exist. They pass after implementing the focused setup/table components.
3. The narrow-viewport regression was captured in `frontend/e2e/local-robot.spec.ts` before the CSS fix. The available in-app browser reproduced the actual failure (`scrollWidth: 420` at 375px); the Playwright CLI could not execute because its Chromium binary is absent. The CSS GREEN was independently verified in the in-app browser (`scrollWidth: 369`).

## Behaviour and privacy boundary

- `LocalGameGateway` implements the stable game gateway and only returns the human’s `PrivatePlayerView`; public snapshots clone only public fields.
- Robot strategy receives robot dice, public bid, settings, scores, and robot gadget state only. It is never passed the human roll.
- Dice and gadget plaintext are never written to browser storage, logs, analytics, or public gateway state. Navigation stores only the local match ID in `sessionStorage`.
- Opponent dice have no pre-resolution UI prop: `DiceTray` accepts a hidden count, not a hidden dice roll. In-app DOM inspection before resolution showed four authorized own dice plus exactly “4 hidden dice”; there were no console warnings or errors.
- Challenge resolution reveals both rolls, records base/effective counts and gadget effects, settles exactly once, advances first-to-two scoring, alternates starters, and supports Robot rematch.

## Verification

| Check | Result |
| --- | --- |
| `npm --workspace @hecliar/game-logic test` | PASS — 47 tests |
| `npm --workspace frontend test` | PASS — 3 tests |
| `npm --workspace @hecliar/game-logic run lint` | PASS |
| `npm --workspace frontend run lint` | PASS |
| `npm --workspace @hecliar/game-logic run build` | PASS |
| `npm --workspace frontend run build` | PASS |
| In-app browser desktop run | PASS — setup, raise, robot response, challenge evidence, match result, rematch |
| In-app browser narrow run | PASS after overflow fix — no page horizontal scroll; action area reachable |
| Playwright CLI e2e | Blocked by missing local Chromium executable (`chromium_headless_shell-1181`) |

The production build emits existing environment warnings about a missing WalletConnect project ID and a typeless Tailwind config, but exits successfully. Browser storage was not directly inspected through the in-app-browser runtime because its safety policy forbids reading local/session storage; the implementation and gateway tests cover the no-secret-persistence boundary.

## Self-review

Keyboard-operable native controls, visible focus rings, live turn/result regions, non-colour status text, reduced-motion handling, and mobile touch targets are included. Error states distinguish unavailable local transport, a stale/nonexistent local match, failed game actions, and failed startup. Friend mode, wallets, contracts, persistence of private state, and chain confidentiality were not added.

## Review-fix round 1

RED/GREEN: added focused gateway tests for invalid-length deterministic rolls, Scanner’s no-bid gate, deterministic enabled gadget assignment, and post-use private-gadget redaction; the first RED run showed sliced invalid rolls and a still-visible used gadget, then 9/9 local-gateway tests passed. Added component tests for real Echo target choice and one-main semantics; RED showed no target controls and nested mains, then 3/3 GameTable tests passed.

Implemented exact queued-roll lengths, injected gadget queues for repeatable tests, private projection redaction after use, a real per-die target picker for Echo/Jammer, Scanner disabling without a bid, pending-action display wiring, a section game-table landmark, and authoritative score display in the round result. The focused logic build and frontend production build pass. Production build still reports the existing missing WalletConnect and typeless Tailwind warnings.

Remaining review verification concern: the requested real Playwright run/install was not completed during this bounded fix pass. The existing Playwright command previously established its exact blocker as the absent Chromium executable; install is authorized but needs a separate completed download/run window. Browser storage inspection remains constrained by the browser runtime safety policy.

## Review-fix round 2

Added pending-state suppression in setup and bid/gadget controls: a start attempt becomes `Starting match`, target actions and bidding are disabled while an action is pending, and the pending action is announced. Focused MatchSetup/GameTable tests pass and the frontend production build passes. `npx playwright install chromium` was authorized and attempted but exceeded the bounded command window without returning a completed download result; the real e2e run remains externally blocked on that runtime download.

## Review-fix round 4

### Status and finding map

1. **Pending/error lifecycle.** A route-level `MatchScreen` controller now owns one synchronous in-flight gate for Raise, Challenge, gadget use, automatic settlement, robot action, next round, and Rematch. `MatchSetup` has the equivalent synchronous Start gate. Match and round result buttons expose pending/busy states. Focused tests use deliberately reentrant callbacks, rather than only checking disabled props, and prove exactly one Start, Raise, Challenge, gadget, and Rematch invocation. A failed action performs an authoritative refresh before unlocking; the table remains rendered, exposes Refresh/Start-new recovery, and clears the old error as soon as a new attempt begins.
2. **Private-state lifecycle.** The stateful controller is keyed by the validated match ID, so a match-ID change synchronously unmounts the old in-memory private projection. Challenge and settlement clear private state before their operation/refresh; next-round and Rematch clear it before requesting replacement dice. Public/result refreshes apply independently of a deferred private refresh, preventing stale dice from filling the new public round. Controlled deferred-promise tests cover challenge, settlement, next round, Rematch, and match-ID replacement.
3. **Mobile action contract.** Quantity and face selectors are compact wrapping groups with no internal horizontal scroller. At 520px and below the table action group is fixed inside the viewport, with safe-area bottom spacing and extra hand-surface padding; result screens do not render that fixed group. The focused component test covers the wrapping/action-region contract. The expanded Playwright spec measures page and selector overflow, action bounds, and result-button reach at 1280px and 375px.
4. **Malformed/stale match recovery.** Decimal positive match IDs are validated before `BigInt` conversion. Invalid links render a recovery action without throwing; missing/stale matches retain retry and start-new controls. The focused controller test passes `not-a-number` and proves the safe recovery UI.
5. **Browser/privacy evidence prepared.** The Playwright spec now runs a complete automatic Robot match and Rematch on desktop and 375px; checks pre-resolution DOM exclusion, local/session storage allowlists, page/selector overflow, fixed-action bounds, result reachability, console/page errors, and captures private-table/result screenshots. Execution remains blocked only by the absent project Chromium binary, as detailed below.

### RED to GREEN evidence

- Initial RED: `npm --workspace frontend test -- MatchSetup.test.tsx GameTable.test.tsx MatchScreen.test.tsx` exited 1. The reentrant Start test observed two calls, mobile groups were absent, and `MatchScreen` could not be imported.
- Second RED: `npm --workspace frontend test -- MatchScreen.test.tsx` exited 1 with the old round result still rendered while the fresh private view was deferred.
- GREEN: `npm --workspace frontend test -- MatchScreen.test.tsx MatchSetup.test.tsx GameTable.test.tsx` exited 0: 3 files, 15 tests.
- The lifecycle refactor was checked against React 19 lint. The first lint run rejected a render-time ref write and synchronous effect resets; keying the controller by match ID removed both patterns. The subsequent focused test and lint runs exited 0.

### Browser attempt and exact blocker

- `npx playwright install --list` showed Playwright 1.54.2 with only `ffmpeg-1011`. A separate Python Playwright 1.60 cache has Chromium 1223, which does not satisfy this project's required revision.
- The single authorized PowerShell attempt, `$env:PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT='120000'; npx playwright install chromium`, produced no download output and was terminated by the 604-second command bound (exit 124). A follow-up `install --list` still showed no Chromium for Playwright 1.54.2.
- `npm run e2e -- --reporter=line` loaded both expanded tests, then both failed at browser launch because `C:\Users\hp\AppData\Local\ms-playwright\chromium_headless_shell-1181\chrome-win\headless_shell.exe` does not exist. No browser assertions or screenshots are claimed as executed.

### Fresh final verification

| Command | Result |
| --- | --- |
| `npm --workspace @hecliar/game-logic test` | PASS — 6 files, 50 tests |
| `npm --workspace frontend test` | PASS — 4 files, 16 tests |
| `npm --workspace @hecliar/game-logic run lint` | PASS |
| `npm --workspace frontend run lint` | PASS |
| `npm --workspace @hecliar/game-logic run build` | PASS — `tsc --noEmit` |
| `npx tsc --noEmit --incremental false -p frontend\tsconfig.json` | PASS |
| `npm --workspace frontend run build` | PASS — Next.js compiled, type-checked, and generated all routes |
| `git diff --check` | PASS — no whitespace errors |

The frontend build retains the pre-existing typeless Tailwind config and missing WalletConnect project-ID warnings but exits 0. Chromium download/browser execution is the sole remaining external evidence gap.

## Review-fix round 5

### Status

Fixed automatic-action retry deduplication in `MatchScreen`. Robot turns and challenge settlement still reserve their sequence key before the delay, preserving in-flight and duplicate suppression. Their shared automatic-action wrapper now removes that key only when the gateway action rejects, before `runAction` performs its authoritative refresh. A refreshed unchanged sequence can therefore schedule another attempt, while successful sequence keys remain deduplicated.

### RED to GREEN evidence

- RED: added focused tests for a successful automatic Robot turn and for a transient Robot action rejection followed by an unchanged authoritative refresh and retry. `npm --workspace frontend test -- MatchScreen.test.tsx` exited 1: 10 passed and the retry test failed because `requestRobotAction` was called once instead of twice, reproducing the stale-attempt-key defect.
- During GREEN verification, the first gateway double returned the same public object identity on every refresh. Systematic tracing showed that this did not mirror `LocalGameGateway.getPublicMatch`, which returns a fresh clone. The double was corrected to return a fresh complete projection with the same sequence. This preserves the intended unchanged-authoritative-state scenario while exercising the real gateway boundary.
- GREEN: the minimal shared wrapper rolls back the attempt key inside the rejected work callback, before recovery refresh updates state. `npm --workspace frontend test -- MatchScreen.test.tsx` then exited 0 with 11/11 tests.

Robot and settlement do not have different attempt-deduplication control flow: each branch reserves a branch-specific key and timer, then invokes the same `runAutomaticAction` wrapper. The new success/failure/retry tests cover that shared wrapper through the Robot branch; the existing settlement test covers the settlement branch timer, invocation, private-dice clearing, and pending state. No separate settlement retry implementation exists to test independently.

### Fresh verification

| Command | Result |
| --- | --- |
| `npm --workspace frontend test -- MatchScreen.test.tsx` | PASS — 11 tests |
| `npm --workspace frontend test` | PASS — 4 files, 18 tests |
| `npm --workspace frontend run lint` | PASS |
| `npx tsc --noEmit --incremental false -p frontend\tsconfig.json` | PASS |
| `npm --workspace frontend run build` | PASS — compiled, type-checked, and generated all routes |
| `git diff --check` | PASS |

Game-logic code was not affected, so its conditional test/build checks were not rerun. The frontend production build retains the pre-existing typeless Tailwind config and missing WalletConnect project-ID warnings but exits 0. Per the round scope, the absent Playwright Chromium runtime was not downloaded or retried.

### Self-review

- Failed attempt keys are deleted before the authoritative refresh, ensuring that refresh can retrigger the unchanged sequence immediately.
- Successful attempt keys are never deleted, so eventual-consistency refreshes cannot double-submit a completed Robot action or settlement.
- The key remains reserved throughout each delay and in-flight request, retaining duplicate suppression.
- Both automatic branches use the shared failure behavior; manual action, lifecycle, UI, and privacy paths are unchanged.
- The focused retry test would fail if rollback were removed or moved until after the recovery refresh had already rendered the unchanged sequence.

Status: **DONE_WITH_CONCERNS** only because real Playwright evidence remains unavailable without the separately tracked Chromium runtime.
