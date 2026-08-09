# Hecliar MVP Design

**Date:** 2026-08-09
**Status:** Approved design
**Product source:** `hecliar-prd.md`
**Target network:** Base Sepolia (chain ID 84532)

## 1. Purpose

Hecliar is a responsive, wallet-connected bluffing game for one human versus a rule-based robot or two humans in a private room. Each side rolls three to six dice, sees only its own roll, and alternates between raising a public bid and challenging the previous bid. The first side to win two rounds wins the match.

Inco Lightning protects dice, gadget assignments, gadget targets, and private Scanner results. Hidden information is confidential at the contract and access-control layer rather than merely absent from the interface.

This design covers the entire MVP as one integrated product delivered in independently testable vertical slices.

## 2. Scope Decisions

The following PRD recommendations are binding for the MVP:

- Dice count is an integer from 3 through 6; the default is 4.
- Ones are ordinary faces, not wild.
- A higher bid has a larger quantity or the same quantity with a larger face.
- The first side to win two rounds wins the match.
- The starting side alternates each round.
- Gadgets are optional in Single Player and enabled by default in Two Player.
- A challenge reveals both rolls and any applied gadget effects.
- Scanner evaluates only the current bid face and quantity.
- Turn duration is 45 seconds.
- A player may claim a win after the opponent has been inactive for two minutes.
- Gas sponsorship is not required for the MVP. The interface explains and requests required fees.
- No wagering, tokens, prizes, NFTs, ranked matchmaking, spectators, chat, or more than two active sides are included.

## 3. Technical Baseline

Hecliar will start from the official `create-inco-app` EVM monorepo shape:

- Next.js App Router and TypeScript for the web application
- React for the interface
- RainbowKit, Wagmi, and Viem for wallet and contract interaction
- Hardhat for Solidity compilation, tests, local Inco integration, and deployment
- `@inco/lightning` and `@inco/lightning-js` pinned to `1.0.2`
- the matching Inco local node and covalidator images pinned to `v1.0.2`
- Base Sepolia as the testnet
- Vitest for shared TypeScript unit and simulation tests
- React Testing Library for component behavior
- Playwright for browser acceptance tests

The package and local-node versions remain pinned together because the official Inco game quickstart warns that mismatched versions can fail with ciphertext authentication errors.

## 4. Reference Findings

### 4.1 Game references

- Boloney demonstrates explicit lobby, roll, turn, round-summary, and match-summary stages; separate public and private player state; targeted private messages; and visible pending proof/computation states. Its Aleo and ZK implementation will not be reused.
- Dily demonstrates small room/event concepts and a direct turn-focused table. It has no detected license and is study-only. Its practice of logging complete socket payloads must not be copied.
- Gathering Gaia demonstrates create/join interaction, own-dice presentation, bid controls, and challenge summaries. Its fixed five-dice, elimination, and wild-one rules do not apply.
- `andrijast/liars-dice` demonstrates a narrow robot request contract containing only the robot's hand, public bid, public round metadata, and opponent dice counts. It also demonstrates simulation, request correlation, timeout, and disconnect handling. Its rules and permissive logging are not reused unchanged.

No reference source code or assets are planned for copying. `THIRD_PARTY_NOTICES.md` will record conceptual references and will be updated if any source is later adapted.

### 4.2 Inco sources of truth

The implementation must cite the relevant source beside every introduced confidential primitive:

- Inco for Games: <https://docs.inco.org/games/overview>
- ConfidentialDeck lifecycle: <https://docs.inco.org/games/confidential-deck>
- Games quickstart: <https://docs.inco.org/games/quickstart>
- Access control: <https://docs.inco.org/guide/guide-access-control>
- Operations and randomness: <https://docs.inco.org/guide/operations>
- Decryption flows: <https://docs.inco.org/guide/decryption>
- Attestation verification: <https://docs.inco.org/guide/verifying-attestations>
- JavaScript encryption: <https://docs.inco.org/js-sdk/encryption>
- Attested decrypt: <https://docs.inco.org/js-sdk/attestations/attested-decrypt>
- Attested reveal: <https://docs.inco.org/js-sdk/attestations/attested-reveal>
- Fees: <https://docs.inco.org/quickstart/fees>
- Official dApp scaffold: <https://docs.inco.org/quickstart/build-a-dapp>

