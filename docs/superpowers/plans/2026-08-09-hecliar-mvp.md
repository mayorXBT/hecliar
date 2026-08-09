# Hecliar MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify the complete Hecliar MVP: confidential best-of-three Liar's Dice against a rule-based robot or a friend in a private room.

**Architecture:** An official Inco EVM monorepo contains a Next.js client, a Hardhat Solidity project, and a pure shared rules package. `HecliarGame` is authoritative for rooms, turns, bids, confidential rolls and gadgets, attested challenge settlement, scores, timers, and rematches; the robot endpoint owns only the robot wallet and calls the same pure strategy used by simulations.

**Tech Stack:** TypeScript, React, Next.js App Router, RainbowKit, Wagmi, Viem, Vitest, React Testing Library, Playwright, Solidity 0.8.30, Hardhat, `@inco/lightning@1.0.2`, `@inco/lightning-js@1.0.2`, Inco local-node/covalidator `v1.0.2`, Base Sepolia.

## Global Constraints

- The approved source of truth is `docs/superpowers/specs/2026-08-09-hecliar-mvp-design.md`.
- Work must execute in an isolated worktree created with `superpowers:using-git-worktrees`.
- No production behavior may be written before a focused test has failed for the expected reason.
- Any unexpected failure must follow `superpowers:systematic-debugging` before a fix is proposed or implemented.
- Dice count is an integer from 3 through 6 and defaults to 4.
- Ones are ordinary faces and are not wild.
- A higher bid has a larger quantity, or the same quantity and a larger face.
- The first side to win two rounds wins the match; the starting side alternates each round.
- Every side receives exactly one confidential gadget assignment in every enabled round and no assignment in disabled rounds.
- A side may use its gadget at most once per round.
- Turn duration is 45 seconds; abandonment can be claimed after two minutes without a valid action.
- Friend rooms admit exactly two distinct wallets and Friend rematches require both wallets to accept.
- `@inco/lightning`, `@inco/lightning-js`, local anvil, and local covalidator versions must all be `1.0.2`.
- Inco Lightning v1 must be described as TEE-based confidential compute, never as FHE or zero knowledge.
- Pre-resolution opponent dice, gadget assignment, gadget target, and Scanner result must not appear in public storage, events, APIs, logs, analytics, browser persistence, or the DOM.
- Private plaintext may exist only in the authorized wallet's in-memory view model or the robot process's short-lived observation.
- Base Sepolia chain ID is 84532.
- No wagering, tokens, prizes, NFTs, matchmaking, spectators, chat, or third active side.
- Every external code or asset adaptation must update `THIRD_PARTY_NOTICES.md`.

---

## Planned File Structure

```text
.
├─ package.json                         workspace scripts and pinned tools
├─ package-lock.json                    reproducible dependency graph
├─ docker-compose.yaml                  version-matched local Inco services
├─ scripts/
│  ├─ workspace-shape.test.mjs          scaffold acceptance check
│  ├─ verify-acceptance.mjs             final requirement-to-evidence runner
│  ├─ audit-confidentiality.mjs         static and runtime leak audit
│  └─ smoke-base-sepolia.mjs            deployed Robot match smoke test
├─ packages/game-logic/
│  ├─ package.json
│  ├─ tsconfig.json
│  ├─ src/
│  │  ├─ types.ts                       public domain types and branded bounds
│  │  ├─ settings.ts                    dice/settings validation
│  │  ├─ bids.ts                        bid comparison and enumeration
│  │  ├─ resolution.ts                  base/effective counts and scoring
│  │  ├─ robot.ts                       probability strategies and validation
│  │  ├─ local-game.ts                  deterministic test/local gateway
│  │  └─ index.ts                       public exports
│  └─ test/
│     ├─ settings.test.ts
│     ├─ bids.test.ts
│     ├─ resolution.test.ts
│     ├─ robot.test.ts
│     └─ local-game.test.ts
├─ contracts/
│  ├─ contracts/
│  │  ├─ HecliarGame.sol                authoritative public/confidential state
│  │  └─ libraries/
│  │     ├─ HecliarTypes.sol            enums, structs, custom errors
│  │     └─ BidRules.sol                pure onchain bid validation
│  ├─ ignition/modules/HecliarGame.ts    deployment module
│  ├─ scripts/wire-frontend.mjs          deployed address to frontend env
│  ├─ test/
│  │  ├─ BidRules.test.ts
│  │  ├─ HecliarGame.rooms.test.ts
│  │  ├─ HecliarGame.rounds.test.ts
│  │  ├─ HecliarGame.confidential.test.ts
│  │  ├─ HecliarGame.gadgets.test.ts
│  │  ├─ HecliarGame.recovery.test.ts
│  │  └─ helpers/inco.ts
│  └─ hardhat.config.ts
├─ frontend/
│  ├─ app/
│  │  ├─ page.tsx                       home
│  │  ├─ how-to-play/page.tsx
│  │  ├─ play/robot/page.tsx
│  │  ├─ play/friend/page.tsx
│  │  ├─ room/[code]/page.tsx
│  │  ├─ match/[matchId]/page.tsx
│  │  ├─ api/robot/action/route.ts
│  │  └─ globals.css
│  ├─ components/
│  │  ├─ setup/MatchSetup.tsx
│  │  ├─ room/WaitingRoom.tsx
│  │  ├─ game/GameTable.tsx
│  │  ├─ game/DiceTray.tsx
│  │  ├─ game/BidControls.tsx
│  │  ├─ game/GadgetPanel.tsx
│  │  ├─ game/ActionStatus.tsx
│  │  ├─ game/TurnTimer.tsx
│  │  ├─ game/RoundResult.tsx
│  │  └─ game/MatchResult.tsx
│  ├─ hooks/
│  │  ├─ useGameGateway.tsx
│  │  ├─ usePublicMatch.ts
│  │  ├─ usePrivatePlayer.ts
│  │  ├─ useGameActions.ts
│  │  ├─ useRobotTurn.ts
│  │  └─ useMatchRecovery.ts
│  ├─ lib/
│  │  ├─ contracts/hecliar.ts
│  │  ├─ game/gateway.ts
│  │  ├─ game/chain-gateway.ts
│  │  ├─ inco/client.ts
│  │  ├─ logging/safe-log.ts
│  │  ├─ network.ts
│  │  ├─ room-code.ts
│  │  └─ storage/public-recovery.ts
│  ├─ server/robot/
│  │  ├─ action.ts
│  │  ├─ observation.ts
│  │  ├─ wallet.ts
│  │  └─ rate-limit.ts
│  ├─ test/
│  │  ├─ MatchSetup.test.tsx
│  │  ├─ GameTable.test.tsx
│  │  ├─ WaitingRoom.test.tsx
│  │  ├─ chain-gateway.test.ts
│  │  ├─ private-state.test.ts
│  │  └─ robot-route.test.ts
│  ├─ vitest.config.ts
│  ├─ playwright.config.ts
│  ├─ test/setup.ts
│  └─ e2e/
│     ├─ helpers.ts
│     ├─ robot-match.spec.ts
│     ├─ friend-room.spec.ts
│     ├─ recovery.spec.ts
│     ├─ mobile.spec.ts
│     └─ confidentiality.spec.ts
├─ docs/
│  ├─ privacy-map.md
│  ├─ deployment.md
│  ├─ acceptance-evidence.md
│  └─ confidentiality-audit.md
└─ THIRD_PARTY_NOTICES.md
```

## Stable Cross-Task Interfaces

```ts
export type DieFace = 1 | 2 | 3 | 4 | 5 | 6;
export type DiceCount = 3 | 4 | 5 | 6;
export type Seat = 0 | 1;
export type Difficulty = "easy" | "medium" | "hard";
export type MatchStatus =
  | "waiting-for-player"
  | "waiting-for-ready"
  | "rolling"
  | "active-turn"
  | "resolving-challenge"
  | "round-complete"
  | "match-complete"
  | "cancelled";
export type GadgetKind = "echo" | "jammer" | "scanner";

export type Bid = Readonly<{
  quantity: number;
  face: DieFace;
  bidder: Seat;
  sequence: number;
}>;

export type MatchSettings = Readonly<{
  diceCount: DiceCount;
  gadgetsEnabled: boolean;
  mode: "robot" | "friend";
  difficulty?: Difficulty;
}>;

export type PublicMatchView = Readonly<{
  matchId: bigint;
  status: MatchStatus;
  players: readonly [`0x${string}`, `0x${string}`];
  settings: MatchSettings;
  activeSeat: Seat;
  startingSeat: Seat;
  currentBid: Bid | null;
  score: readonly [number, number];
  round: number;
  actionSequence: number;
  actionDeadline: number;
  abandonmentDeadline: number;
  rematchAccepted: readonly [boolean, boolean];
}>;

export type PrivatePlayerView = Readonly<{
  ownDice: readonly DieFace[];
  gadget: GadgetKind | null;
  scannerResult: boolean | null;
}>;

export interface GameGateway {
  createRobotMatch(settings: MatchSettings): Promise<bigint>;
  createFriendRoom(settings: MatchSettings, roomHash: `0x${string}`): Promise<bigint>;
  joinFriendRoom(roomHash: `0x${string}`): Promise<bigint>;
  setReady(matchId: bigint): Promise<void>;
  getPublicMatch(matchId: bigint): Promise<PublicMatchView>;
  getPrivatePlayer(matchId: bigint): Promise<PrivatePlayerView>;
  raise(matchId: bigint, bid: Omit<Bid, "bidder" | "sequence">, expectedSequence: number): Promise<void>;
  challenge(matchId: bigint, expectedSequence: number): Promise<void>;
  useGadget(matchId: bigint, target: number, expectedSequence: number): Promise<void>;
  settleChallenge(matchId: bigint, expectedSequence: number): Promise<void>;
  continueMatch(matchId: bigint, expectedSequence: number): Promise<void>;
  requestRobotAction(matchId: bigint, expectedSequence: number): Promise<void>;
  claimTurnTimeout(matchId: bigint, expectedSequence: number): Promise<void>;
  claimAbandonment(matchId: bigint, expectedSequence: number): Promise<void>;
  acceptRematch(matchId: bigint): Promise<void>;
}
```

## Review Policy During Execution

With subagent-driven execution, every task receives the required specification
review followed by code-quality review before the next task. With inline
execution, request independent review after Tasks 3, 4, 6, 7, 9, 10, and 11,
then run the final full review in Task 12. Critical findings block progress;
Important findings are fixed before the next slice; every behavioral fix starts
with a failing regression test.

## Requirement Coverage Map

| Requirement | Implementation tasks | Authoritative evidence |
| --- | --- | --- |
| FR-1 creation and 3–6 dice, default 4 | 2, 4, 5 | settings unit tests, contract cases, setup UI test |
| FR-2 confidential rolls | 5, 8, 11 | local-covalidator access tests and leakage audit |
| FR-3 legal bids | 2, 4, 6 | exhaustive pure ordering and contract rejection tests |
| FR-4 challenge resolution | 2, 6, 7, 8 | attested contract settlement and browser evidence test |
| FR-5 best-of-three | 2, 4, 6 | exact-once 2–1 contract and UI completion tests |
| FR-6 Robot | 3, 8 | 100-position simulations per difficulty and wallet-boundary tests |
| FR-7 private rooms | 5, 9 | two-context join/full/synchronization tests |
| FR-8 gadgets | 5, 7, 11 | exact assignment, one-use, private Scanner, effect-code tests |
| FR-9 rematch | 4, 6, 9 | fresh Robot and mutual Friend rematch tests |
| FR-10 recovery | 9, 10 | reload, timeout, abandonment, wallet rejection tests |
| Responsive first-time UX | 4, 10 | Robot browser journey, accessibility, and 320 px test |
| No secret leakage | 5, 7, 8, 11 | storage/event/RPC/API/log/browser audit |
| Base Sepolia deployability | 1, 12 | compile, deploy/wire scripts, live smoke when credentials exist |

### Task 1: Official Workspace Baseline

**Files:**
- Create: `scripts/workspace-shape.test.mjs`
- Create from official scaffold: `package.json`, `package-lock.json`, `docker-compose.yaml`, `contracts/**`, `frontend/**`
- Create: `packages/game-logic/package.json`
- Create: `packages/game-logic/tsconfig.json`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/playwright.config.ts`
- Create: `frontend/test/setup.ts`
- Modify: `.gitignore`
- Modify: `THIRD_PARTY_NOTICES.md`

**Interfaces:**
- Consumes: approved design and official `create-inco-app` CLI
- Produces: npm workspaces `contracts`, `frontend`, and `packages/game-logic`; root scripts `test`, `build`, `lint`, `contracts:compile`, `contracts:test`, `contracts:node`, and `contracts:node:down`

- [ ] **Step 1: Create the isolated worktree**

Use `superpowers:using-git-worktrees` before any scaffold action. Create branch `feat/hecliar-mvp` under the ignored `.worktrees/hecliar-mvp` directory and verify the documentation-only baseline is clean.

```powershell
git check-ignore .worktrees
git worktree add .worktrees/hecliar-mvp -b feat/hecliar-mvp
git -C .worktrees/hecliar-mvp status --short --branch
```

Expected: branch `feat/hecliar-mvp`, no uncommitted files.

- [ ] **Step 2: Verify the smallest official Inco example outside the repository**

Read the installed `lightning` skill completely, configure/query the official Inco documentation endpoint, and cite the current quickstart. Create a disposable directory, run the official contracts-only scaffold, install, compile, start the version-matched local node, run its tests, and stop the node.

```powershell
$incoSmoke = Join-Path $env:TEMP "hecliar-inco-smoke-$([guid]::NewGuid().ToString('N'))"
npx create-inco-app@latest $incoSmoke --template contracts --chain evm --framework hardhat --yes --use-npm
npm --prefix $incoSmoke install
npm --prefix $incoSmoke run compile
docker compose -f (Join-Path $incoSmoke "docker-compose.yaml") up -d
npm --prefix $incoSmoke test
docker compose -f (Join-Path $incoSmoke "docker-compose.yaml") down
```

Expected: compile and official example tests exit 0. Record exact versions and commands in `docs/privacy-map.md`.

- [ ] **Step 3: Write the failing workspace-shape test**

```js
// scripts/workspace-shape.test.mjs
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

for (const path of [
  "package.json",
  "contracts/package.json",
  "frontend/package.json",
  "packages/game-logic/package.json",
  "docker-compose.yaml",
]) {
  assert.equal(existsSync(path), true, `missing ${path}`);
}

