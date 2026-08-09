# Hecliar — MVP Scope and Product Requirements Document

> **One-line pitch:** Hecliar is a short onchain bluffing game where hidden dice and secret gadgets are protected by Inco Lightning, letting one player face a rule-based robot instantly or challenge a friend in a private room.
>
> **Tagline:** Roll. Bluff. Don’t get caught.
>
> **Status / Version:** Build-ready draft / v0.1  
> **Last updated:** 8 August 2026  
> **Platform:** Responsive web app; wallet-connected; Base Sepolia recommended for the hackathon build  
> **Primary build target:** Inco Summer Game Jam submission

## 1. Product Summary

Hecliar is a compact bluffing game inspired by Liar’s Dice. Each side receives confidential dice, can see only its own roll, and takes turns increasing a public bid or challenging the previous bid. When challenged, the game checks the confidential dice, reveals the outcome, and awards the round.

The product has two modes:

- **Single Player:** a human plays against a deterministic, computer-controlled robot.
- **Two Player:** one human creates a private room and another joins it.

The defining mechanic is not merely hiding values in the interface. Dice and secret gadgets must remain confidential at the game-state level, while Inco-backed computation verifies the challenge result.

## 2. Problem and Opportunity

Most blockchain game state is publicly readable. A bluffing game cannot be fair if players can inspect the chain and discover an opponent’s dice or unused ability.

Hecliar uses confidential state to make hidden information a genuine part of the rules. It is deliberately small enough to finish and polish for a hackathon while still demonstrating:

- confidential randomness and state;
- player-specific access to hidden information;
- computation over hidden dice;
- controlled reveal and verifiable settlement;
- a second hidden layer through secret gadgets.

## 3. Product Goals

### Primary goals

1. Deliver a complete, playable match without requiring another human.
2. Make Inco-powered hidden mechanics central to gameplay and visible in the demo.
3. Create tense, understandable bluffing decisions with short replayable matches.
4. Support a real two-player private-room flow without expanding into matchmaking.
5. Make the game stable and polished enough that a judge can play without guidance.

### Provisional success signals

These are validation targets, not claims about existing usage:

| Outcome | Provisional target |
|---|---:|
| A new player starts a single-player match | Within 60 seconds of opening the app, excluding wallet setup |
| Match completion | At least 80% of internally tested matches that begin |
| Core rule comprehension | Tester can correctly explain “raise or challenge” after one round |
| Game-breaking failures | None in the final scripted demo path |
| Confidentiality check | Opponent dice and unused gadgets cannot be obtained through normal UI or public contract state |
| Replay intent | At least half of playtesters choose rematch without prompting |

## 4. Target Users

| User | Job to be done | Priority |
|---|---|---|
| Hackathon judge | Start quickly, understand the confidential mechanic, and finish a match | Primary |
| Casual web3 gamer | Play a short bluffing game with meaningful risk and hidden information | Primary |
| Friend pair | Create and join a private game without public matchmaking | Primary |
| Spectator or large group | Watch or play a multi-person match | Out of scope |

## 5. Product Principles

- **Playable immediately:** Single Player is the default and does not depend on matchmaking.
- **Hidden means confidential:** Never rely on front-end concealment for secret dice or gadget state.
- **Rules before complexity:** The core raise/challenge loop must work before gadgets or visual polish.
- **Short matches:** Best-of-three rounds is the default match format.
- **No fake AI:** The opponent is called a robot and uses fixed rules plus probability calculations. No model, learning service, or AI API is involved.
- **Explain the chain:** Waiting, attestation, and settlement states must be communicated in player language.

## 6. Core Game Rules

### 6.1 Setup

1. The player chooses **3–6 dice per side**; the default is **4**.
2. In Single Player, the selection applies to both the human and robot.
3. In Two Player, the room creator selects the dice count. The joining player sees the setting before joining.
4. A match is **best of three rounds**: the first side to win two rounds wins the match.
5. At the beginning of each round, each side receives a new confidential roll.
6. Each side receives one secret gadget for the round if gadgets are enabled.

### 6.2 Bids

A bid contains:

- **quantity:** claimed number of matching dice across both sides; and
- **face:** the claimed die value from 1–6.

Example: “There are at least three 5s across our dice.”

The first player submits any valid opening bid. On later turns, a player must either:

- **Raise:** submit a bid that is higher according to the ordering rule; or
- **Challenge:** claim that the previous bid is false.