Inco Lightning v1 is TEE-based confidential compute for EVM. It is neither FHE nor zero knowledge. A confidential plaintext is returned by an Inco covalidator, and public settlement is supported by a covalidator attestation.

## 5. Architecture

```text
Browser
  ├─ public contract reads and event polling
  ├─ wallet-authorized private decrypt of the player's handles
  ├─ in-memory private view model (never persistent)
  └─ action transactions
          │
          ▼
HecliarGame contract on Base Sepolia
  ├─ rooms, players, settings, readiness, timers
  ├─ public bids, turns, scores, and state machine
  ├─ encrypted rolls and gadget state
  ├─ challenge reveal and attested settlement
  └─ rematch agreement
          ▲
          │ public match ID only
Robot action endpoint
  ├─ dedicated robot wallet
  ├─ decrypts only robot-authorized handles
  ├─ calls pure shared strategy
  ├─ submits validated contract action
  └─ returns transaction/public status only
```

### 5.1 Authoritative boundary

The contract is authoritative for:

- identity and seating;
- room capacity and expiry;
- dice count and gadget setting;
- readiness;
- turn and bid ordering;
- gadget-use eligibility;
- challenge state;
- attested settlement;
- scoring;
- timeouts;
- match completion; and
- rematch agreement.

The browser and robot endpoint are untrusted callers. They may offer early validation but cannot bypass contract checks.

### 5.2 Realtime synchronization

No mutable gameplay state is owned by a room server. Clients subscribe to public events and poll the current public snapshot. Every mutation includes an expected action sequence. If a client is stale, its transaction reverts and it refreshes the authoritative state.

This avoids putting dice or gadget plaintext in a realtime service and remains deployable on stateless frontend hosting.

## 6. Contract Design

### 6.1 Main types

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