const root = JSON.parse(readFileSync("package.json", "utf8"));
assert.deepEqual(root.workspaces, ["contracts", "frontend", "packages/game-logic"]);
assert.equal(root.scripts.test, "npm run test --workspaces --if-present");
assert.equal(root.scripts.build, "npm run build --workspaces --if-present");
```

- [ ] **Step 4: Run the workspace-shape test and verify RED**

Run:

```powershell
node scripts/workspace-shape.test.mjs
```

Expected: FAIL with `missing package.json`.

- [ ] **Step 5: Generate and merge the official monorepo scaffold**

Generate into a disposable sibling directory so the committed PRD and docs remain untouched, then copy the generated contract/frontend roots into the worktree.

```powershell
$scaffold = Join-Path $env:TEMP "hecliar-create-inco-app-$([guid]::NewGuid().ToString('N'))"
npx create-inco-app@latest $scaffold --template monorepo --chain evm --framework hardhat --wallet rainbowkit --yes --use-npm
Copy-Item -Recurse -LiteralPath (Join-Path $scaffold "contracts") -Destination "."
Copy-Item -Recurse -LiteralPath (Join-Path $scaffold "frontend") -Destination "."
Copy-Item -LiteralPath (Join-Path $scaffold "docker-compose.yaml") -Destination "."
```

Replace the generated root package with:

```json
{
  "name": "hecliar",
  "version": "0.1.0",
  "private": true,
  "workspaces": ["contracts", "frontend", "packages/game-logic"],
  "scripts": {
    "test": "npm run test --workspaces --if-present",
    "build": "npm run build --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present",
    "contracts:compile": "npm --workspace contracts run compile",
    "contracts:test": "npm --workspace contracts test",
    "contracts:node": "npm --workspace contracts run node:up",
    "contracts:node:down": "npm --workspace contracts run node:down"
  },
  "engines": { "node": ">=20.11.0" }
}
```

Create `packages/game-logic/package.json`:

```json
{
  "name": "@hecliar/game-logic",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "scripts": {
    "test": "vitest run",
    "build": "tsc --noEmit",
    "lint": "eslint src test"
  },
  "devDependencies": {
    "eslint": "^9.33.0",
    "typescript": "^5.9.2",
    "vitest": "^3.2.4"
  }
}
```

Create `packages/game-logic/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src", "test"]
}
```

Add these scripts to `frontend/package.json`:

```json
{
  "test": "vitest run",
  "e2e": "playwright test",
  "lint": "eslint .",
  "build": "next build"
}
```

Add pinned frontend development dependencies for `vitest@3.2.4`,
`@testing-library/react@16.3.0`, `@testing-library/jest-dom@6.6.4`,
`jsdom@26.1.0`, and `@playwright/test@1.54.2`.

Create `frontend/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { environment: "jsdom", setupFiles: ["./test/setup.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
```

Create `frontend/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

Create `frontend/playwright.config.ts`:

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

The calling task starts and stops the local Inco node explicitly before
Playwright.

Pin both Inco npm packages and both Docker images to `1.0.2`. Remove generated token/lottery examples only after the untouched scaffold has compiled and tested.

- [ ] **Step 6: Install and verify GREEN**

Run:

```powershell
npm install
node scripts/workspace-shape.test.mjs
npm run contracts:compile
npm run contracts:test
npm --workspace frontend run build
```

Expected: shape test PASS; contract compile/tests and frontend build exit 0.

- [ ] **Step 7: Record provenance**

Append the exact `create-inco-app` version and generated paths to `THIRD_PARTY_NOTICES.md`, identifying them as official Inco scaffold output and preserving its detected license notices.

Create `docs/privacy-map.md` with the verified Inco versions and this matrix:

| Secret | Authorized before challenge | Public reveal | Publicly verifiable result |
| --- | --- | --- | --- |
| Seat 0 dice | Seat 0 wallet and contract | Both rolls at challenge | Each die attestation is bound to its handle |
| Seat 1/robot dice | Seat 1/robot wallet and contract | Both rolls at challenge | Each die attestation is bound to its handle |
| Gadget assignment | Owner wallet and contract | Never directly | Applied effect code only |
| Gadget target | Owner wallet and contract | Never directly | Applied effect code only |
| Scanner result | Owner wallet and contract | Never | No public result; owner access is checked onchain |
| Effective count | Contract | Challenge settlement | Attestation bound to the computed count handle |

The page states that allowances are irreversible, every stored handle needs
`allowThis`, `e.reveal` is irreversible, the robot is never allowed human
handles, and settlement verifies exact handles before scoring.

- [ ] **Step 8: Commit**

```powershell
git add package.json package-lock.json docker-compose.yaml contracts frontend packages scripts .gitignore THIRD_PARTY_NOTICES.md docs/privacy-map.md
git commit -m "build: scaffold official Inco monorepo"
```

### Task 2: Pure Rules and Scoring

**Files:**
- Create: `packages/game-logic/src/types.ts`
- Create: `packages/game-logic/src/settings.ts`
- Create: `packages/game-logic/src/bids.ts`
- Create: `packages/game-logic/src/resolution.ts`
- Create: `packages/game-logic/src/index.ts`
- Test: `packages/game-logic/test/settings.test.ts`
- Test: `packages/game-logic/test/bids.test.ts`
- Test: `packages/game-logic/test/resolution.test.ts`

**Interfaces:**
- Consumes: none beyond the stable types in this plan
- Produces: `parseDiceCount`, `isHigherBid`, `legalRaises`, `countFace`, `resolveChallenge`, `applyRoundWin`, and all stable domain types

- [ ] **Step 1: Write failing settings tests**

```ts
// packages/game-logic/test/settings.test.ts
import { describe, expect, it } from "vitest";
import { DEFAULT_DICE_COUNT, parseDiceCount } from "../src/settings";

describe("dice settings", () => {
  it("defaults to four dice", () => expect(DEFAULT_DICE_COUNT).toBe(4));

  it.each([3, 4, 5, 6])("accepts %i dice", (value) => {
    expect(parseDiceCount(value)).toBe(value);
  });

  it.each([2, 7, 4.5, "4"])("rejects %p", (value) => {
    expect(() => parseDiceCount(value)).toThrow("dice count must be an integer from 3 through 6");
  });
});
```

Run `npm --workspace @hecliar/game-logic test -- settings.test.ts`.

Expected: FAIL because `../src/settings` does not exist.

- [ ] **Step 2: Implement bounded settings**

```ts
// packages/game-logic/src/settings.ts
import type { DiceCount } from "./types";

export const DEFAULT_DICE_COUNT: DiceCount = 4;

export function parseDiceCount(value: unknown): DiceCount {
  if (!Number.isInteger(value) || Number(value) < 3 || Number(value) > 6) {
    throw new RangeError("dice count must be an integer from 3 through 6");
  }
  return value as DiceCount;
}
```

Add the exact stable type definitions from “Stable Cross-Task Interfaces” to `types.ts`.

Run `npm --workspace @hecliar/game-logic test -- settings.test.ts`.

Expected: PASS.

- [ ] **Step 3: Write failing bid-order tests**

```ts
// packages/game-logic/test/bids.test.ts
import { describe, expect, it } from "vitest";
import { isHigherBid, legalRaises } from "../src/bids";
import type { Bid } from "../src/types";

const current: Bid = { quantity: 2, face: 5, bidder: 0, sequence: 1 };

describe("bid ordering", () => {
  it.each([
    [{ quantity: 2, face: 6 }, true],
    [{ quantity: 3, face: 1 }, true],
    [{ quantity: 2, face: 5 }, false],
    [{ quantity: 2, face: 4 }, false],
    [{ quantity: 1, face: 6 }, false],
  ] as const)("%o higher=%s", (candidate, expected) => {
    expect(isHigherBid(current, candidate)).toBe(expected);
  });

  it("enumerates every and only legal raise for eight dice", () => {
    const raises = legalRaises(current, 4);
    expect(raises).toHaveLength(37);
    expect(raises).toContainEqual({ quantity: 2, face: 6 });
    expect(raises).toContainEqual({ quantity: 8, face: 6 });
    expect(raises).not.toContainEqual({ quantity: 2, face: 5 });
  });
});
```

Run `npm --workspace @hecliar/game-logic test -- bids.test.ts`.

Expected: FAIL because `isHigherBid` and `legalRaises` do not exist.

- [ ] **Step 4: Implement bid ordering and enumeration**

```ts
// packages/game-logic/src/bids.ts
import type { Bid, DiceCount, DieFace } from "./types";

type CandidateBid = Readonly<{ quantity: number; face: DieFace }>;

export function isHigherBid(current: Bid, next: CandidateBid): boolean {
  return next.quantity > current.quantity
    || (next.quantity === current.quantity && next.face > current.face);
}

export function legalRaises(current: Bid | null, diceCount: DiceCount): CandidateBid[] {
  const result: CandidateBid[] = [];
  for (let quantity = 1; quantity <= diceCount * 2; quantity += 1) {
    for (let face = 1; face <= 6; face += 1) {
      const candidate = { quantity, face: face as DieFace };
      if (current === null || isHigherBid(current, candidate)) result.push(candidate);
    }
  }
  return result;
}
```

Run `npm --workspace @hecliar/game-logic test -- bids.test.ts`.

Expected: PASS with 37 legal raises after `2 × 5` in an eight-die match.

- [ ] **Step 5: Write failing resolution and score tests**

```ts
// packages/game-logic/test/resolution.test.ts
import { describe, expect, it } from "vitest";
import { applyRoundWin, resolveChallenge } from "../src/resolution";

describe("challenge resolution", () => {
  it("awards a truthful bid to the bidder without wild ones", () => {
    const result = resolveChallenge(
      [[5, 1, 5, 2], [5, 3, 4, 6]],
      { quantity: 3, face: 5, bidder: 0, sequence: 4 },
      [],
    );
    expect(result).toMatchObject({ baseCount: 3, effectiveCount: 3, winner: 0 });
  });

  it("awards a false bid to the challenger", () => {
    const result = resolveChallenge(
      [[5, 1, 2, 2], [5, 3, 4, 6]],
      { quantity: 3, face: 5, bidder: 0, sequence: 4 },
      [],
    );
    expect(result).toMatchObject({ effectiveCount: 2, winner: 1 });
  });
});

describe("best of three", () => {
  it("ends exactly at two wins", () => {
    expect(applyRoundWin([1, 1], 0)).toEqual({ score: [2, 1], matchWinner: 0 });
  });
});
```

Run `npm --workspace @hecliar/game-logic test -- resolution.test.ts`.

Expected: FAIL because the resolution module does not exist.

- [ ] **Step 6: Implement resolution**

```ts
// packages/game-logic/src/resolution.ts
import type { Bid, DieFace, GadgetKind, Seat } from "./types";

export type AppliedGadget = Readonly<{
  owner: Seat;
  kind: Exclude<GadgetKind, "scanner">;
  target: number;
}>;

export function countFace(rolls: readonly (readonly DieFace[])[], face: DieFace): number {
  return rolls.flat().filter((die) => die === face).length;
}

export function resolveChallenge(
  rolls: readonly [readonly DieFace[], readonly DieFace[]],
  bid: Bid,
  gadgets: readonly AppliedGadget[],
) {
  const baseCount = countFace(rolls, bid.face);
  let effectiveCount = baseCount;
  const effects: { owner: Seat; kind: AppliedGadget["kind"]; delta: number }[] = [];

  for (const gadget of gadgets) {
    const targetSeat = gadget.kind === "echo" ? gadget.owner : ((1 - gadget.owner) as Seat);
    const matches = rolls[targetSeat][gadget.target] === bid.face;
    const delta = matches ? (gadget.kind === "echo" ? 1 : -1) : 0;
    effectiveCount += delta;
    effects.push({ owner: gadget.owner, kind: gadget.kind, delta });
  }

  const challenger = (1 - bid.bidder) as Seat;
  const winner = (effectiveCount >= bid.quantity ? bid.bidder : challenger) as Seat;
  return { baseCount, effectiveCount, winner, effects };
}

export function applyRoundWin(score: readonly [number, number], winner: Seat) {
  const next: [number, number] = [score[0], score[1]];
  next[winner] += 1;
  return { score: next, matchWinner: next[winner] === 2 ? winner : null };
}
```

Run:

```powershell
npm --workspace @hecliar/game-logic test
npm --workspace @hecliar/game-logic run build
```

Expected: all settings, bid, and resolution tests PASS; TypeScript exits 0.

- [ ] **Step 7: Export the stable API and commit**

```ts
// packages/game-logic/src/index.ts
export * from "./types";
export * from "./settings";
export * from "./bids";
export * from "./resolution";
```

```powershell
git add packages/game-logic
git commit -m "feat: define Hecliar rules and scoring"
```

### Task 3: Rule-Based Robot and Simulations

**Files:**
- Create: `packages/game-logic/src/robot.ts`
- Test: `packages/game-logic/test/robot.test.ts`
- Modify: `packages/game-logic/src/index.ts`

**Interfaces:**
- Consumes: `Bid`, `DiceCount`, `DieFace`, `Difficulty`, `GadgetKind`, `legalRaises`
- Produces: `RobotObservation`, `RobotAction`, `SeededRandom`, `probabilityBidIsTrue`, `chooseRobotAction`, `isLegalRobotAction`

- [ ] **Step 1: Write failing probability and legality tests**

```ts
// packages/game-logic/test/robot.test.ts
import { describe, expect, it } from "vitest";
import {
  SeededRandom,
  chooseRobotAction,
  getRobotProfile,
  isLegalRobotAction,
  probabilityBidIsTrue,
  type RobotObservation,
} from "../src/robot";

const observation = (difficulty: RobotObservation["difficulty"], seed: number): RobotObservation => ({
  matchId: 1n,
  difficulty,
  ownDice: [5, 5, 2, 1],
  dicePerSide: 4,
  currentBid: { quantity: 3, face: 5, bidder: 0, sequence: 3 },
  publicHistory: [],
  scores: [0, 0],
  gadget: null,
  random: new SeededRandom(seed),
});

describe("robot probability", () => {
  it("uses only own dice and four unknown human dice", () => {
    expect(probabilityBidIsTrue(observation("medium", 1))).toBeCloseTo(1 - (5 / 6) ** 4, 8);
  });
});

describe.each(["easy", "medium", "hard"] as const)("%s robot", (difficulty) => {
  it("returns legal actions for 100 simulated positions", () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      const view = observation(difficulty, seed);
      expect(isLegalRobotAction(view, chooseRobotAction(view))).toBe(true);
    }
  });
});

it("challenges when the current bid has no legal raise", () => {
  const view = {
    ...observation("easy", 9),
    currentBid: { quantity: 8, face: 6 as const, bidder: 0 as const, sequence: 8 },
  };
  expect(chooseRobotAction(view)).toEqual({ type: "challenge" });
});
```

Run `npm --workspace @hecliar/game-logic test -- robot.test.ts`.

Expected: FAIL because the robot module does not exist.

- [ ] **Step 2: Implement the narrow robot observation**

```ts
// packages/game-logic/src/robot.ts
import { legalRaises } from "./bids";
import type { Bid, DiceCount, DieFace, Difficulty, GadgetKind, Seat } from "./types";

export type RobotAction =
  | Readonly<{ type: "raise"; bid: { quantity: number; face: DieFace } }>
  | Readonly<{ type: "challenge" }>
  | Readonly<{ type: "use-gadget"; target: number }>;

export type RobotObservation = Readonly<{
  matchId: bigint;
  difficulty: Difficulty;
  ownDice: readonly DieFace[];
  dicePerSide: DiceCount;
  currentBid: Bid | null;
  publicHistory: readonly Readonly<{ actor: Seat; type: "raise" | "challenge" | "use-gadget" }>[];
  scores: readonly [number, number];
  gadget: Readonly<{ kind: GadgetKind; used: boolean }> | null;
  random: SeededRandom;
}>;

export class SeededRandom {
  constructor(private state: number) {}
  next(): number {
    this.state = (this.state * 1664525 + 1013904223) >>> 0;
    return this.state / 0x1_0000_0000;
  }
}
```

The type contains no human roll or human handle. Do not add an optional escape hatch for either.

- [ ] **Step 3: Implement probability, profiles, and legal selection**

```ts
const PROFILES = {
  easy: { challengeBelow: 0.08, bluffChance: 0.03, maxBluffQuantity: 0, gadgets: false },
  medium: { challengeBelow: 0.24, bluffChance: 0.14, maxBluffQuantity: 1, gadgets: false },
  hard: { challengeBelow: 0.38, bluffChance: 0.24, maxBluffQuantity: 2, gadgets: true },
} as const;

export const getRobotProfile = (difficulty: Difficulty) => PROFILES[difficulty];

function choose(n: number, k: number): number {
  let result = 1;
  for (let i = 1; i <= k; i += 1) result = result * (n - i + 1) / i;
  return result;
}

function binomialTail(n: number, minimum: number, p: number): number {
  if (minimum <= 0) return 1;
  if (minimum > n) return 0;
  let total = 0;
  for (let hits = minimum; hits <= n; hits += 1) {
    total += choose(n, hits) * p ** hits * (1 - p) ** (n - hits);
  }
  return total;
}

export function probabilityBidIsTrue(view: RobotObservation): number {
  if (!view.currentBid) return 1;
  const ownMatches = view.ownDice.filter((die) => die === view.currentBid?.face).length;
  return binomialTail(view.dicePerSide, view.currentBid.quantity - ownMatches, 1 / 6);
}

export function isLegalRobotAction(view: RobotObservation, action: RobotAction): boolean {
  if (action.type === "challenge") return view.currentBid !== null;
  if (action.type === "use-gadget") {
    return Boolean(view.gadget && !view.gadget.used
      && action.target >= 0 && action.target < view.dicePerSide);
  }
  return legalRaises(view.currentBid, view.dicePerSide)
    .some((bid) => bid.quantity === action.bid.quantity && bid.face === action.bid.face);
}

export function chooseRobotAction(view: RobotObservation): RobotAction {
  const profile = PROFILES[view.difficulty];
  const probability = probabilityBidIsTrue(view);
  if (view.currentBid && probability < profile.challengeBelow) return { type: "challenge" };

  if (profile.gadgets && view.gadget && !view.gadget.used && view.random.next() < 0.18) {
    return { type: "use-gadget", target: Math.floor(view.random.next() * view.dicePerSide) };
  }

  const raises = legalRaises(view.currentBid, view.dicePerSide);
  if (raises.length === 0) return { type: "challenge" };
  const supported = raises.filter((bid) => {
    const own = view.ownDice.filter((die) => die === bid.face).length;
    return bid.quantity <= own + profile.maxBluffQuantity;
  });
  const pool = supported.length > 0 && view.random.next() >= profile.bluffChance ? supported : raises;
  return { type: "raise", bid: pool[Math.floor(view.random.next() * pool.length)] };
}
```

- [ ] **Step 4: Verify the simulation and distinct profiles**

Add this test:

```ts
it("uses strictly different documented difficulty thresholds", () => {
  const easy = getRobotProfile("easy");
  const medium = getRobotProfile("medium");
  const hard = getRobotProfile("hard");
  expect(easy.challengeBelow).toBeLessThan(medium.challengeBelow);
  expect(medium.challengeBelow).toBeLessThan(hard.challengeBelow);
  expect(easy.bluffChance).toBeLessThan(medium.bluffChance);
  expect(medium.bluffChance).toBeLessThan(hard.bluffChance);
  expect(easy.gadgets).toBe(false);
  expect(hard.gadgets).toBe(true);
});
```

Run:

```powershell
npm --workspace @hecliar/game-logic test -- robot.test.ts
npm --workspace @hecliar/game-logic test
```

Expected: every 100-position legality simulation PASS and profile thresholds
are strictly ordered.

- [ ] **Step 5: Export and commit**

```ts
// add to packages/game-logic/src/index.ts
export * from "./robot";
```

```powershell
git add packages/game-logic
git commit -m "feat: add deterministic robot strategies"
```

### Task 4: Complete Local Single-Player Vertical Slice

**Files:**
- Create: `packages/game-logic/src/local-game.ts`
- Test: `packages/game-logic/test/local-game.test.ts`
- Modify: `packages/game-logic/src/index.ts`
- Create: `frontend/lib/game/gateway.ts`
- Create: `frontend/hooks/useGameGateway.tsx`
- Create: `frontend/components/setup/MatchSetup.tsx`
- Create: `frontend/components/game/DiceTray.tsx`
- Create: `frontend/components/game/BidControls.tsx`
- Create: `frontend/components/game/ActionStatus.tsx`
- Create: `frontend/components/game/RoundResult.tsx`
- Create: `frontend/components/game/MatchResult.tsx`
- Create: `frontend/components/game/GameTable.tsx`
- Create: `frontend/app/play/robot/page.tsx`
- Create: `frontend/app/match/[matchId]/page.tsx`
- Test: `frontend/test/MatchSetup.test.tsx`
- Test: `frontend/test/GameTable.test.tsx`

**Interfaces:**
- Consumes: `GameGateway`, pure rules, scoring, and robot strategy
- Produces: `LocalGameGateway`, `GameGatewayProvider`, setup route, and a complete in-browser Robot best-of-three loop that later swaps to `ChainGameGateway`

- [ ] **Step 1: Write failing local gateway tests**

```ts
// packages/game-logic/test/local-game.test.ts
import { describe, expect, it } from "vitest";
import { LocalGameGateway } from "../src/local-game";

describe("local Robot match", () => {
  it.each([3, 4, 5, 6] as const)("creates fresh rolls with %i dice per side", async (diceCount) => {
    const gateway = new LocalGameGateway({ rolls: [[1, 2, 3, 4, 5, 6], [6, 5, 4, 3, 2, 1]] });
    const matchId = await gateway.createRobotMatch({
      mode: "robot", diceCount, gadgetsEnabled: false, difficulty: "easy",
    });
    expect((await gateway.getPrivatePlayer(matchId)).ownDice).toHaveLength(diceCount);
    expect((await gateway.getPublicMatch(matchId)).settings.diceCount).toBe(diceCount);
  });

  it("plays and rematches a first-to-two match with fresh rolls", async () => {
    const gateway = new LocalGameGateway({
      rolls: [
        [5, 5, 2, 1], [5, 3, 4, 6],
        [2, 2, 2, 2], [1, 3, 4, 6],
        [6, 6, 1, 2], [3, 3, 4, 5],
      ],
      robotActions: [{ type: "raise", bid: { quantity: 8, face: 6 } }],
    });
    const id = await gateway.createRobotMatch({
      mode: "robot", diceCount: 4, gadgetsEnabled: false, difficulty: "easy",
    });
    await gateway.raise(id, { quantity: 3, face: 5 }, 0);
    await gateway.challenge(id, 1);
    await gateway.settleChallenge(id, 2);
    expect((await gateway.getPublicMatch(id)).score).toEqual([1, 0]);
    await gateway.continueMatch(id, 3);
    await gateway.requestRobotAction(id, 4);
    await gateway.challenge(id, 5);
    await gateway.settleChallenge(id, 6);
    expect((await gateway.getPublicMatch(id)).score).toEqual([2, 0]);
    await gateway.acceptRematch(id);
    expect((await gateway.getPublicMatch(id)).score).toEqual([0, 0]);
    expect((await gateway.getPrivatePlayer(id)).ownDice).toEqual([6, 6, 1, 2]);
  });
});
```

Run `npm --workspace @hecliar/game-logic test -- local-game.test.ts`.

Expected: FAIL because `LocalGameGateway` does not exist.

- [ ] **Step 2: Implement the deterministic local gateway**

`LocalGameGateway` must implement the stable `GameGateway` interface and keep two separate internal projections:

```ts
type LocalSecret = {
  rolls: [DieFace[], DieFace[]];
  gadget: [GadgetKind | null, GadgetKind | null];
  scannerResult: [boolean | null, boolean | null];
};

type LocalRecord = {
  publicView: PublicMatchView;
  secret: LocalSecret;
  result: {
    rolls: [DieFace[], DieFace[]];
    baseCount: number;
    effectiveCount: number;
    winner: Seat;
  } | null;
};
```

Use injected `rolls` and optional legal `robotActions` queues in tests and
`crypto.getRandomValues` plus `chooseRobotAction` in local development.
`getPublicMatch` must clone only `publicView`; `getPrivatePlayer` returns seat 0
only. `challenge` records the pure `resolveChallenge` result and moves to
`resolving-challenge`; `settleChallenge` applies exactly one score;
`continueMatch` alternates the starter and consumes fresh rolls;
`requestRobotAction` accepts only a queued or strategy-generated legal action
when seat 1 is active; `acceptRematch` requires `match-complete`, resets score,
and consumes fresh queued rolls.

Export it from `packages/game-logic/src/index.ts`.

Run `npm --workspace @hecliar/game-logic test -- local-game.test.ts`.

Expected: PASS.

- [ ] **Step 3: Write failing setup UI tests**

```tsx
// frontend/test/MatchSetup.test.tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MatchSetup } from "@/components/setup/MatchSetup";

it("defaults to four dice and starts with selected settings", async () => {
  const onStart = vi.fn();
  render(<MatchSetup mode="robot" onStart={onStart} />);
  expect(screen.getByLabelText("Dice per side")).toHaveValue(4);
  fireEvent.click(screen.getByRole("button", { name: "5 dice" }));
  fireEvent.click(screen.getByRole("radio", { name: "Medium" }));
  fireEvent.click(screen.getByRole("button", { name: "Start match" }));
  expect(onStart).toHaveBeenCalledWith({
    mode: "robot", diceCount: 5, difficulty: "medium", gadgetsEnabled: false,
  });
});
```

Run `npm --workspace frontend test -- MatchSetup.test.tsx`.

Expected: FAIL because `MatchSetup` does not exist.

- [ ] **Step 4: Implement setup with legal 3–6 controls**

```tsx
// frontend/components/setup/MatchSetup.tsx
"use client";

import { useState } from "react";
import { DEFAULT_DICE_COUNT, type Difficulty, type MatchSettings } from "@hecliar/game-logic";

export function MatchSetup({
  mode,
  onStart,
}: {
  mode: "robot" | "friend";
  onStart(settings: MatchSettings): void;
}) {
  const [diceCount, setDiceCount] = useState<3 | 4 | 5 | 6>(DEFAULT_DICE_COUNT);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [gadgetsEnabled, setGadgetsEnabled] = useState(mode === "friend");

  return (
    <form onSubmit={(event) => {
      event.preventDefault();
      onStart({ mode, diceCount, gadgetsEnabled, ...(mode === "robot" ? { difficulty } : {}) });
    }}>
      <output aria-label="Dice per side">{diceCount}</output>
      <div role="group" aria-label="Choose dice count">
        {([3, 4, 5, 6] as const).map((count) => (
          <button type="button" key={count} onClick={() => setDiceCount(count)}>{count} dice</button>
        ))}
      </div>
      {mode === "robot" && (
        <fieldset>
          <legend>Robot difficulty</legend>
          {(["easy", "medium", "hard"] as const).map((value) => (
            <label key={value}>
              <input
                type="radio"
                name="difficulty"
                checked={difficulty === value}
                onChange={() => setDifficulty(value)}
              />
              {value[0].toUpperCase() + value.slice(1)}
            </label>
          ))}
        </fieldset>
      )}
      <label>
        <input type="checkbox" checked={gadgetsEnabled} onChange={(event) => setGadgetsEnabled(event.target.checked)} />
        Enable secret gadgets
      </label>
      <button type="submit">Start match</button>
    </form>
  );
}
```

Run `npm --workspace frontend test -- MatchSetup.test.tsx`.

Expected: PASS.

- [ ] **Step 5: Write failing game-table behavior tests**

```tsx
// frontend/test/GameTable.test.tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GameTable } from "@/components/game/GameTable";

const publicMatch = {
  matchId: 1n,
  status: "active-turn" as const,
  players: ["0x0000000000000000000000000000000000000001", "0x0000000000000000000000000000000000000002"] as const,
  settings: { mode: "robot" as const, diceCount: 4 as const, gadgetsEnabled: false, difficulty: "easy" as const },
  activeSeat: 0 as const,
  startingSeat: 0 as const,
  currentBid: { quantity: 2, face: 5 as const, bidder: 1 as const, sequence: 3 },
  score: [0, 0] as const,
  round: 1,
  actionSequence: 3,
  actionDeadline: 1_900_000_000,
  abandonmentDeadline: 1_900_000_075,
  rematchAccepted: [false, false] as const,
};

it("shows only own dice and disables an illegal equal bid", () => {
  const raise = vi.fn();
  render(
    <GameTable
      publicMatch={publicMatch}
      privatePlayer={{ ownDice: [5, 2, 1, 6], gadget: null, scannerResult: null }}
      onRaise={raise}
      onChallenge={vi.fn()}
      onUseGadget={vi.fn()}
    />,
  );
  expect(screen.getByText("Your dice")).toBeVisible();
  expect(screen.getAllByTestId("own-die")).toHaveLength(4);
  expect(screen.getByText("4 hidden dice")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Quantity 2" }));
  fireEvent.click(screen.getByRole("button", { name: "Face 5" }));
  expect(screen.getByRole("button", { name: "Raise" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Challenge" })).toBeEnabled();
});
```

Run `npm --workspace frontend test -- GameTable.test.tsx`.

Expected: FAIL because the table components do not exist.

- [ ] **Step 6: Implement the table as focused components**

`DiceTray` renders its `dice` prop only when `visibility === "owner"` or `visibility === "revealed"`; otherwise it renders exactly `"{count} hidden dice"` and never accepts a hidden roll prop.

`BidControls` derives choices from `legalRaises(publicMatch.currentBid, publicMatch.settings.diceCount)`. Its callback is:

```ts
type RaiseHandler = (bid: { quantity: number; face: DieFace }) => Promise<void> | void;
```

`GameTable` receives only `PublicMatchView` and the connected player's `PrivatePlayerView`. It renders:

```tsx
<main aria-label="Hecliar game table">
  <section aria-label="Opponent">
    <DiceTray visibility="hidden" count={publicMatch.settings.diceCount} />
  </section>
  <ActionStatus status={publicMatch.status} activeSeat={publicMatch.activeSeat} />
  <section aria-label="Your hand">
    <DiceTray visibility="owner" dice={privatePlayer.ownDice} count={privatePlayer.ownDice.length} />
    <BidControls match={publicMatch} onRaise={onRaise} onChallenge={onChallenge} />
  </section>
</main>
```

`RoundResult` requires revealed rolls, challenged bid, base count, gadget deltas, effective count, and winner. `MatchResult` exposes Rematch and Home.

Run:

```powershell
npm --workspace frontend test -- GameTable.test.tsx
npm --workspace frontend test
```

Expected: UI tests PASS.

- [ ] **Step 7: Wire the local Robot routes through the gateway**

`frontend/lib/game/gateway.ts` re-exports the stable `GameGateway`. `GameGatewayProvider` accepts a gateway prop for tests and uses one `LocalGameGateway` singleton only when `NEXT_PUBLIC_GAME_TRANSPORT=local`.

`/play/robot` calls `createRobotMatch`, persists only the returned match ID, and navigates to `/match/{id}`. `/match/[matchId]` loads public and authorized private state, handles Raise/Challenge/settlement, triggers robot actions after an 800–1800 ms presentation delay, and continues until score 2.

The local robot action must call `chooseRobotAction`; it must not inspect the human roll stored in `LocalRecord.secret.rolls[0]`.

- [ ] **Step 8: Verify the complete local slice**

Run:

```powershell
npm --workspace @hecliar/game-logic test
npm --workspace frontend test
npm --workspace frontend run build
```

Manually exercise one four-dice Robot match in local transport and confirm the player can raise, challenge, see evidence, reach two wins, and rematch.

Expected: all automated checks PASS; production build exits 0.

- [ ] **Step 9: Commit**

```powershell
git add packages/game-logic frontend
git commit -m "feat: complete local single-player match"
```

### Task 5: Confidential Contract Foundation and Private Rolls

**Files:**
- Create: `contracts/contracts/libraries/HecliarTypes.sol`
- Create: `contracts/contracts/libraries/BidRules.sol`
- Create: `contracts/contracts/HecliarGame.sol`
- Create: `contracts/test/BidRules.test.ts`
- Create: `contracts/test/HecliarGame.rooms.test.ts`
- Create: `contracts/test/HecliarGame.confidential.test.ts`
- Create: `contracts/test/helpers/inco.ts`
- Create: `contracts/test/helpers/HecliarGameHarness.sol`
- Create: `contracts/ignition/modules/HecliarGame.ts`
- Remove: generated example contracts and their tests after the official baseline passes

**Interfaces:**
- Consumes: official Inco `euint256`, `ebool`, `e`, `inco`; stable match types
- Produces: room and Robot match creation, readiness, exact per-player fee funding, confidential roll/gadget generation, public snapshots, owner-scoped handle views

- [ ] **Step 1: Write failing pure onchain bid-rule tests**

```ts
// contracts/test/BidRules.test.ts
import { expect } from "chai";
import hre from "hardhat";

describe("BidRules", function () {
  it("accepts only the PRD ordering", async function () {
    const harness = await hre.viem.deployContract("BidRulesHarness");
    expect(await harness.read.isHigher([2, 5, 2, 6])).to.equal(true);
    expect(await harness.read.isHigher([2, 5, 3, 1])).to.equal(true);
    expect(await harness.read.isHigher([2, 5, 2, 5])).to.equal(false);
    expect(await harness.read.isHigher([2, 5, 2, 4])).to.equal(false);
  });
});
```

Create the test-only harness in `contracts/test/helpers/BidRulesHarness.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
import {BidRules} from "../../contracts/libraries/BidRules.sol";

contract BidRulesHarness {
    function isHigher(uint8 currentQuantity, uint8 currentFace, uint8 nextQuantity, uint8 nextFace)
        external pure returns (bool)
    {
        return BidRules.isHigher(currentQuantity, currentFace, nextQuantity, nextFace);
    }
}
```

Run `npm --workspace contracts test -- --grep "BidRules"`.

Expected: FAIL because `BidRules.sol` does not exist.

- [ ] **Step 2: Implement `BidRules.sol`**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

library BidRules {
    function isHigher(uint8 currentQuantity, uint8 currentFace, uint8 nextQuantity, uint8 nextFace)
        internal pure returns (bool)
    {
        return nextQuantity > currentQuantity
            || (nextQuantity == currentQuantity && nextFace > currentFace);
    }

    function isInBounds(uint8 quantity, uint8 face, uint8 diceCount)
        internal pure returns (bool)
    {
        return quantity >= 1 && quantity <= diceCount * 2 && face >= 1 && face <= 6;
    }
}
```

Run `npm --workspace contracts test -- --grep "BidRules"`.

Expected: PASS.

- [ ] **Step 3: Define exact Solidity state and errors**

`HecliarTypes.sol` must define:

```solidity
enum Mode { Robot, Friend }
enum MatchStatus {
    WaitingForPlayer,
    WaitingForReady,
    Rolling,
    ActiveTurn,
    ResolvingChallenge,
    RoundComplete,
    MatchComplete,
    Cancelled
}
enum GadgetKind { Echo, Jammer, Scanner }

struct Bid {
    uint8 quantity;
    uint8 face;
    uint8 bidderSeat;
    uint32 sequence;
}

struct MatchPublic {
    Mode mode;
    MatchStatus status;
    address[2] players;
    uint8 diceCount;
    bool gadgetsEnabled;
    bool[2] ready;
    uint8 activeSeat;
    uint8 startingSeat;
    uint8 roundNumber;
    uint8[2] score;
    Bid currentBid;
    uint32 actionSequence;
    uint64 actionDeadline;
    uint64 abandonmentDeadline;
    bool[2] rematchAccepted;
}
```

Define custom errors with parameters: `InvalidDiceCount(uint8)`, `RoomExists(bytes32)`, `RoomNotFound(bytes32)`, `RoomExpired(bytes32)`, `RoomFull(uint256)`, `SameWallet()`, `NotPlayer(uint256,address)`, `WrongStatus(uint256,MatchStatus)`, `NotActivePlayer(uint256,address)`, `StaleSequence(uint32,uint32)`, `InvalidBid(uint8,uint8)`, `InsufficientIncoFee(uint256,uint256)`, `AlreadyReady(uint8)`, and `UnauthorizedHandleView(address,uint8)`.

- [ ] **Step 4: Write failing room and setup tests**

```ts
// contracts/test/HecliarGame.rooms.test.ts
import { expect } from "chai";
import { keccak256, stringToHex } from "viem";
import hre from "hardhat";

describe("HecliarGame rooms", function () {
  it("defaults client settings to four but accepts contract counts 3 through 6", async function () {
    const game = await hre.viem.deployContract("HecliarGame");
    for (const diceCount of [3, 4, 5, 6]) {
      const hash = keccak256(stringToHex(`room-${diceCount}`));
      await game.write.createRoom([hash, diceCount, true, 3600n]);
      const id = await game.read.matchByRoomHash([hash]);
      expect((await game.read.getPublicMatch([id])).diceCount).to.equal(diceCount);
    }
    await expect(game.write.createRoom([keccak256(stringToHex("bad")), 2, true, 3600n]))
      .to.be.rejectedWith("InvalidDiceCount");
  });

  it("admits one distinct guest and rejects a third wallet", async function () {
    const [host, guest, third] = await hre.viem.getWalletClients();
    const game = await hre.viem.deployContract("HecliarGame");
    const hash = keccak256(stringToHex("high-entropy-room-code"));
    await game.write.createRoom([hash, 4, true, 3600n], { account: host.account });
    await game.write.joinRoom([hash], { account: guest.account });
    await expect(game.write.joinRoom([hash], { account: third.account })).to.be.rejectedWith("RoomFull");
  });
});
```

Run `npm --workspace contracts test -- --grep "HecliarGame rooms"`.

Expected: FAIL because `HecliarGame` does not exist.

- [ ] **Step 5: Implement public match and room creation**

`HecliarGame.sol` must use monotonically increasing match IDs and mappings:

```solidity
mapping(uint256 => MatchPublic) private _matches;
mapping(bytes32 => uint256) public matchByRoomHash;
mapping(uint256 => bytes32) public roomHashByMatch;
mapping(uint256 => uint64) public roomExpiry;
uint256 public nextMatchId = 1;
```

Implement:

```solidity
function createRoom(bytes32 roomHash, uint8 diceCount, bool gadgetsEnabled, uint64 ttl)
    external returns (uint256 matchId);
function inspectRoom(bytes32 roomHash) external view returns (uint256 matchId, MatchPublic memory state, uint64 expiresAt);
function joinRoom(bytes32 roomHash) external returns (uint256 matchId);
function createRobotMatch(uint8 diceCount, bool gadgetsEnabled, address robot)
    external payable returns (uint256 matchId);
function getPublicMatch(uint256 matchId) external view returns (MatchPublic memory);
```

`createRoom` sets host seat 0, `WaitingForPlayer`, and an expiry no more than 24 hours. `joinRoom` seats a distinct guest at seat 1 and moves to `WaitingForReady`.

Run `npm --workspace contracts test -- --grep "HecliarGame rooms"`.

Expected: PASS.

- [ ] **Step 6: Write failing exact-assignment and access tests**

```ts
// contracts/test/HecliarGame.confidential.test.ts
import { expect } from "chai";
import { zeroHash } from "viem";
import hre from "hardhat";

describe("HecliarGame confidential rounds", function () {
  for (const diceCount of [3, 4, 5, 6] as const) {
    it(`creates ${diceCount} confidential dice per side`, async function () {
      const fixture = await createRobotFixture({ diceCount, gadgetsEnabled: false });
      expect(nonZero(fixture.humanHandles.dice)).to.have.length(diceCount);
      expect(nonZero(fixture.robotHandles.dice)).to.have.length(diceCount);
    });
  }

  it("creates exactly diceCount roll handles and one gadget handle for each enabled side", async function () {
    const [human, robot] = await hre.viem.getWalletClients();
    const game = await hre.viem.deployContract("HecliarGame");
    const fee = await game.read.requiredRoundFee([4, true]);
    await game.write.createRobotMatch([4, true, robot.account.address], {
      account: human.account,
      value: fee,
    });
    const humanHandles = await game.read.getMyRoundHandles([1n], { account: human.account });
    const robotHandles = await game.read.getMyRoundHandles([1n], { account: robot.account });
    expect(humanHandles.dice.filter((h) => h !== zeroHash)).to.have.length(4);
    expect(robotHandles.dice.filter((h) => h !== zeroHash)).to.have.length(4);
    expect(humanHandles.gadget).not.to.equal(zeroHash);
    expect(robotHandles.gadget).not.to.equal(zeroHash);
  });

  it("rejects an opponent handle view before resolution", async function () {
    const [human, robot] = await hre.viem.getWalletClients();
    const game = await hre.viem.deployContract("HecliarGame");
    const fee = await game.read.requiredRoundFee([4, false]);
    await game.write.createRobotMatch([4, false, robot.account.address], {
      account: human.account,
      value: fee,
    });
    await expect(game.read.getRoundHandlesForSeat([1n, 1], { account: human.account }))
      .to.be.rejectedWith("UnauthorizedHandleView");
  });
});
```

Define the shared helpers in `contracts/test/helpers/inco.ts`:

```ts
import { zeroHash, type Hex, type WalletClient } from "viem";
import hre from "hardhat";

export const nonZero = (handles: readonly Hex[]) =>
  handles.filter((handle) => handle !== zeroHash);

export async function createRobotFixture(
  options: { diceCount: 3 | 4 | 5 | 6; gadgetsEnabled: boolean },
) {
  const [human, robot, unrelated] = await hre.viem.getWalletClients();
  const game = await hre.viem.deployContract("HecliarGame");
  const roundFee = await game.read.requiredRoundFee([
    options.diceCount,
    options.gadgetsEnabled,
  ]);
  const publicClient = await hre.viem.getPublicClient();
  const startBlock = await publicClient.getBlockNumber();
  await game.write.createRobotMatch(
    [options.diceCount, options.gadgetsEnabled, robot.account.address],
    { account: human.account, value: roundFee },
  );
  return {
    game,
    human,
    robot,
    unrelated,
    roundFee,
    startBlock,
    publicClient,
    humanHandles: await game.read.getMyRoundHandles([1n], { account: human.account }),
    robotHandles: await game.read.getMyRoundHandles([1n], { account: robot.account }),
  };
}

export const activeRobotFixture = (
  options: { diceCount?: 3 | 4 | 5 | 6; gadgetsEnabled?: boolean } = {},
) => createRobotFixture({
  diceCount: options.diceCount ?? 4,
  gadgetsEnabled: options.gadgetsEnabled ?? false,
});

type RobotFixture = Awaited<ReturnType<typeof createRobotFixture>>;

export async function decryptOwnerRoll(
  fixture: RobotFixture,
  owner: WalletClient,
) {
  const handles = await fixture.game.read.getMyRoundHandles([1n], {
    account: owner.account,
  });
  const zap = await getTestLightning();
  const results = await zap.attestedDecrypt(owner, nonZero(handles.dice));
  return results.map((result) => Number(result.plaintext.value) as 1 | 2 | 3 | 4 | 5 | 6);
}

export async function revealAndPack(
  game: RobotFixture["game"],
  matchId: bigint,
) {
  const handles = await game.read.getChallengeHandles([matchId]);
  const zap = await getTestLightning();
  const revealed = await zap.attestedReveal(nonZero([
    ...handles.dice,
    handles.effectiveCount,
    ...handles.effectCodes,
  ]));
  return packByHandleOrder(handles, revealed);
}
```

`getTestLightning` initializes `Lightning.localNode("mainnet")`.
`packByHandleOrder` maps each attestation back to its requested handle and
returns the exact `ChallengeSettlement` field order; it throws if any handle is
missing, duplicated, or has no covalidator signatures.

Run the local Inco node, then:

```powershell
npm run contracts:node
npm --workspace contracts test -- --network anvil --grep "confidential rounds"
```

Expected: FAIL because round fee, generation, and scoped handle views do not exist.

- [ ] **Step 7: Implement fee calculation and confidential generation**

Import only verified `1.0.2` symbols:

```solidity
import {euint256, ebool, e, inco} from "@inco/lightning/src/Lib.sol";
using e for *;
```

Store:

```solidity
struct RoundSecret {
    euint256[6][2] dice;
    euint256[2] gadgetKinds;
    euint256[2] gadgetTargets;
    ebool[2] scannerResults;
    ebool[2] gadgetTargetValid;
    euint256[2] disclosedEffectCodes;
    bool[2] gadgetPending;
    bool[2] gadgetArmed;
    bool[2] gadgetConsumed;
}
mapping(uint256 => RoundSecret) private _roundSecrets;
```

Implement:

```solidity
function requiredRoundFee(uint8 diceCount, bool gadgetsEnabled) public view returns (uint256) {
    uint256 operations = uint256(diceCount) * 2 + (gadgetsEnabled ? 2 : 0);
    return inco.getFee() * operations;
}
```

For each active die call an internal virtual `_randomDie()` whose production
implementation is `e.randBounded(6).add(1)`, then `allowThis` and
`allow(player)`. For every enabled side call exactly one internal virtual
`_randomGadget()` whose production implementation is `e.randBounded(3)`, then
`allowThis` and `allow(player)`. Generate no gadget handle in disabled rounds.

The test-only `HecliarGameHarness` overrides both functions with queued
`e.asEuint256` values:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
import {euint256, e} from "@inco/lightning/src/Lib.sol";
import {HecliarGame} from "../../contracts/HecliarGame.sol";

contract HecliarGameHarness is HecliarGame {
    uint256[] private _presetDice;
    uint256[] private _presetGadgets;
    uint256 private _dieCursor;
    uint256 private _gadgetCursor;

    function setPresetSecrets(uint256[] calldata dice, uint256[] calldata gadgets) external {
        _presetDice = dice;
        _presetGadgets = gadgets;
        _dieCursor = 0;
        _gadgetCursor = 0;
    }

    function _randomDie() internal override returns (euint256) {
        return e.asEuint256(_presetDice[_dieCursor++]);
    }

    function _randomGadget() internal override returns (euint256) {
        return e.asEuint256(_presetGadgets[_gadgetCursor++]);
    }
}
```

Production integration tests deploy `HecliarGame`; deterministic outcome and
gadget semantic tests deploy only `HecliarGameHarness`.

`getMyRoundHandles(matchId)` derives the caller seat and returns only its six dice handles, gadget handle, gadget-target handle, and Scanner-result handle. A seat-explicit view requires caller equality with that seat before resolution.

Run:

```powershell
npm --workspace contracts test -- --network anvil --grep "confidential rounds"
npm run contracts:node:down
```

Expected: all count and authorization tests PASS.

- [ ] **Step 8: Add deployment module and commit**

```ts
// contracts/ignition/modules/HecliarGame.ts
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("HecliarGameModule", (module) => {
  const game = module.contract("HecliarGame");
  return { game };
});
```

Run:

```powershell
npm run contracts:compile
npm run contracts:test
git add contracts
git commit -m "feat: add confidential match foundation"
```

### Task 6: Authoritative Turns, Challenge, and Best-of-Three Settlement

**Files:**
- Modify: `contracts/contracts/HecliarGame.sol`
- Modify: `contracts/contracts/libraries/HecliarTypes.sol`
- Create: `contracts/test/HecliarGame.rounds.test.ts`
- Modify: `contracts/test/helpers/inco.ts`

**Interfaces:**
- Consumes: confidential roll handles, `BidRules`, Inco equality/select/reveal/verify APIs
- Produces: `raise`, `challenge`, `settleChallenge`, `fundAndStartNextRound`, immutable `RoundResult`, exactly-once best-of-three scoring

- [ ] **Step 1: Write failing turn and bid tests**

```ts
// contracts/test/HecliarGame.rounds.test.ts
import { expect } from "chai";

describe("HecliarGame active rounds", function () {
  it("accepts every higher bid and rejects equal or lower bids", async function () {
    const { game, human, robot } = await activeRobotFixture();
    await game.write.raise([1n, 2, 5, 0], { account: human.account });
    await expect(game.write.raise([1n, 2, 4, 1], { account: robot.account }))
      .to.be.rejectedWith("InvalidBid");
    await game.write.raise([1n, 2, 6, 1], { account: robot.account });
    const state = await game.read.getPublicMatch([1n]);
    expect(state.currentBid.quantity).to.equal(2);
    expect(state.currentBid.face).to.equal(6);
    expect(state.activeSeat).to.equal(0);
  });

  it("rejects stale sequences and out-of-turn actions", async function () {
    const { game, human, robot } = await activeRobotFixture();
    await expect(game.write.raise([1n, 1, 2, 4], { account: human.account }))
      .to.be.rejectedWith("StaleSequence");
    await expect(game.write.raise([1n, 1, 2, 0], { account: robot.account }))
      .to.be.rejectedWith("NotActivePlayer");
  });
});
```

Run `npm --workspace contracts test -- --grep "active rounds"`.

Expected: FAIL because `raise` does not exist.

- [ ] **Step 2: Implement authoritative Raise**

Implement:

```solidity
function raise(uint256 matchId, uint8 quantity, uint8 face, uint32 expectedSequence) external {
    MatchPublic storage matchState = _requireActiveTurn(matchId, expectedSequence);
    uint8 seat = _seatOf(matchState, msg.sender);
    if (seat != matchState.activeSeat) revert NotActivePlayer(matchId, msg.sender);
    if (!BidRules.isInBounds(quantity, face, matchState.diceCount)) revert InvalidBid(quantity, face);
    Bid memory current = matchState.currentBid;
    if (current.quantity != 0 && !BidRules.isHigher(current.quantity, current.face, quantity, face)) {
        revert InvalidBid(quantity, face);
    }
    matchState.actionSequence += 1;
    matchState.currentBid = Bid(quantity, face, seat, matchState.actionSequence);
    matchState.activeSeat = 1 - seat;
    _refreshDeadlines(matchState);
    emit BidRaised(matchId, quantity, face, seat, matchState.actionSequence);
}
```

Use 45 seconds for `actionDeadline` and 120 seconds for `abandonmentDeadline`.

Run `npm --workspace contracts test -- --grep "active rounds"`.

Expected: PASS.

- [ ] **Step 3: Write failing challenge-state and double-settlement tests**

```ts
it("moves challenge into resolving and cannot settle the round twice", async function () {
  const fixture = await activeRobotFixture();
  const { game, human, robot } = fixture;
  const humanRoll = await decryptOwnerRoll(fixture, human);
  const robotRoll = await decryptOwnerRoll(fixture, robot);
  const truthful = [1, 2, 3, 4, 5, 6]
    .map((face) => ({
      face,
      count: [...humanRoll, ...robotRoll].filter((die) => die === face).length,
    }))
    .sort((a, b) => b.count - a.count)[0];
  await game.write.raise([1n, truthful.count, truthful.face, 0], { account: human.account });
  await game.write.challenge([1n, 1], { account: robot.account });
  expect((await game.read.getPublicMatch([1n])).status).to.equal(4);
  const settlement = await revealAndPack(game, 1n);
  await game.write.settleChallenge([1n, settlement, 2], { account: robot.account });
  expect((await game.read.getPublicMatch([1n])).score).to.deep.equal([1, 0]);
  await expect(game.write.settleChallenge([1n, settlement, 2], { account: human.account }))
    .to.be.rejectedWith("WrongStatus");
});
```

Run against the local covalidator.

Expected: FAIL because challenge/reveal/settle are absent.

- [ ] **Step 4: Implement encrypted base/effective count and reveal**

On challenge:

```solidity
euint256 count = e.asEuint256(0);
for (uint8 seat = 0; seat < 2; seat++) {
    for (uint8 index = 0; index < matchState.diceCount; index++) {
        ebool matches = _roundSecrets[matchId].dice[seat][index].eq(matchState.currentBid.face);
        count = count.add(e.select(matches, 1, 0));
        e.reveal(_roundSecrets[matchId].dice[seat][index]);
    }
}
count.allowThis();
e.reveal(count);
```

Store the effective-count handle and change state to `ResolvingChallenge` before emitting:

```solidity
event ChallengeRequested(
    uint256 indexed matchId,
    uint8 indexed challengerSeat,
    uint32 sequence,
    bytes32 effectiveCountHandle
);
```

The event contains no plaintext roll or gadget data.

- [ ] **Step 5: Implement attested settlement**

Define exact calldata:

```solidity
struct ChallengeSettlement {
    uint256[12] dieValues;
    bytes[][12] dieSignatures;
    uint256 effectiveCount;
    bytes[] effectiveCountSignatures;
}
```

`settleChallenge(matchId, settlement, expectedSequence)`:

1. requires `ResolvingChallenge` and exact sequence;
2. verifies only the first `diceCount` values for each seat against the stored die handles;
3. verifies `effectiveCount` against the stored count handle;
4. computes `winner = effectiveCount >= bid.quantity ? bidder : 1 - bidder`;
5. increments only `score[winner]`;
6. stores revealed rolls, bid, base count, effective count, winner, and score in `RoundResult`;
7. advances sequence;
8. changes to `MatchComplete` when the new score is 2, otherwise `RoundComplete`; and
9. emits a post-resolution `RoundSettled` event.

`baseCount` is computed from verified die plaintext with ones treated normally.

- [ ] **Step 6: Write failing best-of-three and alternating-starter tests**

Extend `contracts/test/helpers/inco.ts` with a deterministic outcome driver that
uses the actual privately decrypted random rolls rather than replacing Inco
randomness:

```ts
export async function settlePresetRound(
  fixture: RobotFixture,
  options: { winner: 0 | 1 },
) {
  const state = await fixture.game.read.getPublicMatch([1n]);
  const rolls = [
    await decryptOwnerRoll(fixture, fixture.human),
    await decryptOwnerRoll(fixture, fixture.robot),
  ] as const;
  const bidder = Number(state.activeSeat) as 0 | 1;
  const bidderWallet = bidder === 0 ? fixture.human : fixture.robot;
  const challengerWallet = bidder === 0 ? fixture.robot : fixture.human;
  const counts = [1, 2, 3, 4, 5, 6].map((face) => ({
    face,
    count: [...rolls[0], ...rolls[1]].filter((die) => die === face).length,
  }));
  const candidate = options.winner === bidder
    ? counts.filter((item) => item.count > 0).sort((a, b) => b.count - a.count)[0]
    : counts.filter((item) => item.count < state.diceCount * 2).sort((a, b) => a.count - b.count)[0];
  const quantity = options.winner === bidder ? candidate.count : candidate.count + 1;
  await fixture.game.write.raise(
    [1n, quantity, candidate.face, state.actionSequence],
    { account: bidderWallet.account },
  );
  await fixture.game.write.challenge(
    [1n, state.actionSequence + 1],
    { account: challengerWallet.account },
  );
  const settlement = await revealAndPack(fixture.game, 1n);
  await fixture.game.write.settleChallenge(
    [1n, settlement, state.actionSequence + 2],
    { account: challengerWallet.account },
  );
}

export async function fundAndStartNextRound(fixture: RobotFixture) {
  const state = await fixture.game.read.getPublicMatch([1n]);
  await fixture.game.write.fundAndStartNextRound(
    [1n, state.actionSequence],
    { account: fixture.human.account, value: fixture.roundFee },
  );
}
```

```ts
it("ends at 2-1 exactly once and alternates round starters", async function () {
  const fixture = await activeRobotFixture();
  await settlePresetRound(fixture, { winner: 0 });
  await fundAndStartNextRound(fixture);
  expect((await fixture.game.read.getPublicMatch([1n])).startingSeat).to.equal(1);
  await settlePresetRound(fixture, { winner: 1 });
  await fundAndStartNextRound(fixture);
  expect((await fixture.game.read.getPublicMatch([1n])).startingSeat).to.equal(0);
  await settlePresetRound(fixture, { winner: 0 });
  const state = await fixture.game.read.getPublicMatch([1n]);
  expect(state.score).to.deep.equal([2, 1]);
  expect(state.status).to.equal(6);
  await expect(fixture.game.write.fundAndStartNextRound([1n, state.actionSequence], {
    account: fixture.human.account,
    value: fixture.roundFee,
  }))
    .to.be.rejectedWith("WrongStatus");
});
```

Expected: FAIL until next-round funding/progression exists.

- [ ] **Step 7: Implement next-round fee and progression**

`fundAndStartNextRound(matchId, expectedSequence)` is payable and callable in
`RoundComplete`. Robot mode requires the human to provide the full
`requiredRoundFee`. Friend mode is handled by per-seat funding in Task 9. It:

- resets the current bid;
- increments the round number;
- flips `startingSeat`;
- sets `activeSeat` to the new starter;
- resets round-only secret state;
- generates fresh handles;
- sets `ActiveTurn`; and
- refreshes both deadlines.

Run:

```powershell
npm run contracts:node
npm --workspace contracts test -- --network anvil --grep "HecliarGame active rounds"
npm run contracts:node:down
npm run contracts:test
```

Expected: turn, challenge, exact-once, scoring, and starter tests PASS.

- [ ] **Step 8: Commit**

```powershell
git add contracts
git commit -m "feat: settle best-of-three rounds authoritatively"
```

### Task 7: Secret Gadgets

**Files:**
- Modify: `contracts/contracts/HecliarGame.sol`
- Modify: `contracts/contracts/libraries/HecliarTypes.sol`
- Create: `contracts/test/HecliarGame.gadgets.test.ts`
- Modify: `packages/game-logic/test/resolution.test.ts`

**Interfaces:**
- Consumes: exactly one encrypted assignment per enabled side, current public bid, private target input
- Produces: two-step private target validation, one-use enforcement, encrypted Echo/Jammer effects, owner-only Scanner result, resolution-time disclosure of used effects

- [ ] **Step 1: Strengthen the pure gadget resolution tests**

```ts
// append to packages/game-logic/test/resolution.test.ts
it("applies Echo only when the owned target matches", () => {
  const result = resolveChallenge(
    [[5, 2, 1, 6], [5, 3, 4, 6]],
    { quantity: 3, face: 5, bidder: 0, sequence: 4 },
    [{ owner: 0, kind: "echo", target: 0 }],
  );
  expect(result).toMatchObject({ baseCount: 2, effectiveCount: 3, winner: 0 });
});

it("applies Jammer only to the opponent target", () => {
  const result = resolveChallenge(
    [[5, 2, 1, 6], [5, 3, 4, 6]],
    { quantity: 2, face: 5, bidder: 1, sequence: 4 },
    [{ owner: 0, kind: "jammer", target: 0 }],
  );
  expect(result).toMatchObject({ baseCount: 2, effectiveCount: 1, winner: 0 });
});
```

Run `npm --workspace @hecliar/game-logic test -- resolution.test.ts`.

Expected: PASS for the already-designed pure semantics; these tests become the contract oracle.

- [ ] **Step 2: Write failing gadget lifecycle tests**

```ts
// contracts/test/HecliarGame.gadgets.test.ts
import { expect } from "chai";
import { zeroHash } from "viem";

describe("HecliarGame gadgets", function () {
  it("generates exactly one assignment per side in enabled rounds and none when disabled", async function () {
    const enabled = await activeRobotFixture({ gadgetsEnabled: true });
    expect(enabled.humanHandles.gadget).not.to.equal(zeroHash);
    expect(enabled.robotHandles.gadget).not.to.equal(zeroHash);
    const disabled = await activeRobotFixture({ gadgetsEnabled: false });
    expect(disabled.humanHandles.gadget).to.equal(zeroHash);
    expect(disabled.robotHandles.gadget).to.equal(zeroHash);
  });

  it("rejects an invalid private target without consuming the gadget", async function () {
    const fixture = await activeRobotFixture({ gadgetsEnabled: true });
    const request = await encryptTarget(fixture.human, fixture.game.address, 9n);
    const fee = await fixture.game.read.gadgetInputFee();
    await fixture.game.write.requestGadgetUse([1n, request, 0], {
      account: fixture.human.account, value: fee,
    });
    const [valid, signatures] = await revealGadgetValidation(fixture.game, 1n);
    await expect(fixture.game.write.confirmGadgetUse([1n, valid, signatures, 0], {
      account: fixture.human.account,
    })).to.be.rejectedWith("InvalidGadgetTarget");
    expect((await fixture.game.read.getMyGadgetState([1n], {
      account: fixture.human.account,
    })).consumed).to.equal(false);
  });

  it("rejects a second use", async function () {
    const fixture = await armedGadgetFixture({ seat: 0, target: 0 });
    const request = await encryptTarget(fixture.human, fixture.game.address, 1n);
    await expect(fixture.game.write.requestGadgetUse([1n, request, fixture.sequence], {
      account: fixture.human.account, value: fixture.inputFee,
    })).to.be.rejectedWith("GadgetAlreadyUsed");
  });
});
```

Add these exact helper contracts to `contracts/test/helpers/inco.ts`:

```ts
export async function encryptTarget(
  wallet: WalletClient,
  contractAddress: Hex,
  target: bigint,
) {
  const zap = await getTestLightning();
  return zap.encrypt(target, {
    accountAddress: wallet.account!.address,
    dappAddress: contractAddress,
    handleType: handleTypes.euint256,
  });
}

export async function revealGadgetValidation(
  game: RobotFixture["game"],
  matchId: bigint,
) {
  const state = await game.read.getPendingGadgetValidation([matchId]);
  const zap = await getTestLightning();
  const [result] = await zap.attestedReveal([state.handle]);
  return [
    Boolean(result.plaintext.value),
    result.covalidatorSignatures.map((signature) => bytesToHex(signature)),
  ] as const;
}

export async function decryptBool(wallet: WalletClient, handle: Hex) {
  const zap = await getTestLightning();
  const [result] = await zap.attestedDecrypt(wallet, [handle]);
  return Boolean(result.plaintext.value);
}
```

`armedGadgetFixture` deploys `HecliarGameHarness`, queues eight four-die values
plus gadget kinds `[Echo, Jammer]`, creates an enabled Robot match, encrypts the
requested target, requests validation, reveals the validation boolean, confirms
it with the unchanged sequence, and returns the new sequence. `scannerFixture`
uses the same harness with gadget kinds `[Scanner, Echo]` and the exact rolls
passed by its caller. `armCurrentAssignment` is the request/reveal/confirm
sequence factored from those two factories. These helpers never alter
production `HecliarGame` randomness.

Run against the local covalidator.

Expected: FAIL because gadget request/confirmation does not exist.

- [ ] **Step 3: Implement private target request without consuming**

An encrypted target cannot be synchronously used in a Solidity `require`, so activation uses two transactions while the `GameGateway.useGadget` method hides the orchestration.

```solidity
function requestGadgetUse(
    uint256 matchId,
    bytes calldata encryptedTarget,
    uint32 expectedSequence
) external payable {
    MatchPublic storage matchState = _requireActiveTurn(matchId, expectedSequence);
    uint8 seat = _seatOf(matchState, msg.sender);
    RoundSecret storage secret = _roundSecrets[matchId];
    if (!matchState.gadgetsEnabled) revert GadgetsDisabled();
    if (secret.gadgetConsumed[seat]) revert GadgetAlreadyUsed();
    if (msg.value < inco.getFee()) revert InsufficientIncoFee(inco.getFee(), msg.value);

    euint256 target = e.newEuint256(encryptedTarget, msg.sender);
    target.allowThis();
    target.allow(msg.sender);
    secret.gadgetTargets[seat] = target;

    ebool valid = target.lt(matchState.diceCount);
    valid.allowThis();
    e.reveal(valid);
    secret.gadgetTargetValid[seat] = valid;
    secret.gadgetPending[seat] = true;
    emit GadgetValidationRequested(matchId, seat, ebool.unwrap(valid));
}
```

The event reveals only a boolean handle. It does not contain the target input, assignment, or plaintext.

- [ ] **Step 4: Implement attested validation and one-use confirmation**

```solidity
function confirmGadgetUse(
    uint256 matchId,
    bool valid,
    bytes[] calldata signatures,
    uint32 expectedSequence
) external {
    MatchPublic storage matchState = _requireActiveTurn(matchId, expectedSequence);
    uint8 seat = _seatOf(matchState, msg.sender);
    RoundSecret storage secret = _roundSecrets[matchId];
    if (!secret.gadgetPending[seat]) revert GadgetNotPending();
    if (!e.verifyDecryption(secret.gadgetTargetValid[seat], valid, signatures)) {
        revert InvalidAttestation();
    }
    secret.gadgetPending[seat] = false;
    if (!valid) revert InvalidGadgetTarget();
    secret.gadgetArmed[seat] = true;
    secret.gadgetConsumed[seat] = true;
    matchState.actionSequence += 1;
    _refreshDeadlines(matchState);
    emit GadgetArmed(matchId, seat, matchState.actionSequence);
}
```

If `valid` is false the entire confirmation reverts, leaving `gadgetConsumed` false. The pending request may be replaced with another encrypted target.

- [ ] **Step 5: Write failing Scanner privacy tests**

```ts
it("allows only the Scanner owner to decrypt its result", async function () {
  const fixture = await scannerFixture({
    humanRoll: [5, 5, 1, 2],
    robotRoll: [5, 3, 4, 6],
    bid: { quantity: 3, face: 5 },
  });
  await armCurrentAssignment(fixture, { seat: 0, target: 0 });
  const state = await fixture.game.read.getMyGadgetState([1n], {
    account: fixture.human.account,
  });
  expect(await decryptBool(fixture.human, state.scannerResult)).to.equal(true);
  await expect(decryptBool(fixture.robot, state.scannerResult)).to.be.rejected;
  const publicEvents = await fixture.publicClient.getContractEvents({
    address: fixture.game.address,
    abi: hecliarAbi,
    fromBlock: fixture.startBlock,
  });
  expect(JSON.stringify(publicEvents)).not.to.contain('"scannerResult":true');
});
```

Expected: FAIL until private Scanner computation exists.

- [ ] **Step 6: Compute Scanner privately on confirmation**

Compute an encrypted unmodified count for the current bid face. Compute:

```solidity
ebool isScanner = secret.gadgetKinds[seat].eq(uint256(GadgetKind.Scanner));
ebool thresholdMet = baseCount.ge(matchState.currentBid.quantity);
ebool scannerResult = isScanner.and(thresholdMet);
scannerResult.allowThis();
scannerResult.allow(matchState.players[seat]);
secret.scannerResults[seat] = scannerResult;
```

Do not reveal the result. The owner obtains it through `attestedDecrypt`.

- [ ] **Step 7: Apply Echo/Jammer to the encrypted challenge count**

For every armed seat, compute encrypted conditions:

```solidity
ebool targetIsIndex = secret.gadgetTargets[owner].eq(index);
ebool isEcho = secret.gadgetKinds[owner].eq(uint256(GadgetKind.Echo));
ebool isJammer = secret.gadgetKinds[owner].eq(uint256(GadgetKind.Jammer));
ebool matchingTarget = targetIsIndex.and(dieMatchesBid);
euint256 echoDelta = e.select(isEcho.and(matchingTarget), 1, 0);
euint256 jammerDelta = e.select(isJammer.and(matchingTarget), 1, 0);
```

Add Echo on the owner's die and subtract Jammer on the opponent's die. Compute
one encrypted public-at-resolution effect code per seat:

```text
0 = no count change
1 = Echo added one
2 = Jammer removed one
```

Reveal and verify only the effect-code handles. Never reveal assignment, target,
or Scanner result handles. A zero code intentionally leaves Scanner, an
unused gadget, and a nonmatching Echo/Jammer indistinguishable. This discloses
every applied scoring modifier without leaking unused or privately informative
gadget data.

Extend `ChallengeSettlement` with `uint256[2] effectCodes` and
`bytes[][2] effectCodeSignatures`. Settlement verifies both effect-code handles,
requires each code to be 0, 1, or 2, and stores the verified codes in
`RoundResult` for the explanatory UI.

- [ ] **Step 8: Verify gadget outcomes and disclosure**

Add contract cases for:

- Echo target matches and does not match;
- Jammer target matches and does not match;
- Scanner true and false;
- assignment differs from the action the caller expected;
- disabled round;
- target indexes `0` and `diceCount - 1`;
- target `diceCount` rejected without consumption;
- nonzero applied effect codes become public only after challenge; and
- unused assignment remains unauthorized after settlement.

Run:

```powershell
npm run contracts:node
npm --workspace contracts test -- --network anvil --grep "HecliarGame gadgets"
npm run contracts:node:down
npm --workspace @hecliar/game-logic test
```

Expected: all gadget lifecycle, outcome, and privacy tests PASS.

- [ ] **Step 9: Commit**

```powershell
git add contracts packages/game-logic
git commit -m "feat: add confidential one-use gadgets"
```

### Task 8: Chain Gateway and Isolated Robot Service

**Files:**
- Create: `frontend/lib/network.ts`
- Create: `frontend/lib/contracts/hecliar.ts`
- Create: `frontend/lib/inco/client.ts`
- Create: `frontend/lib/game/chain-gateway.ts`
- Create: `frontend/lib/logging/safe-log.ts`
- Create: `frontend/server/robot/observation.ts`
- Create: `frontend/server/robot/wallet.ts`
- Create: `frontend/server/robot/rate-limit.ts`
- Create: `frontend/server/robot/action.ts`
- Create: `frontend/app/api/robot/action/route.ts`
- Create: `frontend/test/chain-gateway.test.ts`
- Create: `frontend/test/private-state.test.ts`
- Create: `frontend/test/robot-route.test.ts`
- Modify: `frontend/hooks/useGameGateway.tsx`
- Modify: `frontend/hooks/useRobotTurn.ts`

**Interfaces:**
- Consumes: deployed contract ABI/address, Lightning JS, Viem wallet/public clients, `chooseRobotAction`
- Produces: `ChainGameGateway`, authorized private reads, reveal/settle packing, robot-only observation loader, sanitized/rate-limited action route

- [ ] **Step 1: Write failing private-state boundary tests**

```ts
// frontend/test/private-state.test.ts
import { describe, expect, it, vi } from "vitest";
import { loadPrivatePlayer } from "@/lib/inco/client";

it("requests only the connected seat handles", async () => {
  const readContract = vi.fn().mockResolvedValue({
    dice: ["0x01", "0x02", "0x00", "0x00", "0x00", "0x00"],
    gadget: "0x03",
    scannerResult: "0x00",
  });
  const attestedDecrypt = vi.fn().mockResolvedValue([
    { plaintext: { value: 5n } },
    { plaintext: { value: 2n } },
    { plaintext: { value: 1n } },
  ]);
  const view = await loadPrivatePlayer({
    matchId: 9n,
    account: "0x0000000000000000000000000000000000000001",
    readContract,
    attestedDecrypt,
  });
  expect(readContract).toHaveBeenCalledWith(expect.objectContaining({
    functionName: "getMyRoundHandles",
    args: [9n],
  }));
  expect(attestedDecrypt).toHaveBeenCalledWith(["0x01", "0x02", "0x03"]);
  expect(view.ownDice).toEqual([5, 2]);
});
```

Run `npm --workspace frontend test -- private-state.test.ts`.

Expected: FAIL because the Inco client does not exist.

- [ ] **Step 2: Implement network and authorized decrypt helpers**

```ts
// frontend/lib/network.ts
import { Lightning } from "@inco/lightning-js/lite";
import { baseSepolia } from "viem/chains";

export const hecliarChain = baseSepolia;

export async function getLightning() {
  return process.env.NEXT_PUBLIC_NETWORK === "local"
    ? Lightning.localNode("mainnet")
    : Lightning.baseSepoliaTestnet();
}
```

`loadPrivatePlayer` must:

1. call only `getMyRoundHandles(matchId)` with the connected wallet account;
2. remove zero handles;
3. call `attestedDecrypt(walletClient, handles)` once;
4. map only the caller's dice, gadget, and Scanner result;
5. validate every die as 1–6 and gadget as 0–2; and
6. return a frozen `PrivatePlayerView`.

`readChallengeEvidence` calls `attestedReveal` only after contract status is `ResolvingChallenge`. `packChallengeSettlement` orders values exactly as the Solidity `ChallengeSettlement` struct.

Run `npm --workspace frontend test -- private-state.test.ts`.

Expected: PASS.

- [ ] **Step 3: Write failing chain gateway tests**

```ts
// frontend/test/chain-gateway.test.ts
import { expect, it, vi } from "vitest";
import { ChainGameGateway } from "@/lib/game/chain-gateway";

const testDependencies = (overrides: Record<string, unknown> = {}) => ({
  account: "0x0000000000000000000000000000000000000001" as const,
  contractAddress: "0x0000000000000000000000000000000000000002" as const,
  readContract: vi.fn(),
  writeContract: vi.fn(),
  waitForTransactionReceipt: vi.fn(),
  getLightning: vi.fn(),
  ...overrides,
});

it("uses the current sequence and waits for receipts before refresh", async () => {
  const writeContract = vi.fn().mockResolvedValue("0xabc");
  const waitForTransactionReceipt = vi.fn().mockResolvedValue({ status: "success" });
  const gateway = new ChainGameGateway(testDependencies({ writeContract, waitForTransactionReceipt }));
  await gateway.raise(7n, { quantity: 3, face: 5 }, 11);
  expect(writeContract).toHaveBeenCalledWith(expect.objectContaining({
    functionName: "raise",
    args: [7n, 3, 5, 11],
  }));
  expect(waitForTransactionReceipt).toHaveBeenCalledWith({ hash: "0xabc" });
});
```

Expected: FAIL because `ChainGameGateway` does not exist.

- [ ] **Step 4: Implement all `GameGateway` methods**

Every mutating method calls `writeContract`, waits for a successful receipt, then invalidates the public match query. `useGadget` performs:

```ts
const zap = await getLightning();
const encryptedTarget = await zap.encrypt(BigInt(target), {
  accountAddress: account,
  dappAddress: contractAddress,
  handleType: handleTypes.euint256,
});
await requestGadgetUse(encryptedTarget, expectedSequence, await readInputFee());
const validation = await pollPublicGadgetValidation(matchId, account);
const [attestation] = await zap.attestedReveal([validation.handle]);
await confirmGadgetUse(
  matchId,
  Boolean(attestation.plaintext.value),
  toHexSignatures(attestation.covalidatorSignatures),
  expectedSequence,
);
```

If validity is false, return a typed `InvalidGadgetTargetError` after the reverted confirmation refresh proves the gadget remains unused.

`continueMatch` dispatches to `fundAndStartNextRound` in Robot mode and
`fundNextFriendRound` in Friend mode after reading the live required fee.
`requestRobotAction` POSTs only decimal `matchId` and `expectedSequence` to
`/api/robot/action`, validates the sanitized response, waits for the returned
transaction receipt, and refreshes public state.

- [ ] **Step 5: Write failing robot-boundary tests**

```ts
// frontend/test/robot-route.test.ts
import { expect, it, vi } from "vitest";
import { performRobotAction } from "@/server/robot/action";
import { SeededRandom } from "@hecliar/game-logic";

const ROBOT_ACCOUNT = "0x0000000000000000000000000000000000000002" as const;
const robotTurnPublicMatch = {
  matchId: 1n,
  status: "active-turn" as const,
  players: [
    "0x0000000000000000000000000000000000000001",
    ROBOT_ACCOUNT,
  ] as const,
  settings: {
    mode: "robot" as const,
    diceCount: 4 as const,
    gadgetsEnabled: false,
    difficulty: "easy" as const,
  },
  activeSeat: 1 as const,
  startingSeat: 0 as const,
  currentBid: { quantity: 2, face: 5 as const, bidder: 0 as const, sequence: 4 },
  score: [0, 0] as const,
  round: 1,
  actionSequence: 4,
  actionDeadline: 1_900_000_000,
  abandonmentDeadline: 1_900_000_075,
  rematchAccepted: [false, false] as const,
};
const robotDependencies = (overrides: Record<string, unknown> = {}) => ({
  robotAccount: ROBOT_ACCOUNT,
  getPublicMatch: vi.fn().mockResolvedValue(robotTurnPublicMatch),
  getMyRoundHandles: vi.fn().mockResolvedValue({ dice: ["0x11"], gadget: "0x00" }),
  decryptRobotHandles: vi.fn().mockResolvedValue({ ownDice: [5, 2, 1, 6], gadget: null }),
  submitAction: vi.fn().mockResolvedValue("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"),
  random: new SeededRandom(1),
  safeLog: vi.fn(),
  ...overrides,
});
const successfulRobotDependencies = () => robotDependencies();

it("builds an observation from robot handles and public state only", async () => {
  const getMyRoundHandles = vi.fn().mockResolvedValue({ dice: ["0x11"], gadget: "0x00" });
  await performRobotAction(robotDependencies({
    getMyRoundHandles,
    decryptRobotHandles: vi.fn().mockResolvedValue({ ownDice: [5, 2, 1, 6], gadget: null }),
  }), { matchId: 1n, expectedSequence: 4 });
  expect(getMyRoundHandles).toHaveBeenCalledWith(1n, ROBOT_ACCOUNT);
});

it("returns no decrypted observation fields", async () => {
  const result = await performRobotAction(successfulRobotDependencies(), {
    matchId: 1n, expectedSequence: 4,
  });
  expect(result).toEqual({ transactionHash: expect.stringMatching(/^0x/), action: "raise" });
  expect(JSON.stringify(result)).not.toMatch(/dice|gadget|handle|plaintext/i);
});
```

Expected: FAIL because the robot service does not exist.

- [ ] **Step 6: Implement robot wallet, loader, and action submission**

`frontend/server/robot/observation.ts` exports:

```ts
export async function loadRobotObservation(
  matchId: bigint,
  expectedSequence: number,
  deps: RobotObservationDependencies,
): Promise<RobotObservation>;
```

It checks Robot mode, `activeSeat === 1`, and exact sequence; calls `getMyRoundHandles` using only the robot account; decrypts only those handles; and combines them with `PublicMatchView`.

`wallet.ts` reads `ROBOT_PRIVATE_KEY` only on the server and throws `RobotConfigurationError` when absent. It is imported only from modules with `import "server-only"`.

`performRobotAction` validates the chosen action through `isLegalRobotAction` before submitting it.

- [ ] **Step 7: Implement safe logging, rate limiting, and route schema**

```ts
// frontend/lib/logging/safe-log.ts
const ALLOWED = new Set(["requestId", "matchId", "sequence", "action", "durationMs", "transactionHash", "errorCode"]);

export function safeLog(event: string, metadata: Record<string, unknown>) {
  const sanitized = Object.fromEntries(Object.entries(metadata).filter(([key]) => ALLOWED.has(key)));
  console.info(JSON.stringify({ event, ...sanitized }));
}
```

The route accepts exactly:

```ts
const RobotRequest = z.object({
  matchId: z.string().regex(/^\d+$/),
  expectedSequence: z.number().int().nonnegative(),
}).strict();
```

Rate-limit to one in-flight action and ten attempts per minute per match. Return only `{ transactionHash, action }` or `{ code, message }`; never return a caught error object.

- [ ] **Step 8: Verify integration and commit**

Run:

```powershell
npm --workspace frontend test -- private-state.test.ts chain-gateway.test.ts robot-route.test.ts
npm --workspace frontend test
npm --workspace frontend run build
git add frontend
git commit -m "feat: connect confidential game and isolated robot"
```

Expected: tests and production build PASS; client bundle contains no `ROBOT_PRIVATE_KEY` string value.

### Task 9: Friend Rooms, Timers, Recovery, and Mutual Rematch

**Files:**
- Modify: `contracts/contracts/HecliarGame.sol`
- Create: `contracts/test/HecliarGame.recovery.test.ts`
- Create: `frontend/lib/room-code.ts`
- Create: `frontend/lib/storage/public-recovery.ts`
- Create: `frontend/hooks/usePublicMatch.ts`
- Create: `frontend/hooks/usePrivatePlayer.ts`
- Create: `frontend/hooks/useGameActions.ts`
- Create: `frontend/hooks/useMatchRecovery.ts`
- Create: `frontend/components/room/WaitingRoom.tsx`
- Create: `frontend/app/play/friend/page.tsx`
- Create: `frontend/app/room/[code]/page.tsx`
- Test: `frontend/test/WaitingRoom.test.tsx`
- Test: `frontend/e2e/friend-room.spec.ts`
- Test: `frontend/e2e/recovery.spec.ts`

**Interfaces:**
- Consumes: room contract methods and `ChainGameGateway`
- Produces: 128-bit room codes, inspect-before-join, two-seat fee/readiness, event/poll convergence, timeout claims, reload restoration, mutual rematch

- [ ] **Step 1: Write failing fee/readiness and rematch tests**

Add Friend fixtures to `contracts/test/helpers/inco.ts`:

```ts
import { keccak256, stringToHex } from "viem";

export async function joinedFriendFixture() {
  const [host, guest, third] = await hre.viem.getWalletClients();
  const game = await hre.viem.deployContract("HecliarGameHarness");
  const roomHash = keccak256(stringToHex("ABCDEFGHIJKLMNOP23456789AB"));
  await game.write.createRoom([roomHash, 4, true, 3600n], { account: host.account });
  await game.write.joinRoom([roomHash], { account: guest.account });
  const matchId = await game.read.matchByRoomHash([roomHash]);
  const playerFee = await game.read.requiredPlayerRoundFee([4, true]);
  return { game, host, guest, third, roomHash, matchId, playerFee };
}

export async function activeFriendFixture() {
  const fixture = await joinedFriendFixture();
  await fixture.game.write.setPresetSecrets([
    [5, 5, 2, 1, 5, 3, 4, 6],
    [0, 1],
  ]);
  await fixture.game.write.setReady([fixture.matchId], {
    account: fixture.host.account,
    value: fixture.playerFee,
  });
  await fixture.game.write.setReady([fixture.matchId], {
    account: fixture.guest.account,
    value: fixture.playerFee,
  });
  return fixture;
}

export async function completedFriendFixture() {
  const fixture = await activeFriendFixture();
  await settleFriendRoundForWinner(fixture, 0);
  await fundFriendRound(fixture);
  await settleFriendRoundForWinner(fixture, 0);
  return fixture;
}
```

`settleFriendRoundForWinner` uses the same actual-roll truthful/false bid
selection as `settlePresetRound`, choosing the current active wallet as bidder
and the other as challenger. `fundFriendRound` calls `fundNextFriendRound` once
per seat with `playerFee`.

```ts
// append to contracts/test/HecliarGame.recovery.test.ts
it("starts a Friend round only after both distinct seats are ready and funded", async function () {
  const { game, host, guest, matchId, playerFee } = await joinedFriendFixture();
  await game.write.setReady([matchId], { account: host.account, value: playerFee });
  expect((await game.read.getPublicMatch([matchId])).status).to.equal(1);
  await game.write.setReady([matchId], { account: guest.account, value: playerFee });
  expect((await game.read.getPublicMatch([matchId])).status).to.equal(3);
});

it("starts a Friend rematch only after both accept", async function () {
  const fixture = await completedFriendFixture();
  await fixture.game.write.acceptRematch([fixture.matchId], { account: fixture.host.account });
  expect((await fixture.game.read.getPublicMatch([fixture.matchId])).status).to.equal(6);
  await fixture.game.write.acceptRematch([fixture.matchId], { account: fixture.guest.account });
  expect((await fixture.game.read.getPublicMatch([fixture.matchId])).status).to.equal(1);
  expect((await fixture.game.read.getPublicMatch([fixture.matchId])).score).to.deep.equal([0, 0]);
});
```

Expected: FAIL because per-seat funding and rematch acceptance are absent.

- [ ] **Step 2: Implement fair per-seat round funding**

Add `roundFeePaid[matchId][seat]`. `requiredPlayerRoundFee` is exactly half of `requiredRoundFee` because each player funds its own dice and optional gadget operation.

`setReady` and `fundNextFriendRound` require the exact per-player fee, mark only the caller seat, and generate the round only after both seats have paid. Reset both fee flags after generation.

`acceptRematch` in Friend mode records the caller; after both accept it resets public score/round/bid, changes to `WaitingForReady`, clears acceptance, and requires new per-seat funding before generating new secrets.

- [ ] **Step 3: Write failing timeout tests**

```ts
import { time } from "@nomicfoundation/hardhat-network-helpers";

it("allows only the opponent to claim a 45-second turn timeout", async function () {
  const fixture = await activeFriendFixture();
  await time.increase(44);
  await expect(fixture.game.write.claimTurnTimeout([fixture.matchId, 0], {
    account: fixture.guest.account,
  })).to.be.rejectedWith("DeadlineActive");
  await time.increase(2);
  await fixture.game.write.claimTurnTimeout([fixture.matchId, 0], {
    account: fixture.guest.account,
  });
  expect((await fixture.game.read.getPublicMatch([fixture.matchId])).score).to.deep.equal([0, 1]);
});

it("preserves the match for two minutes before abandonment can be claimed", async function () {
  const fixture = await activeFriendFixture();
  await time.increase(119);
  await expect(fixture.game.write.claimAbandonment([fixture.matchId, 0], {
    account: fixture.guest.account,
  })).to.be.rejectedWith("DeadlineActive");
  await time.increase(2);
  await fixture.game.write.claimAbandonment([fixture.matchId, 0], {
    account: fixture.guest.account,
  });
  expect((await fixture.game.read.getPublicMatch([fixture.matchId])).status).to.equal(6);
});
```

Expected: FAIL before timeout methods exist.

- [ ] **Step 4: Implement timeout claims**

`claimTurnTimeout` requires `ActiveTurn`, stale-protected sequence, caller is the non-active player, and `block.timestamp > actionDeadline`. It awards exactly one round and then uses the same round/match transition as challenge settlement.

`claimAbandonment` requires caller is seated, the opponent is the other seat, and `block.timestamp > abandonmentDeadline`. It sets score to 2 for the caller and changes to `MatchComplete`. Any valid Raise, gadget confirmation, challenge, round funding, or readiness refreshes the abandonment deadline.

- [ ] **Step 5: Write failing room-code and waiting-room tests**

```ts
// frontend/test/WaitingRoom.test.tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { WaitingRoom } from "@/components/room/WaitingRoom";
import { createRoomCode } from "@/lib/room-code";

it("creates a 128-bit human-safe code", () => {
  const code = createRoomCode(new Uint8Array(16).fill(7));
  expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{26}$/);
});

it("shows settings before join and a full-room state", () => {
  render(<WaitingRoom
    code="ABCDE23456FGHIJ789KLMNPQRS"
    settings={{ mode: "friend", diceCount: 5, gadgetsEnabled: true }}
    seats={["0x0000000000000000000000000000000000000001", "0x0000000000000000000000000000000000000002"]}
    currentAccount="0x0000000000000000000000000000000000000003"
    onJoin={vi.fn()}
    onReady={vi.fn()}
  />);
  expect(screen.getByText("5 dice per side")).toBeVisible();
  expect(screen.getByText("Secret gadgets on")).toBeVisible();
  expect(screen.getByText("This room is full")).toBeVisible();
  expect(screen.queryByRole("button", { name: "Join room" })).not.toBeInTheDocument();
});
```

Expected: FAIL before room helpers/components exist.

- [ ] **Step 6: Implement high-entropy codes and room screens**

`createRoomCode` encodes exactly 16 cryptographically random bytes using the alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`. `hashRoomCode` normalizes uppercase, rejects other characters and lengths, then returns `keccak256(toBytes(code))`.

`/play/friend` creates the room and routes to `/room/{code}`. `/room/[code]` calls `inspectRoom` before offering Join, presents host settings, distinguishes invalid/expired/full/same-wallet states, and renders `WaitingRoom`.

No code or match secret is written to logs. The room code may remain in the route because it is coordination data.

- [ ] **Step 7: Implement polling, event refresh, and public-only recovery**

`usePublicMatch` polls every 2 seconds and immediately refetches on Hecliar events. `usePrivatePlayer` clears its in-memory data on account, chain, match ID, round, or status change before decrypting the connected owner's new handles.

`public-recovery.ts` persists only:

```ts
type RecoveryRecord = {
  matchId: string;
  roomCode?: string;
  mode: "robot" | "friend";
};
```

It rejects any object with keys matching `/dice|gadget|roll|scanner|handle|cipher|plaintext/i`.

- [ ] **Step 8: Write two-context browser acceptance tests**

Create `frontend/e2e/helpers.ts`. It exports:

```ts
import type { Browser, Page, Response } from "@playwright/test";

export const HOST_ACCOUNT_INDEX = 0;
export const GUEST_ACCOUNT_INDEX = 1;
export const THIRD_ACCOUNT_INDEX = 2;

export async function walletContext(browser: Browser, accountIndex: number) {
  const accountResponse = await fetch("http://127.0.0.1:8545", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_accounts", params: [] }),
  });
  const accounts = (await accountResponse.json()).result as `0x${string}`[];
  const selected = accounts[accountIndex];
  const context = await browser.newContext();
  await context.addInitScript(({ rpcUrl, selected }) => {
    let requestId = 0;
    const rpc = async (method: string, params: unknown[] = []) => {
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: ++requestId, method, params }),
      });
      const payload = await response.json();
      if (payload.error) throw new Error(payload.error.message);
      return payload.result;
    };
    Object.defineProperty(window, "ethereum", {
      value: {
        isMetaMask: true,
        request: async ({ method, params = [] }: { method: string; params?: unknown[] }) => {
          if (method === "eth_requestAccounts" || method === "eth_accounts") return [selected];
          if (method === "wallet_switchEthereumChain") return null;
          if (method === "eth_chainId") return rpc("eth_chainId");
          if (method === "eth_sendTransaction") {
            const [transaction] = params as [Record<string, unknown>];
            return rpc(method, [{ ...transaction, from: selected }]);
          }
          return rpc(method, params);
        },
        on: () => undefined,
        removeListener: () => undefined,
      },
    });
  }, { rpcUrl: "http://127.0.0.1:8545", selected });
  return { context, page: await context.newPage() };
}
```

The remaining helpers are UI-only drivers with exact contracts:

```ts
export function createRoomThroughUi(
  page: Page,
  settings: { diceCount: 3 | 4 | 5 | 6; gadgets: boolean },
): Promise<string>;
export function joinRoomThroughUi(page: Page, code: string): Promise<void>;
export function expectFriendStateEqual(
  host: Page,
  guest: Page,
  fields: readonly ("turn" | "bid" | "score")[],
): Promise<void>;
export function expectRoomFull(page: Page, code: string): Promise<void>;
export function completeMatch(host: Page, guest: Page): Promise<void>;
export function expectFreshMatch(host: Page, guest: Page): Promise<void>;
export function playRobotMatchToCompletion(page: Page): Promise<void>;
export function openSeededActiveMatch(page: Page): Promise<void>;
export function rejectNextWalletRequest(page: Page): Promise<void>;
export function openSeededFriendMatch(
  host: Page,
  guest: Page,
  secrets: {
    hostRoll: string[];
    guestRoll: string[];
    hostGadget: "echo" | "jammer" | "scanner";
    guestGadget: "echo" | "jammer" | "scanner";
  },
): Promise<void>;
export function challengeAndSettle(host: Page, guest: Page): Promise<void>;
export function safeResponseText(response: Response): Promise<string>;
export function inspectBrowserSurfaces(page: Page): Promise<Record<string, unknown>>;
```

Each driver uses accessible roles and waits for the next authoritative sequence.
`completeMatch` selects truthful or false bids from each wallet's visible roll
until one score reaches two; it does not use hidden opponent data.

```ts
// frontend/e2e/friend-room.spec.ts
test("two wallets create, join, complete, and mutually rematch", async ({ browser }) => {
  const host = await walletContext(browser, HOST_ACCOUNT_INDEX);
  const guest = await walletContext(browser, GUEST_ACCOUNT_INDEX);
  const third = await walletContext(browser, THIRD_ACCOUNT_INDEX);

  const code = await createRoomThroughUi(host.page, { diceCount: 4, gadgets: true });
  await joinRoomThroughUi(guest.page, code);
  await expectFriendStateEqual(host.page, guest.page, ["turn", "bid", "score"]);
  await expectRoomFull(third.page, code);
  await completeMatch(host.page, guest.page);
  await host.page.getByRole("button", { name: "Rematch" }).click();
  await expect(host.page.getByText("Waiting for opponent")).toBeVisible();
  await guest.page.getByRole("button", { name: "Rematch" }).click();
  await expectFreshMatch(host.page, guest.page);
});
```

`recovery.spec.ts` reloads both contexts during `ActiveTurn`, verifies public convergence, verifies only each wallet's own dice return, and exercises the two-minute claim using the local chain clock.

- [ ] **Step 9: Verify and commit**

Run:

```powershell
npm run contracts:node
npm --workspace contracts test -- --network anvil --grep "recovery|Friend"
npm --workspace frontend run e2e -- friend-room.spec.ts recovery.spec.ts
npm run contracts:node:down
npm --workspace frontend test
git add contracts frontend
git commit -m "feat: add recoverable private friend rooms"
```

Expected: contract and two-wallet browser tests PASS.

### Task 10: Product Interface, Error Recovery, and Mobile Polish

**Files:**
- Create: `frontend/app/page.tsx`
- Create: `frontend/app/how-to-play/page.tsx`
- Modify: `frontend/app/globals.css`
- Modify: `frontend/components/setup/MatchSetup.tsx`
- Modify: `frontend/components/game/GameTable.tsx`
- Modify: `frontend/components/game/ActionStatus.tsx`
- Create: `frontend/components/game/TurnTimer.tsx`
- Modify: `frontend/components/game/RoundResult.tsx`
- Modify: `frontend/components/game/MatchResult.tsx`
- Create: `frontend/test/accessibility.test.tsx`
- Create: `frontend/e2e/robot-match.spec.ts`
- Create: `frontend/e2e/mobile.spec.ts`

**Interfaces:**
- Consumes: complete chain-backed Robot and Friend flows
- Produces: first-time home/tutorial path, distinct transaction states, accessible controls, explanatory resolution, polished 320 px–desktop layouts

- [ ] **Step 1: Write failing first-time and pending-state tests**

```tsx
// frontend/test/accessibility.test.tsx
import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import Home from "@/app/page";
import { ActionStatus } from "@/components/game/ActionStatus";
import { TurnTimer } from "@/components/game/TurnTimer";