### 6.3 Recommended bid ordering

For MVP simplicity, a bid is higher when:

1. its quantity is greater than the current quantity; or
2. its quantity is equal and its face value is greater.

Examples:

- `2 × 5` can be raised to `2 × 6` or any quantity of 3 or more.
- `3 × 2` cannot be raised to `3 × 1`.

Ones are ordinary values in the MVP and are **not wild**. This removes a rule exception and makes robot probability calculations easier to validate.

### 6.4 Challenge and round result

1. A player challenges the immediately preceding bid.
2. The game counts matching dice across both confidential rolls.
3. If the count is at least the bid quantity, the bidder wins the round.
4. Otherwise, the challenger wins the round.
5. The UI reveals the dice and displays the count, the challenged bid, and why the winner won.
6. The next round begins after both the result and required confidential-compute settlement are complete.

### 6.5 Turn and disconnect behavior

- Recommended turn timer: **45 seconds**.
- In Single Player, the robot should act after a short presentation delay, targeted at 0.8–1.8 seconds once it has the information it is permitted to use.
- In Two Player, an expired turn causes that player to forfeit the round.
- If a player disconnects, the room should preserve the match for a provisional **2-minute reconnection window** before the disconnected player forfeits the match.

## 7. Secret Gadgets

Gadgets add a second confidential mechanic, but the first playable slice should work without them.

### MVP gadget set

Use a small, testable set:

| Gadget | Effect | Visibility |
|---|---|---|
| Echo | One selected die owned by the user counts twice when a challenge is resolved | Secret until resolution |
| Jammer | One selected opponent die is ignored when a challenge is resolved | Secret until resolution |
| Scanner | Privately tells the user whether the total count for one selected face meets a selected threshold | Only the owner sees the result |

### Gadget rules

- Each side may use at most one gadget per round.
- A gadget cannot be reused.
- Gadget ownership, selection, and private results must not be exposed to the opponent before the rules require revelation.
- The game must show when a gadget can be used and prevent invalid targets.
- At round resolution, applied scoring modifiers should be disclosed clearly enough to explain the result.
- If gadget implementation threatens the stable core match, ship with gadgets disabled behind a feature flag and add them after the raise/challenge loop is reliable.

## 8. Game Modes

### 8.1 Single Player versus Robot

The player:

1. selects dice count and robot difficulty;
2. connects a wallet if required by the final transaction design;
3. starts immediately;
4. receives a private roll;
5. alternates bids and challenges with the robot;
6. completes a best-of-three match;
7. can start a rematch with the same settings.

#### Robot information boundary

The robot may use:

- its own permitted dice;
- current public bid;
- public turn and round state;
- public actions from the current match;
- difficulty configuration.

The robot must not receive or infer the player’s confidential dice from privileged backend access.

#### Difficulty behavior

| Difficulty | Behavior |
|---|---|
| Easy | Favors bids supported by its own dice, bluffs rarely, and challenges only low-probability bids |
| Medium | Uses probability thresholds, sometimes bluffs, and varies between raising and challenging |
| Hard | Uses tighter probability estimates, strategically bluffs, considers public action history from the current match, and can use gadgets |

All choices come from deterministic rules with bounded randomness for variety. No AI model or learning system is included.

### 8.2 Two-Player Private Room

The host:

1. selects dice count and whether gadgets are enabled;
2. creates a room;
3. receives a shareable room code or link.

The guest:

1. opens the link or enters the code;
2. sees room settings before joining;
3. connects a different eligible wallet;
4. joins and marks ready.

The match begins when both players are ready. The room does not support spectators, public discovery, or more than two players in the MVP.

## 9. Core User Flows

### 9.1 First-time Single Player

1. Land on Hecliar and see the tagline plus two clear mode choices.
2. Select **Play Robot**.
3. Choose 3–6 dice and Easy, Medium, or Hard.
4. Start the match.
5. See only the player’s dice, current bid, turn indicator, score, and legal actions.
6. Raise or challenge.
7. See an explicit “verifying hidden dice” state when required.
8. See the resolved dice, count, winning side, and updated match score.
9. Continue until one side wins two rounds.
10. Choose Rematch or return Home.

### 9.2 Create and Join Room