struct RoundSecret {
    euint256[6][2] dice;
    euint256[2] gadgetKinds;
    euint256[2] gadgetTargets;
    ebool[2] scannerResults;
    bool[2] gadgetArmed;
    bool[2] gadgetConsumed;
}
```

Only the first `diceCount` entries in each fixed six-die array are active. Fixed-size storage and calldata bound gas and simplify settlement validation.

### 6.2 Room codes

The host generates 128 random bits and encodes them in a human-safe base32 string. The client submits `keccak256(code)`; the contract stores only the hash.

A room:

- has one host and at most one guest;
- rejects the host wallet as the guest;
- rejects a third wallet;
- exposes settings before joining;
- expires if unjoined;
- binds every action to the seated wallet; and
- maps to one match lineage across rematches.

The room code is coordination data, not confidential game state. It may appear in the URL and copy control. Dice and gadget data never do.

### 6.3 Roll generation

For every active die:

```solidity
euint256 die = e.randBounded(6).add(1);
die.allowThis();
die.allow(player);
```

Each stored handle is permanently allowed to the contract for future operations and only to its owning player for private decryption. Inactive array slots stay zero and are never exposed as usable handles.

When gadgets are enabled:

```solidity
euint256 kind = e.randBounded(3);
kind.allowThis();
kind.allow(player);
```

The required Inco fee is computed at runtime from `inco.getFee()` and validated against `msg.value`. No fee is hardcoded.

### 6.4 Bid validation

An opening bid is legal when:

- quantity is between 1 and `diceCount * 2`;
- face is between 1 and 6; and
- the caller is the active player.

A later bid is legal when the opening conditions hold and:

```text
new.quantity > current.quantity
OR
(new.quantity == current.quantity AND new.face > current.face)
```

Every successful action increments `actionSequence`, rotates the turn, and refreshes the 45-second action deadline.

### 6.5 Challenge lifecycle

Challenge is intentionally asynchronous:

1. The active player calls `challenge(expectedSequence)`.
2. The contract confirms an existing bid, correct turn, active round, and sequence.
3. It marks the match `ResolvingChallenge`, preventing further bids.
4. It computes the encrypted effective count over both rolls.
5. It applies encrypted Echo or Jammer conditions with `e.eq` and `e.select`.
6. It calls `e.reveal` on both active rolls, the effective count, and only the used gadget details required to explain the result.
7. It emits handles and public match identifiers, not plaintext.
8. Any caller obtains attested public decryptions through `attestedReveal`.
9. Any caller submits `settleChallenge(values, signatures)`.
10. The contract verifies each value against its stored handle using `e.verifyDecryption`.
11. It increments exactly one score, records evidence, and moves to `RoundComplete` or `MatchComplete`.

The resolution record contains the challenged bid, raw rolls after reveal, base matching count, disclosed gadget adjustments, effective count, winner seat, and resulting score.

Settlement requires `ResolvingChallenge` and the matching round/action sequence. Once settled, a duplicate call reverts.

### 6.6 Round progression

If neither side has two wins, either player may start the next round after settlement:

- round number increments;
- the starting seat alternates;
- the active seat becomes the starter;
- bid and per-round gadget state reset;
- fresh dice and gadgets are generated; and
- prior handles are never reused.

### 6.7 Timers

If `block.timestamp > actionDeadline`, the non-expired player may call `claimTurnTimeout`. The expired player forfeits the round.

Every valid action refreshes `abandonmentDeadline`. If no valid action occurs for two minutes, the opponent may call `claimAbandonment`, which ends the match. This is the authoritative equivalent of disconnect handling: chain state preserves the game during the window, and reload restores it through wallet identity.

### 6.8 Rematch

- Robot rematch may be requested by the human immediately after match completion.
- Friend rematch starts only when both seated wallets accept.
- A rematch resets scores, round number, bid, deadlines, and acceptance flags.
- It generates new dice and gadgets and never reuses old handles.
- Room membership and settings remain unchanged.

## 7. Gadget Design

### 7.1 Generic action

The public entry point is generic:

```solidity
function useGadget(bytes calldata encryptedTarget, uint32 expectedSequence)
```

The call makes it public that the player armed a gadget, but it does not reveal the assignment, target, or private result. The target is encrypted for the contract using the Inco JavaScript SDK.

### 7.2 Echo

Echo targets one of the owner's active dice. During resolution, if the encrypted assignment is Echo and the selected die matches the challenged face, that die adds one extra match.

### 7.3 Jammer

Jammer targets one of the opponent's active dice. During resolution, if the encrypted assignment is Jammer and the selected die matches the challenged face, that die contributes zero.

### 7.4 Scanner

Scanner has no selectable face or threshold. It evaluates the current public bid:

```text
Does the unmodified total count for currentBid.face meet currentBid.quantity?
```

The encrypted boolean result is allowed only to the owner and the contract. It is decrypted privately with `attestedDecrypt`, remains in memory, and is never emitted or revealed. Scanner cannot be used before an opening bid.

### 7.5 Gadget invariants

- At most one assignment per side per enabled round.
- At most one use per side per round.
- Invalid or out-of-range targets revert without consuming the gadget.
- Disabled rounds reject gadget use.
- Only used result-affecting gadgets are disclosed at resolution.
- Unused assignments remain confidential permanently.

## 8. Robot Design

### 8.1 Information boundary

```ts
type RobotObservation = {
  matchId: bigint;
  difficulty: "easy" | "medium" | "hard";
  ownDice: readonly DieFace[];
  dicePerSide: 3 | 4 | 5 | 6;
  currentBid: Bid | null;
  publicHistory: readonly PublicAction[];
  scores: readonly [number, number];
  gadget: RobotGadgetObservation | null;
};

type RobotAction =
  | { type: "raise"; bid: Bid }
  | { type: "challenge" }
  | { type: "use-gadget"; encryptedTarget: Hex };