it("makes Robot play the primary first-time action", () => {
  render(<Home />);
  expect(screen.getByRole("heading", { name: "HECLIAR" })).toBeVisible();
  expect(screen.getByText("Roll. Bluff. Don’t get caught.")).toBeVisible();
  expect(screen.getByRole("link", { name: "Play Robot" })).toHaveAttribute("href", "/play/robot");
  expect(screen.getByRole("link", { name: "Play a Friend" })).toHaveAttribute("href", "/play/friend");
  expect(screen.getByRole("link", { name: "How to Play" })).toHaveAttribute("href", "/how-to-play");
});

it.each([
  ["wallet-confirmation", "Confirm Raise in your wallet"],
  ["transaction-pending", "Submitting Raise"],
  ["opponent", "Waiting for opponent"],
  ["robot", "Robot is thinking"],
  ["confidential", "Verifying hidden dice"],
  ["failed", "Raise failed"],
] as const)("distinguishes %s", (phase, label) => {
  render(<ActionStatus phase={phase} action="Raise" />);
  expect(screen.getByText(label)).toBeVisible();
});

it("shows the authoritative turn countdown", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));
  render(<TurnTimer actionDeadline={1_893_456_045} canClaim={false} onClaim={vi.fn()} />);
  expect(screen.getByText("00:45")).toBeVisible();
  vi.useRealTimers();
});
```

Run `npm --workspace frontend test -- accessibility.test.tsx`.

Expected: FAIL until the home and final status APIs exist.

- [ ] **Step 2: Implement final content and status state machine**

`ActionStatus` accepts:

```ts
type ActionPhase =
  | "idle"
  | "wallet-confirmation"
  | "transaction-pending"
  | "opponent"
  | "robot"
  | "confidential"
  | "failed";