1. Host selects **Play a Friend**, room settings, and Create Room.
2. Host receives a code and copyable link.
3. Guest opens or enters it and reviews the settings.
4. Both players join and confirm readiness.
5. The game alternates turns and synchronizes public state.
6. A challenge resolves through the authoritative game contract.
7. On match end, both see the same result and can agree to a rematch.

### 9.3 Rematch

- Single Player rematch starts with the same settings.
- In Two Player, both players must accept.
- A rematch creates fresh confidential dice and gadgets and resets the match score.

## 10. Screens and UI Requirements

| Screen / state | Required content |
|---|---|
| Home | Hecliar identity, tagline, Play Robot, Play a Friend, How to Play |
| Single-player setup | Dice stepper from 3–6, default 4; difficulty selector; gadget status |
| Room setup | Dice stepper; gadget toggle; Create Room |
| Join room | Code input or link resolution; host settings; Join button; invalid/full room state |
| Waiting room | Room code/link, both player statuses, selected settings, cancel/leave |
| Game table | Own dice, opponent dice count but not values, current bid, bid controls, Challenge, gadget control, turn timer, round score |
| Transaction/verification state | Plain-language status, pending indicator, retry guidance, no duplicate-action affordance |
| Round result | Both rolls, challenged bid, actual effective count, gadget effects, round winner |
| Match result | Winner, round score, Rematch, Home |
| How to Play | Setup, bidding order, challenge outcome, gadget summaries, confidentiality explanation |

### UX requirements

- Illegal bids must be disabled, not merely rejected after submission.
- Secret values must never flash in loading, hydration, debug, or error states.
- Pending actions must disable duplicate submission.
- Mobile layout must keep Raise and Challenge reachable without horizontal scrolling.
- The UI must distinguish “waiting for opponent,” “waiting for wallet,” and “verifying confidential result.”
- The game must explain why a transaction or signature is requested before prompting for it.

## 11. Functional Requirements

### FR-1 — Game creation

- The user can start Single Player or create a Two Player room.
- Dice count accepts only integers from 3 through 6 and defaults to 4.
- **Acceptance:** Given the setup screen, when a user selects a valid dice count and starts, the created match uses that count for both sides.

### FR-2 — Confidential roll

- Each round creates the configured number of dice for both sides.
- A player can access only their authorized roll before resolution.
- **Acceptance:** Given an active round, when either player inspects normal UI and public game state, the opponent’s die values are unavailable before challenge resolution.

### FR-3 — Legal bids

- The game stores the active quantity, face, bidder, and turn.
- Only strictly higher bids are accepted after the opening bid.
- **Acceptance:** Given a current bid of `2 × 5`, when a player attempts `2 × 4`, the UI blocks it and the authoritative game logic rejects it.

### FR-4 — Challenge resolution

- Only the current player may challenge the preceding bid.
- The authoritative logic counts the relevant confidential dice and applies valid gadget effects.
- **Acceptance:** Given a bid of `3 × 5` and only two effective 5s, when challenged, the challenger wins and both clients display the same evidence and result.

### FR-5 — Match scoring

- A round win increments the winner’s score once.
- First to two round wins ends the match.
- **Acceptance:** Given a score of 1–1, when one side wins the next round, the match ends at 2–1 and no fourth round starts.

### FR-6 — Robot

- The robot submits only legal actions using permitted information.
- The selected difficulty changes its documented thresholds or strategy configuration.
- **Acceptance:** Given 100 simulated positions per difficulty, the robot never makes an illegal bid or acts out of turn.

### FR-7 — Private rooms

- A room admits exactly one host and one guest.
- Both clients receive authoritative public state updates.
- **Acceptance:** Given a room with two joined wallets, when a third wallet attempts to join, it receives a room-full state and cannot enter the match.

### FR-8 — Gadgets

- Each side receives no more than one gadget per enabled round and can use it no more than once.
- Gadget information follows the visibility rules in Section 7.
- **Acceptance:** Given a used gadget, when the player attempts to use it again, both UI and authoritative logic reject the action.

### FR-9 — Rematch

- A completed match can restart with fresh secrets.
- **Acceptance:** Given a completed Single Player match, when Rematch is selected, scores reset to 0–0 and new rolls are generated without reusing prior secrets.

### FR-10 — Recovery

- The client can reload an active game using wallet and match identifiers.
- **Acceptance:** Given an active match, when the player reloads the page, the app restores public state and only the player’s authorized private state.

## 12. Reference Repositories to Study