```

Human dice handles are not supplied to the endpoint's decryption function. The robot contract seat receives no allowance for them, so privileged infrastructure cannot decrypt them.

### 8.2 Strategies

The rules module computes the probability that a public bid is true from:

- the robot's known matching dice;
- the number of unknown human dice; and
- a binomial distribution with probability `1/6` per unknown die.

Difficulty profiles define:

- challenge probability threshold;
- supported-bid preference;
- maximum bluff distance;
- bluff frequency; and
- whether gadgets may be used.

Easy heavily favors supported raises and challenges only very unlikely bids. Medium uses calibrated thresholds and occasional bounded bluffs. Hard uses tighter probabilities, current-match action history, and gadgets.

Bounded randomness selects among already legal candidates. The validator runs after strategy selection, so no profile can return an illegal action.

### 8.3 Endpoint

`POST /api/robot/action` accepts only a public match ID and expected sequence. It:

1. rate-limits by match and caller;
2. verifies that the match is Robot mode and it is the robot's turn;
3. loads public state;
4. loads robot handles only;
5. decrypts with the robot wallet;
6. chooses and validates an action;
7. submits the action transaction; and
8. returns a transaction hash and public status.

It never returns dice, gadgets, decrypted observations, or raw error objects. Structured logs contain request IDs, match IDs, action types, timing, and transaction hashes only.

## 9. Public and Private Projections

The frontend uses separate types:

```ts
type PublicMatchView = {
  matchId: bigint;
  mode: Mode;
  status: MatchStatus;
  players: readonly [Address, Address];
  settings: MatchSettings;
  activeSeat: 0 | 1;
  bid: Bid | null;
  score: readonly [number, number];
  round: number;
  actionSequence: number;
  deadlines: Deadlines;
};