```

During any non-idle phase, Raise, Challenge, gadget, Ready, Continue, and Rematch submission controls are disabled. On failure, refresh the public match before enabling Retry.

`TurnTimer` receives the authoritative Unix `actionDeadline`, derives remaining
seconds from a one-second client clock, announces 10 seconds and expiry through
an `aria-live` region, and exposes Claim Round only when the deadline has
passed and the connected wallet is the non-active player. It never awards a
round locally.

The How to Play page states:

- choose 3–6 dice, default 4;
- bid quantity and face;
- raise ordering with `2 × 5 → 2 × 6 or 3 × anything`;
- ones are not wild;
- truthful bid means bidder wins;
- false bid means challenger wins;
- first to two rounds;
- Echo, Jammer, Scanner summaries; and
- Inco protects dice and secret gadgets until resolution.

- [ ] **Step 3: Implement the intentional design system**

Define CSS tokens:

```css
:root {
  --ink-950: #050912;
  --ink-900: #0a1220;
  --panel: #101c2d;
  --panel-raised: #16263b;
  --line: #29415d;
  --ivory: #f4eddf;
  --muted: #a8b2bd;
  --private: #54e3e0;
  --pending: #f2b84b;
  --challenge: #ff6b62;
  --success: #7fe39b;
  --radius-sm: 10px;
  --radius-lg: 22px;
  --shadow-table: 0 30px 80px rgb(0 0 0 / 35%);
}
```

Use a layered radial gradient and subtle CSS grid without loading a third-party texture. Use system UI for body copy and `ui-monospace` for bids/scores. Dice are CSS/HTML with accessible labels, not copied assets.

At `max-width: 640px`, the action controls become a sticky two-column footer. No element may cause horizontal overflow at 320 px.

All interactive controls have a visible `:focus-visible` outline, minimum 44 px touch target, and non-color text/icon state. Transitions are disabled under `prefers-reduced-motion: reduce`.

- [ ] **Step 4: Write failing round-evidence tests**

```tsx
it("explains the complete challenge result", () => {
  render(<RoundResult
    rolls={[[5, 5, 2, 1], [5, 3, 4, 6]]}
    bid={{ quantity: 4, face: 5, bidder: 0, sequence: 7 }}
    baseCount={3}
    effects={[{ owner: 0, kind: "echo", target: 0, delta: 1 }]}
    effectiveCount={4}
    winner={0}
  />);
  expect(screen.getByText("Challenged: at least 4 fives")).toBeVisible();
  expect(screen.getByText("3 matching dice")).toBeVisible();
  expect(screen.getByText("Echo added 1")).toBeVisible();
  expect(screen.getByText("Effective count: 4")).toBeVisible();
  expect(screen.getByText("The bidder wins")).toBeVisible();
});
```

Expected: FAIL until the final result component explains every field.

- [ ] **Step 5: Implement result and recovery language**

`RoundResult` renders both rolls only from post-resolution evidence. `MatchResult` renders final score and mode-specific rematch state. Wallet rejection says “Nothing was submitted.” Stale state says “The game moved on; refreshed to the latest turn.” Robot failure allows Retry once and Exit without changing score. Delayed attestation keeps “Verifying hidden dice” and never reveals partial values.

- [ ] **Step 6: Write and run complete Robot/mobile browser tests**

```ts
// frontend/e2e/robot-match.spec.ts
test("a first-time player completes and rematches a Robot match", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Play Robot" }).click();
  await expect(page.getByLabel("Dice per side")).toHaveValue("4");
  await page.getByRole("radio", { name: "Medium" }).check();
  await page.getByRole("button", { name: "Start match" }).click();
  await playRobotMatchToCompletion(page);
  await expect(page.getByRole("heading", { name: /match winner/i })).toBeVisible();
  await page.getByRole("button", { name: "Rematch" }).click();
  await expect(page.getByText("Round 1")).toBeVisible();
  await expect(page.getByText("0–0")).toBeVisible();
});