These repositories are implementation references, not the privacy architecture for Hecliar. The vibecoder should study their gameplay loops, state models, robot interfaces, room flows, and UI patterns, then implement Hecliar’s confidential dice and gadgets with Inco Lightning.

| Repository | What to study and draw from | What not to copy directly | Verified license |
|---|---|---|---|
| [Kryha/boloney](https://github.com/Kryha/boloney) | Onchain Liar’s Dice flow, multiplayer state, wallet-oriented UX, separation between frontend/backend/game proof system, and presentation of private versus public game information | Its Aleo zero-knowledge proof architecture, deployment setup, or proof toolkit as Hecliar’s privacy layer; replace these with the selected Inco Lightning patterns | Apache-2.0 |
| [Tzook/Dily](https://github.com/Tzook/Dily) | Room-based Liar’s Dice gameplay, turn synchronization, Socket.IO event flow, lobby/game transitions, and general interaction references | Its older Angular 2 stack as a required foundation; do not reuse code until its licensing status is confirmed | No license detected in GitHub metadata; treat as study-only |
| [Christdej/gathering-gaia](https://github.com/Christdej/gathering-gaia) | Web-based game creation and joining, own-dice versus hidden-opponent presentation, bid controls, challenge resolution, and multiplayer round flow | Its multiplayer elimination rules, fixed five-dice setup, and wild-ones rule unless intentionally adopted later | MIT |
| [andrijast/liars-dice](https://github.com/andrijast/liars-dice) | TypeScript game simulator, bot API contract, preset bot strategies, time limits, disconnect behavior, and automated simulations for validating Hecliar’s robot | Its rules or bot behavior unchanged; adapt the engine to Hecliar’s 3–6 dice, non-wild ones, best-of-three scoring, difficulty settings, and gadget effects | MIT |

### Required reference workflow

1. Study **Boloney** first for the closest onchain bluffing-game structure and wallet/game-state presentation.
2. Study **Dily** and **Gathering Gaia** for rooms, bidding controls, turn feedback, challenge reveals, and multiplayer UX.
3. Use **andrijast/liars-dice** as the primary conceptual reference for the rule-based robot, its action interface, simulations, timeouts, and disconnect handling.
4. Write Hecliar’s rule engine and state model against this PRD before adapting any source code, because the reference games use different dice counts, scoring, wild-card, and privacy rules.
5. Keep Inco integration isolated behind clear game-state and confidential-computation interfaces. Do not mix Aleo/ZK logic from Boloney into the Hecliar implementation.
6. Before copying code or assets, inspect the exact file’s repository license and preserve all required notices. Treat Dily as study-only unless the owner provides a usable license.

### Specific patterns to extract

| Hecliar area | Primary reference | Desired output |
|---|---|---|
| Game table and challenge reveal | Boloney + Gathering Gaia | A UI inventory or wireframe showing own dice, hidden opponent dice, active bid, Raise, Challenge, turn, score, and resolution evidence |
| Create/join/waiting-room flow | Dily + Gathering Gaia | A room-state diagram and reusable socket/event concepts adapted to a contract-authoritative game |
| Bid validation and simulations | andrijast/liars-dice | A standalone tested rules module plus automated legal-action and outcome simulations |
| Robot action contract | andrijast/liars-dice | A small interface accepting only permitted robot information and returning one legal raise, challenge, or gadget action |
| Onchain/private-state UX | Boloney | Clear wallet, pending, confidential-compute, reveal, and settlement states adapted to Inco |

The vibecoder should record any borrowed code, assets, or substantial implementation patterns in a `THIRD_PARTY_NOTICES.md` file with repository, file path, license, and modification notes.

### Official Inco implementation resources

These official resources are the source of truth for Hecliar’s confidentiality architecture. The vibecoder must consult them before choosing contract types, access controls, randomness, reveal behavior, settlement, attestations, SDK calls, network configuration, or scaffolding commands.

| Resource | Use it for |
|---|---|
| [Inco for Games](https://docs.inco.org/games/overview) | Start here for game-specific privacy design: confidential state, private dealing, public reveal, trustless settlement, and the `ConfidentialDeck` template. Use it to compare Hecliar’s dice lifecycle with Inco’s documented draw → private access → reveal → settlement lifecycle. |
| [Inco documentation home](https://docs.inco.org/) | Treat as the main documentation index and source of truth for Inco Lightning concepts, supported features, current SDKs, networks, and updated guides. |
| [Inco Quickstart](https://docs.inco.org/quickstart) | Verify prerequisites and complete the minimal local setup before integrating Hecliar-specific contracts. |
| [Build a dApp](https://docs.inco.org/quickstart/build-a-dapp) | Scaffold or wire the Solidity and frontend workspace, choose Foundry or Hardhat deliberately, configure the wallet provider and network, and implement the Inco SDK flow. At the time of this PRD, the guide documents `create-inco-app` and Base Sepolia as the default testnet option; recheck before building. |
| [Build with AI](https://docs.inco.org/build-with-ai) | Configure the official Inco agent skill and Inco MCP for the vibecoder. Use it to validate encrypted types, programmable access control, attestation, settlement choices, and the contract-to-frontend encrypt → transact → reveal/decrypt → render flow. |
| [How to Vibe Code with Inco](https://www.inco.org/blog/how-to-vibe-code-with-inco) | Follow the recommended AI-assisted workflow and understand why the coding assistant should query current Inco documentation through MCP instead of relying on remembered function names or outdated examples. |

### Required Inco workflow for the vibecoder

1. Read **Inco for Games** and write a one-page privacy map for Hecliar answering:
   - What stays secret?
   - Who may decrypt each secret?
   - When may each secret be revealed?
   - Which result must be publicly verifiable?
2. Complete the **Quickstart** and run the smallest official confidential example before writing Hecliar’s game contract.
3. Use **Build a dApp** to select and scaffold the project shape. Prefer the full monorepo when starting from scratch because Hecliar requires both Solidity contracts and a web frontend.
4. Install or enable the official Inco agent skill described in **Build with AI** for the chosen coding assistant.
5. Connect the vibecoder to the official Inco MCP endpoint documented by Inco so it can check current APIs and signatures during implementation.
6. Require the vibecoder to cite the specific Inco documentation page used whenever it introduces an encrypted type, access-control call, reveal/decrypt call, randomness method, attestation step, or settlement pattern.
7. Test the full confidential lifecycle on the recommended testnet only after it works locally: generate/encrypt → store/transact → grant access → decrypt or reveal → verify/settle → render.
8. Recheck the documentation immediately before deployment. Do not treat API examples or network details copied into this PRD as permanently current.

### Inco-specific implementation guardrails

- Inco Lightning v1 is described in the current game documentation as confidential compute for the EVM, not FHE and not zero knowledge. Do not describe Hecliar as using FHE or ZK unless the actual implemented version and official documentation support that claim.
- Do not transplant Boloney’s Aleo/ZK privacy layer into Hecliar. Its gameplay and interface are references; Inco’s official documentation defines Hecliar’s confidentiality design.
- Do not let the vibecoder invent method names from memory. It must query the installed Inco skill, Inco MCP, or current official documentation.
- Choose the settlement model deliberately for each mode. Single Player and Two Player may require different trust and verification tradeoffs; document the selected model before implementation.
- A UI-hidden value is not confidential. Verify secret protection in contract state, emitted events, RPC responses, server logs, browser storage, and analytics.

## 13. Suggested Technical Approach

The exact Inco APIs must be confirmed against the version used during implementation. The following is a recommended separation of responsibilities, not a claim about a finalized stack.

### Client

- Responsive React/Next.js web interface.
- Wallet connection and transaction status handling.
- Authorized retrieval/decryption of the player’s own dice and gadget data.
- Bid validation for immediate feedback, duplicated in authoritative logic.
- Real-time room updates through a small backend channel or chain-event subscription.

### Authoritative game contract

- Match identifiers, players, turn, bid, scores, and status.
- Confidential dice and gadget state using Inco Lightning-compatible types and access controls.
- Validation of legal actions.
- Challenge computation, controlled reveal, and settlement.
- Events sufficient for both clients to converge on the same public game state.

### Robot service

- A dedicated robot wallet submits legal game actions.
- A rule engine receives only robot-authorized secrets and public match state.
- Strategy configuration implements Easy, Medium, and Hard thresholds.
- The service never receives the human player’s confidential roll.

### Optional room/realtime service

- Maps shareable room codes to match IDs.
- Relays public state and readiness updates.
- Does not become authoritative for dice, challenge results, or match winners.
- Stores no plaintext confidential dice or gadget data.

### Recommended contract state

| Entity | Key fields |
|---|---|
| Match | id, mode, players, robot difficulty, dice count, gadgets enabled, status, round number, score |
| Round | starter, active player, current bid, encrypted rolls, encrypted gadget assignments/targets, resolution state |
| Bid | quantity, face, bidder, sequence number |
| Room metadata | code hash/mapping, host, guest, readiness, match id, expiry |

### Suggested match states

`Created → WaitingForPlayer/Ready → Rolling → ActiveTurn → ResolvingChallenge → RoundComplete → MatchComplete`

Invalid state transitions must be rejected by the authoritative layer.

## 14. Privacy, Security, and Fairness

- Do not store plaintext opponent dice or unused gadget assignments in public state, logs, analytics, error reporting, or browser persistence.
- Enforce player-specific access to confidential state.
- Treat the client and room service as untrusted; validate turns, bid ordering, gadget use, and scoring authoritatively.
- Prevent replay and duplicate settlement by tracking action sequence and round resolution state.
- Bind room participation and actions to wallet identity.
- Prevent the robot service from using privileged infrastructure access to view human secrets.
- Make reveal timing explicit: dice should reveal only at challenge resolution or match states that require it.
- Sanitize room codes and expire abandoned rooms.
- Add rate limits to room creation and robot endpoints if a public backend is deployed.
- Before submission, verify all confidentiality assumptions by inspecting public contract state, emitted events, network responses, client storage, and logs.

## 15. Error and Recovery States

| State | Required handling |
|---|---|
| Wallet rejected signature/transaction | Keep the player on the current step, explain that nothing was submitted, and offer Retry |
| Pending transaction | Disable duplicate actions and show the exact pending action |
| Transaction failure | Restore actionable controls only after state is refreshed |
| Stale client state | Refresh authoritative state; do not optimistically overwrite a newer turn |
| Invalid or expired room code | Show a clear message and return to room entry |
| Room full | Explain that two players have already joined |
| Opponent disconnects | Start reconnection timer and show remaining time |
| Robot service unavailable | Retry safely; if still unavailable, allow exit without falsely assigning a round result |
| Confidential computation/attestation delayed | Keep the round in resolving state and prevent further bids |
| Gadget target invalid | Explain valid targets and do not consume the gadget |
| Page reload | Restore the active match using wallet authorization |

## 16. MVP Scope

### Must have

- Hecliar branding and concise How to Play.
- Single Player versus rule-based robot.
- Easy, Medium, and Hard robot settings.
- Two-player private rooms with code/link joining.
- Customizable 3–6 dice per side, default 4.
- Confidential dice generation and player-specific access.
- Raise and Challenge actions with authoritative validation.
- Best-of-three match scoring.
- Challenge resolution with understandable reveal.
- Rematch flow.
- Responsive game screen.
- Loading, rejection, failure, disconnect, and recovery states.

### Should have after the core vertical slice

- Echo, Jammer, and Scanner gadgets.
- Turn timers.
- Sound and small dice/settlement animations.
- Shareable result card or copyable match summary.

### Out of scope

- AI models, LLMs, learning, or adaptive training.
- More than two active sides.
- Public matchmaking or ranked ladder.
- Spectators and tournaments.
- Tokens, wagering, prizes, NFTs, or an economy.
- Chat, social profiles, friends lists, or clans.
- Native mobile apps.
- Multiple robot personalities.
- “Chaos” difficulty.
- Cross-chain deployment or mainnet launch.

## 17. Delivery Plan

### Milestone 1 — Local rules vertical slice

- Implement match state, dice configuration, legal bid ordering, challenge logic, and best-of-three scoring with mock dice.
- Build the complete Single Player UI with a basic legal-action robot.
- Add unit tests for bids, round outcomes, and scoring.

### Milestone 2 — Confidential core

- Replace mock rolls with Inco-backed confidential randomness/state.
- Implement authorized player access and challenge computation.
- Add explicit pending, reveal, and settlement states.
- Verify that secrets do not leak through public state, events, logs, or client storage.

### Milestone 3 — Reliable robot

- Implement and test all three difficulty configurations.
- Connect the dedicated robot wallet/service.
- Prove through tests that the service cannot access the human roll.

### Milestone 4 — Two-player rooms

- Create/join flow, shareable code/link, readiness, turn synchronization, reload recovery, disconnect handling, and mutual rematch.

### Milestone 5 — Gadgets and polish

- Add gadgets one at a time, beginning with Echo.
- Add animation, sound, mobile polish, tutorial copy, and demo-safe fallback messaging.
- Run end-to-end playtests on the intended testnet.

### Recommended first build slice

Build one complete Single Player round with four dice, no gadgets, a simple robot, one opening bid, raises, challenge, reveal, and a visible winner. This proves the core loop before rooms and confidential infrastructure increase complexity.

## 18. Test and Acceptance Checklist

### Rules

- [ ] Every permitted bid increase is accepted.
- [ ] Every equal or lower bid is rejected.
- [ ] A truthful bid awards the round to the bidder.
- [ ] A false bid awards the round to the challenger.
- [ ] A resolved round cannot settle twice.
- [ ] First to two wins ends the match exactly once.
- [ ] All dice counts from 3 through 6 work.

### Confidentiality

- [ ] A player can retrieve only their authorized roll before resolution.
- [ ] Public state and events do not expose raw dice or unused gadgets.
- [ ] The robot service cannot access the human roll.
- [ ] Client logs, analytics, storage, and error reports contain no opponent secrets.
- [ ] Resolution reveals only what the chosen rules require.

### Multiplayer and recovery

- [ ] A valid guest can join a host room.
- [ ] A third player cannot join a full room.
- [ ] Both clients agree on turn, bid, score, and result.
- [ ] Reload restores an active match safely.
- [ ] Disconnect timeout and reconnection work as specified.
- [ ] A Two Player rematch starts only after both accept.

### UX

- [ ] A first-time tester can start Single Player without explanation.
- [ ] The interface always identifies whose turn it is.
- [ ] Illegal bids are visibly unavailable.
- [ ] Pending and failed actions have distinct states.
- [ ] Round results explain the challenged bid, effective count, and gadget effects.
- [ ] The primary game controls remain usable on a small mobile viewport.

## 19. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Confidential computation or attestation adds latency | Turns feel broken or players submit twice | Explicit resolving state, idempotent actions, disable duplicate controls |
| Gadget scope destabilizes the core game | Incomplete submission | Feature flag gadgets; finish dice, bids, challenge, and scoring first |
| Backend can see player secrets | Undermines the product claim | Strict authorization boundary and pre-demo leakage audit |
| Robot makes illegal or implausible moves | Single Player feels unfair or unfinished | Shared bid validator and simulation tests |
| Two-player desynchronization | Conflicting game states | Contract-authoritative state, sequence numbers, refresh-on-conflict |
| Wallet friction slows judge onboarding | Judge fails to reach gameplay | Default to Single Player, concise transaction explanations, minimize prompts |
| Abandoned private rooms accumulate | Operational noise and room-code collision risk | Expiry and cleanup policy |
| Rule ambiguity confuses players | Lower fun and completion | Keep ones non-wild, show bid examples, explain every challenge result |

## 20. Assumptions

- “Hecliar” is the chosen product name; **HECLIAR** may be used as the display wordmark.
- The chosen tagline is “Roll. Bluff. Don’t get caught.”
- The latest dice decision supersedes the earlier fixed three-dice proposal: the valid range is 3–6 and the default is 4.
- Best-of-three means the first side to win two rounds wins the match; there is no separate lives system.
- The robot is rule-based and probability-driven, not AI.
- Single Player and Two Player are both MVP requirements; larger multiplayer is excluded.
- Base Sepolia is the recommended hackathon network, pending confirmation against current Inco deployment guidance.
- Inco’s exact API names, supported encrypted types, access-control calls, randomness flow, and attestation flow must be verified during implementation.
- Walletless or sponsored transactions are not assumed.
- Ones are ordinary dice rather than wild for MVP simplicity.

## 21. Open Questions

These do not block the first build slice:

1. **Who takes the first turn after round one?** Recommended default: alternate the starting side each round.
2. **Are gadgets enabled by default?** Recommended default: enabled in Two Player only after stable testing; optional in Single Player setup.
3. **Should dice be fully revealed after every challenge or should only the verified count be public?** Recommended default: reveal both rolls for clarity and demo impact, provided this matches the intended Inco settlement design.
4. **Can Scanner choose any threshold, or only the current bid’s quantity?** Recommended default: restrict it to the current bid face and quantity to simplify UI and contract logic.
5. **Will gas be sponsored for judges?** Recommended default: investigate sponsorship only after the unsponsored flow is reliable.