type PrivatePlayerView = {
  ownDice: readonly DieFace[];
  gadget: GadgetKind | null;
  scannerResult: boolean | null;
};
```

`PrivatePlayerView`:

- exists only in React memory;
- is cleared on account, chain, match, or round changes;
- is excluded from persisted query caches;
- is represented as redacted data in errors and developer tools; and
- is never sent to analytics or API routes.

Only `matchId`, room code, nonsecret settings, and last selected mode may be persisted for navigation recovery.

## 10. User Experience

### 10.1 Visual direction

The interface resembles a refined confidential-game table rather than a generic dashboard:

- near-black navy background;
- warm ivory primary text;
- electric cyan for private and verified states;
- amber for wallet/pending states;
- coral for Challenge and destructive actions;
- rounded but compact table surfaces;
- large tactile dice;
- subtle grid/noise texture;
- tabular numerals for bids, timers, and scores; and
- restrained transforms and opacity transitions with reduced-motion support.

### 10.2 Screen inventory

**Home**

- HECLIAR wordmark
- “Roll. Bluff. Don’t get caught.”
- Play Robot as the primary action
- Play a Friend
- How to Play
- wallet/network status

**Setup**

- dice stepper from 3 through 6, default 4
- difficulty selector for Robot mode
- gadget toggle
- plain-language transaction explanation

**Create/join/waiting room**

- copyable code and link
- visible dice/gadget settings
- host/guest wallet status
- readiness
- invalid, expired, full, and same-wallet errors

**Game table**

```text
┌──────────────── Opponent ────────────────┐
│ Hidden dice count    score    connection │
└──────────────────────────────────────────┘
┌──────────────── Current bid ─────────────┐
│       “At least 3 dice show 5”           │
│       Your turn · 00:37                  │
└──────────────────────────────────────────┘
┌──────────────── Your hand ───────────────┐
│ [die] [die] [die] [die]    [gadget]      │
│ quantity stepper   face selector         │
│ [ Raise ]                    [ Challenge ]│
└──────────────────────────────────────────┘
```

On narrow screens, the action area stays fixed within reach and never scrolls horizontally.

**Pending/resolving**

- distinguishes wallet confirmation, transaction pending, opponent wait, robot thinking, and confidential verification;
- names the exact pending action;
- disables duplicate actions; and
- exposes retry only after authoritative refresh.

**Round result**

- both revealed rolls;
- challenged bid;
- base count;
- Echo/Jammer adjustment;
- effective count;
- explanation of why the bidder or challenger won; and
- updated score.

**Match result**

- winner and final score;
- mutual-rematch state for Friend mode;
- immediate same-settings rematch for Robot mode; and
- Home.

### 10.3 Accessibility

- All controls are keyboard reachable.
- Dice include text alternatives.
- Color is never the only status signal.
- Focus states are visible.
- Live regions announce turn, pending, and result changes.
- Animations honor `prefers-reduced-motion`.
- Primary controls meet mobile touch-target guidance.

## 11. Error and Recovery Behavior

- Wallet rejection leaves the current state unchanged and offers Retry.
- Pending actions disable duplicates.
- Failed transactions trigger an authoritative refresh before controls re-enable.
- Stale-sequence failures refresh instead of overwriting newer state.
- Invalid, expired, full, and same-wallet rooms have distinct messages.
- Robot failure retries idempotently once and then allows a safe exit without awarding a false round.
- Delayed attestations keep the match in `ResolvingChallenge`.
- Invalid gadget targets do not consume the gadget.
- Reload uses wallet identity and the persisted public match ID to restore the active match.
- Wrong network offers an explicit switch to Base Sepolia.

## 12. Security and Confidentiality Controls

### 12.1 Contract

- Store opaque Inco handles, never pre-resolution plaintext.
- Call `allowThis` for every stored handle used across transactions.
- Grant `allow(player)` only to the owner of that secret.
- Never grant the robot address access to human handles.
- Never call `reveal` before challenge resolution.
- Verify every settlement value against the exact stored handle.
- State-gate and sequence-gate every action.
- Follow checks-effects-interactions.
- Avoid external value transfer; the MVP has no wager or payout.

### 12.2 Events

Events may contain:

- match and room identifiers;
- player addresses;
- public settings;
- bids;
- state transitions;
- sequence numbers;
- scores;
- deadlines;
- encrypted handles; and
- post-resolution results.

Events must not contain:

- pre-resolution dice values;
- gadget assignments or targets;
- Scanner results;
- decrypted robot observations; or
- encrypted-input ciphertext payloads.

### 12.3 APIs and logs

- Schema allowlists reject unexpected request fields.
- Secret-bearing objects have no JSON serialization path.
- Logger redaction covers ciphertext, plaintext, dice, gadget, signatures, private keys, cookies, and authorization headers.
- Production logging uses metadata allowlists rather than object dumping.
- Error responses use stable codes and sanitized messages.
- Analytics are disabled for game-state payloads.

### 12.4 Browser

Confidentiality tests inspect:

- local storage;
- session storage;
- IndexedDB;
- cookies;
- Cache Storage;
- service-worker messages;
- query cache dehydration;
- console output;
- unhandled errors;
- network requests and responses; and
- rendered DOM before resolution.

No opponent secret or unused gadget value may appear.

## 13. Testing Strategy

### 13.1 Test-first rule

Every production behavior starts with a focused failing test. The test must fail for the expected missing-behavior reason before implementation, then pass after the minimum implementation. Refactoring occurs only with a green suite.

### 13.2 Rules tests

- all legal opening bids;
- every strictly higher bid;
- equal and lower bid rejection;
- face and quantity bounds;
- truthful and false challenges;
- gadget-modified effective counts;
- exactly-once round settlement;
- exactly-once first-to-two completion;
- alternating starters;
- dice counts 3, 4, 5, and 6; and
- fresh-secret rematches.

Property tests enumerate or generate the bounded bid space.

### 13.3 Robot tests

- at least 100 simulated positions per difficulty;
- no illegal action;
- no action out of turn;
- difficulty thresholds are observably distinct;
- deterministic output under a seeded randomness source;
- human roll is absent from the observation type and endpoint;
- robot wallet cannot decrypt human handles; and
- timeout and retry are idempotent.

### 13.4 Contract tests

- room creation, settings, expiry, join, full-room rejection, and same-wallet rejection;
- readiness and start;
- access-control grants;
- encrypted roll count for every supported dice setting;
- action sequence and turn enforcement;
- asynchronous challenge/reveal/settle;
- attestation binding;
- duplicate settlement rejection;
- turn and abandonment claims;
- gadget ownership, targeting, private Scanner result, one-use rule, and resolution;
- score and match termination; and
- mutual Friend rematch.

Pure tests run without Docker. Confidential lifecycle tests run against the version-matched local Inco node and covalidator.

### 13.5 Browser tests

- first-time Robot flow through a complete best-of-three match;
- every dice setting;
- Create Room in one browser context and Join in another;
- both clients converge on turn, bid, score, and result;
- third wallet sees room full;
- reload restores public and authorized private state;
- timeout/reconnection window;
- mutual rematch;
- rejected wallet and failed transaction recovery;
- delayed confidential verification;
- small mobile viewport usability; and
- no secret in browser persistence, console, DOM, or network before reveal.

### 13.6 Final confidentiality audit

The audit produces a checked report covering:

1. contract storage and public view calls;
2. emitted event topics and payloads;
3. RPC traces for roll, gadget, raise, challenge, and settle;
4. robot API requests, responses, and structured logs;
5. browser storage and cache surfaces;
6. analytics and error-reporting hooks;
7. pre-resolution DOM and accessibility tree;
8. access checks from owner, opponent, robot, and unrelated wallets; and
9. post-resolution disclosure limited to the designed evidence.

## 14. Delivery Slices

1. **Rules vertical slice:** Pure settings, bid ordering, round outcome, scoring, and robot action contract with tests.
2. **Local Robot match:** Complete best-of-three interface using a deterministic in-memory confidential adapter.
3. **Official Inco baseline:** Run the smallest official example, configure the Inco documentation source, and replace the adapter with real confidential rolls and attested settlement.
4. **Robot service:** Dedicated wallet, authorized robot decrypt, three strategies, simulations, and sanitized endpoint.
5. **Friend rooms:** Create, inspect settings, join, ready, play, recover, timeout, complete, and mutual rematch.
6. **Gadgets:** Echo, then Jammer, then Scanner, each introduced through its own red-green-refactor cycle.
7. **Polish and deployment:** Responsive refinement, accessibility, error states, Base Sepolia configuration, acceptance run, confidentiality audit, and code review.

Each slice must leave an independently runnable, tested product state.

## 15. Deployment

The deployable artifact consists of:

- a verified `HecliarGame` deployment on Base Sepolia;
- a Next.js frontend configured by environment variables;
- a server-side robot wallet and RPC configuration;
- no client-exposed private key;
- contract address and chain configuration generated from deployment output;
- documented local-node, local-development, test, build, and deployment commands; and
- a testnet smoke-test script that creates and completes at least one Robot match.

Actual Base Sepolia deployment requires a funded deployer/robot wallet, an RPC endpoint if the default public endpoint is insufficient, and any wallet-provider project identifier required by RainbowKit. Local completion and deployability must not be blocked on those credentials; testnet execution is reported separately if credentials are unavailable.

## 16. Definition of Done

The MVP is complete only when fresh evidence proves:

- Single Player works end to end for Easy, Medium, and Hard.
- Two different wallets can create, join, complete, and mutually rematch.
- Every dice count from 3 through 6 works and setup defaults to 4.
- Raise, Challenge, gadget effects, and first-to-two scoring match this design.
- Inco protects dice and gadget information with correct handles, allowances, reveal timing, and attestations.
- Opponent secrets are absent from contracts, events, APIs, logs, browser persistence, and pre-resolution rendering.
- All PRD acceptance criteria have mapped passing tests or explicit inspection evidence.
- Unit, simulation, integration, browser, build, and confidentiality-audit commands pass from a clean checkout.
- Critical and important code-review findings are resolved.
- The application is responsive, accessible, polished, and configured for Base Sepolia.