test("wallet rejection preserves the current turn and offers retry", async ({ page }) => {
  await openSeededActiveMatch(page);
  await rejectNextWalletRequest(page);
  await page.getByRole("button", { name: "Raise" }).click();
  await expect(page.getByText("Nothing was submitted")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry Raise" })).toBeEnabled();
  await expect(page.getByText("Your turn")).toBeVisible();
});

// frontend/e2e/mobile.spec.ts
test.use({ viewport: { width: 320, height: 700 } });
test("primary game actions remain reachable without horizontal scrolling", async ({ page }) => {
  await openSeededActiveMatch(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await expect(page.getByRole("button", { name: "Raise" })).toBeInViewport();
  await expect(page.getByRole("button", { name: "Challenge" })).toBeInViewport();
});
```

Run:

```powershell
npm --workspace frontend test
npm --workspace frontend run e2e -- robot-match.spec.ts mobile.spec.ts
npm --workspace frontend run lint
npm --workspace frontend run build
```

Expected: unit, browser, lint, and build commands exit 0 with no warnings produced by Hecliar code.

- [ ] **Step 7: Run a major-feature code review**

Use `superpowers:requesting-code-review` with the base SHA from Task 9 and the current head. Provide the approved spec and Tasks 8–10 as requirements. Fix every Critical and Important finding through a failing regression test, then rerun the relevant suite.

- [ ] **Step 8: Commit**

```powershell
git add frontend
git commit -m "feat: polish responsive Hecliar experience"
```

### Task 11: Confidentiality Audit and Acceptance Harness

**Files:**
- Create: `scripts/audit-confidentiality.mjs`
- Create: `scripts/verify-acceptance.mjs`
- Create: `frontend/e2e/confidentiality.spec.ts`
- Create: `docs/confidentiality-audit.md`
- Create: `docs/acceptance-evidence.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: compiled ABI, contract tests, robot API, running browser flow
- Produces: repeatable `npm run audit:confidentiality` and `npm run verify:acceptance` with machine-readable failures and human-readable evidence

- [ ] **Step 1: Write a failing static audit**

```js
// scripts/audit-confidentiality.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { globSync } from "glob";

const productionFiles = globSync([
  "contracts/contracts/**/*.sol",
  "frontend/{app,components,hooks,lib,server}/**/*.{ts,tsx}",
], { nodir: true });

const violations = [];
for (const file of productionFiles) {
  const source = readFileSync(file, "utf8");
  if (file !== "frontend/lib/logging/safe-log.ts" && /\bconsole\.(log|info|debug|warn|error)\b/.test(source)) {
    violations.push(`${file}: direct console call`);
  }
  if (file !== "frontend/lib/storage/public-recovery.ts"
      && /\b(localStorage|sessionStorage|indexedDB|caches)\b/.test(source)) {
    violations.push(`${file}: browser persistence access`);
  }
  if (/emit\s+\w+\([^;]*(diceValues|gadgetKind|gadgetTarget|scannerResult)/is.test(source)) {
    violations.push(`${file}: secret-looking event argument`);
  }
}

assert.deepEqual(violations, [], `confidentiality violations:\n${violations.join("\n")}`);
console.log(`Static confidentiality audit passed for ${productionFiles.length} files`);
```

Add `glob` as a pinned root development dependency and run `node scripts/audit-confidentiality.mjs`.

Expected: FAIL on generated example logging/persistence or any direct production console call.

- [ ] **Step 2: Remove static leak paths and make the audit pass**

Delete unused generated analytics and persistence code. Route permitted metadata logs through `safeLog`. Keep wallet-library internal storage outside the Hecliar production source scan; document that vendor-controlled wallet session storage is inspected separately for game secrets.

Run `node scripts/audit-confidentiality.mjs`.

Expected: PASS.

- [ ] **Step 3: Write runtime browser leakage tests**

```ts
// frontend/e2e/confidentiality.spec.ts
test("opponent secrets never leak before challenge resolution", async ({ browser }) => {
  const host = await walletContext(browser, HOST_ACCOUNT_INDEX);
  const guest = await walletContext(browser, GUEST_ACCOUNT_INDEX);
  const knownHostSecret = ["6", "6", "5", "4"];
  const knownGuestSecret = ["1", "2", "3", "3"];
  const traffic: string[] = [];
  const consoleMessages: string[] = [];

  host.page.on("request", (request) => traffic.push(request.postData() ?? ""));
  host.page.on("response", async (response) => traffic.push(await safeResponseText(response)));
  host.page.on("console", (message) => consoleMessages.push(message.text()));

  await openSeededFriendMatch(host.page, guest.page, {
    hostRoll: knownHostSecret,
    guestRoll: knownGuestSecret,
    hostGadget: "echo",
    guestGadget: "scanner",
  });

  const surfaces = await inspectBrowserSurfaces(host.page);
  const beforeReveal = JSON.stringify({ traffic, consoleMessages, surfaces, html: await host.page.content() });
  expect(beforeReveal).not.toContain(knownGuestSecret.join(","));
  expect(beforeReveal).not.toContain('"scanner"');
  await expect(host.page.getByText("4 hidden dice")).toBeVisible();

  await challengeAndSettle(host.page, guest.page);
  await expect(host.page.getByText("1, 2, 3, 3")).toBeVisible();
});
```

`inspectBrowserSurfaces` returns localStorage, sessionStorage, IndexedDB database names/records, cookies, Cache Storage keys/responses, and service-worker registrations/messages. It redacts wallet-provider tokens before snapshotting but does not redact game-shaped fields.

- [ ] **Step 4: Add contract/RPC/event access probes**

Extend `HecliarGame.confidential.test.ts` to query as:

- secret owner;
- opponent;
- robot;
- unrelated fourth wallet; and
- public client without an account.

Before challenge, only owner access succeeds. Fetch all logs from round creation
through challenge and decode every event input. Before the reveal transaction,
assert no value equals any seeded plaintext die, gadget enum, target, or Scanner
boolean. After reveal, dice may appear; gadget assignments, targets, and Scanner
results must remain absent.

After challenge, assert:

- both active rolls are revealed;
- nonzero per-seat Echo/Jammer effect codes are revealed and explain every
  scoring adjustment;
- gadget assignments and targets remain inaccessible;
- unused gadget assignment remains inaccessible; and
- Scanner result remains accessible only to its owner.

- [ ] **Step 5: Add robot API/log probes**

Invoke the route with extra fields `humanDice`, `humanHandles`, `gadget`, and `plaintext`; strict schema validation must return 400. Capture logs and responses from a successful action and assert they contain only the safe-log allowlist.

Search the built client:

```powershell
rg -n --hidden --glob '!*.map' 'ROBOT_PRIVATE_KEY|PRIVATE_KEY_BASE|humanDice|scannerResult' frontend/.next/static
```

Expected: no private key values or server observation symbols in client chunks.

- [ ] **Step 6: Implement the acceptance verifier**

```js
// scripts/verify-acceptance.mjs
import { spawnSync } from "node:child_process";

const checks = [
  ["rules and robot simulations", "npm", ["--workspace", "@hecliar/game-logic", "test"]],
  ["pure contract tests", "npm", ["run", "contracts:test"]],
  ["frontend unit tests", "npm", ["--workspace", "frontend", "test"]],
  ["frontend lint", "npm", ["--workspace", "frontend", "run", "lint"]],
  ["frontend production build", "npm", ["--workspace", "frontend", "run", "build"]],
  ["static confidentiality audit", "node", ["scripts/audit-confidentiality.mjs"]],
];

for (const [label, command, args] of checks) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
  console.log(`PASS: ${label}`);
}
```

Add root scripts:

```json
{
  "audit:confidentiality": "node scripts/audit-confidentiality.mjs && npm --workspace frontend run e2e -- confidentiality.spec.ts",
  "verify:acceptance": "node scripts/verify-acceptance.mjs"
}
```

- [ ] **Step 7: Run the full local confidential lifecycle**

```powershell
npm run contracts:node
npm --workspace contracts test -- --network anvil
npm --workspace frontend run e2e
npm run audit:confidentiality
npm run contracts:node:down
npm run verify:acceptance
```

Expected: all local-node contract integration, all browser tests, the runtime/static audit, unit suites, lint, and production build PASS.

- [ ] **Step 8: Write evidence documents from the fresh outputs**

`docs/confidentiality-audit.md` lists every inspected surface, command, timestamp, environment, seeded secret marker, and result. `docs/acceptance-evidence.md` maps every checkbox in PRD Section 18 and FR-1 through FR-10 to a named test or inspection with its latest result.

Do not write “pass” for a command not run in the current verification session.

- [ ] **Step 9: Commit**

```powershell
git add scripts frontend/e2e contracts/test docs package.json package-lock.json
git commit -m "test: prove acceptance and confidentiality boundaries"
```

### Task 12: Base Sepolia Deployment and Final Review

**Files:**
- Create: `contracts/scripts/wire-frontend.mjs`
- Create: `scripts/smoke-base-sepolia.mjs`
- Create: `docs/deployment.md`
- Modify: `contracts/ignition/modules/HecliarGame.ts`
- Modify: `contracts/package.json`
- Modify: `frontend/.env.example`
- Modify: `frontend/lib/contracts/hecliar.ts`
- Modify: `README.md`
- Modify: `docs/acceptance-evidence.md`

**Interfaces:**
- Consumes: verified local artifact, Base Sepolia deployer/robot credentials, RPC, wallet-provider ID
- Produces: deterministic deploy/wire/smoke commands, verified frontend configuration, final fresh evidence, independent review report

- [ ] **Step 1: Write a failing deployment-config test**

```js
// append to scripts/workspace-shape.test.mjs
const contractPackage = JSON.parse(readFileSync("contracts/package.json", "utf8"));
assert.equal(
  contractPackage.scripts["deploy:testnet"],
  "hardhat ignition deploy ignition/modules/HecliarGame.ts --network baseSepolia",
);
assert.equal(existsSync("frontend/.env.example"), true);
const envExample = readFileSync("frontend/.env.example", "utf8");
for (const name of [
  "NEXT_PUBLIC_NETWORK=testnet",
  "NEXT_PUBLIC_HECLIAR_ADDRESS=",
  "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=",
  "ROBOT_PRIVATE_KEY=",
]) {
  assert.equal(envExample.includes(name), true, `missing ${name}`);
}
```

Run `node scripts/workspace-shape.test.mjs`.

Expected: FAIL because deployment scripts/env keys are absent.

- [ ] **Step 2: Implement deploy, wire, and environment configuration**

Add exact scripts:

```json
{
  "deploy:local": "hardhat ignition deploy ignition/modules/HecliarGame.ts --network anvil",
  "deploy:testnet": "hardhat ignition deploy ignition/modules/HecliarGame.ts --network baseSepolia",
  "verify:testnet": "hardhat verify --network baseSepolia"
}
```

`wire-frontend.mjs` reads Hardhat Ignition's deployment address for chain 84532, validates it with Viem `isAddress`, and writes only:

```text
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_HECLIAR_ADDRESS=$address
```

It never reads or writes private keys.

Run `node scripts/workspace-shape.test.mjs`.

Expected: PASS.

- [ ] **Step 3: Write the testnet smoke script**

`smoke-base-sepolia.mjs`:

1. requires `BASE_SEPOLIA_RPC_URL`, `DEPLOYER_PRIVATE_KEY`, `ROBOT_PRIVATE_KEY`, and `NEXT_PUBLIC_HECLIAR_ADDRESS`;
2. verifies chain ID 84532;
3. reads bytecode at the address;
4. creates a 3-dice Robot match with gadgets disabled and the live `requiredRoundFee`;
5. privately decrypts the human roll with the human wallet;
6. verifies robot wallet cannot decrypt the human handles;
7. submits one legal opening bid;
8. has the robot challenge;
9. waits for reveal attestations and settles;
10. checks exactly one score increment and the public evidence; and
11. prints transaction hashes without printing any pre-resolution plaintext.

Use stable error codes for missing environment values and nonzero exit status on any failed step.

- [ ] **Step 4: Document exact deployment and rollback**

`docs/deployment.md` includes:

- prerequisites and faucet links;
- version pins;
- local node lifecycle;
- environment variable table with secret/public classification;
- compile/test commands;
- deploy and contract verification commands;
- frontend wiring/build/start commands;
- robot wallet funding requirement;
- contract Inco-fee behavior;
- smoke command;
- deployed address recording;
- how to disable the robot endpoint without changing contract state; and
- how to point the frontend back to a prior verified contract address.

`README.md` provides a five-command local quickstart and links to the PRD, design, plan, privacy map, deployment, acceptance evidence, and confidentiality audit.

- [ ] **Step 5: Run testnet deployment when credentials are available**

Immediately before deployment, requery the official Inco docs for current Base Sepolia support, SDK versions, fees, and API signatures. If they differ from the pinned verified local stack, update through failing compatibility tests before deployment.

```powershell
npm run contracts:compile
npm run contracts:test
npm --workspace contracts run deploy:testnet
node contracts/scripts/wire-frontend.mjs
npm --workspace frontend run build
node scripts/smoke-base-sepolia.mjs
```

Expected: deployment, frontend build, and live confidential lifecycle smoke exit 0. Record address, chain, block, transaction hashes, and timestamp in `docs/acceptance-evidence.md`.

If credentials or test ETH are unavailable, retain the passing local evidence and deployment-ready scripts, and report the exact missing external prerequisite without claiming a live deployment.

Commit the release configuration before final review:

```powershell
git add README.md docs/deployment.md docs/acceptance-evidence.md contracts frontend scripts
git commit -m "build: prepare Base Sepolia release"
```

- [ ] **Step 6: Run independent final code review**

Use `superpowers:requesting-code-review` with:

- description: complete Hecliar MVP;
- requirements: PRD, approved design, and this plan;
- base SHA: the exact output of `git merge-base main HEAD`, which is the
  committed approved plan baseline from which the worktree branch starts;
- head SHA: current implementation head.

The reviewer must inspect contract access control, reveal timing, attestation binding, sequence/state gates, API schemas/logging, client persistence, robot observation boundary, test quality, mobile UX, and deployment configuration.

For each valid Critical or Important finding:

1. use `superpowers:receiving-code-review`;
2. write a failing regression test;
3. verify the expected failure;
4. implement the minimum correction;
5. rerun the focused and full relevant suite; and
6. ask the reviewer to recheck the corrected range.

If review changes code, commit the verified corrections:

```powershell
git add contracts frontend packages scripts
git commit -m "fix: address final security review"
```

- [ ] **Step 7: Run final verification from a clean state**

Use `superpowers:verification-before-completion`. Remove only generated build/test outputs covered by documented clean commands; do not remove source or user files.

Run fresh:

```powershell
npm ci
npm run contracts:compile
npm run contracts:test
npm --workspace @hecliar/game-logic test
npm --workspace frontend test
npm --workspace frontend run lint
npm --workspace frontend run build
npm run contracts:node
npm --workspace contracts test -- --network anvil
npm --workspace frontend run e2e
npm run audit:confidentiality
npm run contracts:node:down
npm run verify:acceptance
git status --short
```

Expected:

- every command exits 0;
- zero test failures;
- frontend production build succeeds;
- confidentiality audit reports no leaks;
- `git status --short` is empty; and
- every PRD acceptance item has a fresh evidence row.

- [ ] **Step 8: Commit final release evidence**

Update `docs/acceptance-evidence.md` and `docs/confidentiality-audit.md` with the
fresh Step 7 commands, timestamps, totals, and results, then:

```powershell
git add docs/acceptance-evidence.md docs/confidentiality-audit.md
git commit -m "docs: finalize verified Base Sepolia release"
git status --short
```

Expected: the evidence commit succeeds and final status is empty.

- [ ] **Step 9: Finish the branch**

Use `superpowers:finishing-a-development-branch` only after the final verification and review pass. Present merge/PR/keep-worktree options without deleting the isolated worktree unless explicitly authorized.
