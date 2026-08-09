# Task 5 Report — Confidential Contract Foundation and Private Rolls

## Status

`DONE_WITH_CONCERNS`

The Task 5 implementation is complete and all available non-Docker gates pass.
The production Inco lifecycle suite remains unverified because Docker, the
version-matched Anvil node, and the covalidator are unavailable on this host.
No plaintext randomness or weakened production test path was introduced to
work around that environment boundary.

## Delivered

- Added the exact `Mode`, `MatchStatus`, `GadgetKind`, `Bid`, and
  `MatchPublic` Solidity types and all required custom-error declarations.
- Added pure on-chain bid ordering and bounds validation in `BidRules`.
- Added monotonic match IDs and the exact room mappings:
  `_matches`, `matchByRoomHash`, `roomHashByMatch`, `roomExpiry`, and
  `nextMatchId`.
- Added Friend room creation, inspection, capped 24-hour TTL, distinct guest
  admission, expired/not-found/duplicate/full-room rejection, and transition
  to `WaitingForReady`.
- Added Robot match creation for two distinct wallet addresses. Robot matches
  start round 1 with both seats ready and the human as the starting/active
  seat.
- Added runtime Inco fee calculation:
  `inco.getFee() * (diceCount * 2 + (gadgetsEnabled ? 2 : 0))`.
- Enforced exact round funding; both underpayment and surplus payment revert
  before match allocation, so accidental ETH cannot become trapped.
- Added production confidential generation with exactly one fee-charging
  `e.randBounded(6)` per active die, followed by `.add(1)`, and exactly one
  `e.randBounded(3)` gadget assignment per enabled seat.
- Added immediate persistent contract authorization and owner-only
  authorization for every stored die and gadget handle.
- Added private `RoundSecret` storage with fixed six-die arrays. Inactive dice
  slots and disabled gadget slots remain zero.
- Added caller-derived and seat-explicit owner-scoped handle views. Opponent
  and unrelated callers are rejected before any handle tuple is returned.
- Added the authorized deterministic `HecliarGameHarness` seam. Production
  randomness remains unchanged.
- Added shared Lightning test helpers using `Lightning.localNode("mainnet")`,
  strict zero-slot-aware attestation packing checks, and the Ignition
  deployment module.
- Configured Hardhat to compile Solidity test harnesses from the brief-required
  `contracts/test/helpers` location.
- No generated example contracts or tests were present at base `748a818`, so
  there was nothing to remove after the baseline compile.

## TDD Evidence

### Bid rules

1. RED: `npx hardhat test --network hardhat --grep "BidRules"` first failed
   because the required Solidity harness directory was outside Hardhat's
   default source root.
2. The test-infrastructure source root was corrected.
3. RED: the rerun failed with `HH404` because
   `contracts/libraries/BidRules.sol` did not exist.
4. GREEN: after the minimal library implementation, both bid tests passed
   (`2 passing`).

### Room foundation

1. RED: `npx hardhat test --network hardhat --grep "HecliarGame rooms"`
   failed with `HH700: Artifact for contract "HecliarGame" not found`.
2. GREEN: after adding the exact types, errors, mappings, and room functions,
   the initial focused suite passed (`5 passing`).
3. Two intermediate assertion failures were traced to test-only address
   checksum normalization and Chai BigInt matcher limitations; only the
   assertions were corrected.
4. RED: a joined-room lifetime test then proved that expiry incorrectly kept
   applying after admission.
5. GREEN: expiry was scoped to `WaitingForPlayer`; the room suite now passes
   (`6 passing`).

### Confidential foundation

1. RED: `npx hardhat test --network hardhat --grep "confidential rounds"`
   failed at compile time because the authorized harness overrides had no
   `_randomDie` or `_randomGadget` implementation to override.
2. The minimal production fee, generation, storage, grant, and scoped-view
   implementation was added.
3. GREEN available gates: Solidity compiles and the full contract TypeScript
   surface type-checks.
4. The production runtime GREEN is intentionally not claimed. Those tests
   require the real local Inco executor and covalidator and are preserved as
   the Docker gate below.

### Attestation packing

1. RED: the helper suite proved that inactive fixed zero slots incorrectly
   required attestations and duplicate requested handles were not rejected.
2. GREEN: packing now validates unique nonzero requested handles, requires one
   signed attestation for each, rejects unexpected/duplicate/unsigned input,
   and reconstructs inactive slots as zero values with empty signature arrays
   (`3 passing`).

## Verification Evidence

| Gate | Result |
|---|---|
| `npm run contracts:compile` | PASS; Solidity 0.8.30, Cancun |
| `npx hardhat test --network hardhat --grep "BidRules\|HecliarGame rooms\|Inco test helpers"` | PASS; 11 tests |
| `npx tsc --noEmit` in `contracts` | PASS |
| `npm --workspace @hecliar/game-logic test` | PASS; 50 tests |
| `npm --workspace @hecliar/game-logic run build` | PASS |
| `npm --workspace @hecliar/game-logic run lint` | PASS |
| `npm --workspace frontend test` | PASS; 25 tests |
| `npm --workspace frontend run lint` | PASS |
| `git diff --check` | PASS |
| Inco dependency audit | PASS; Solidity and JS packages both `1.0.2` |
| Local image audit | PASS; Anvil and covalidator images both `v1.0.2` |

Hardhat reports the pre-existing environment warning that Node.js `v25.8.0`
is outside Hardhat's supported Node range. A fresh dependency compile may also
show the upstream Inco EIP-1153 composability warning from
`BaseAccessControlList.sol`. No warning originates from Hecliar source.

## Lightning / Privacy Validation

- **Secret definition:** each die and the associated stored roll handle;
  gadget assignments are also confidential handles.
- **Audience before challenge:** contract plus owning seat wallet only.
- **Reveal timing:** no reveal occurs in Task 5.
- **Randomness:** production uses only Inco TEE
  `e.randBounded(6).add(1)` and `e.randBounded(3)`.
- **Handle lifecycle:** every active stored die and enabled stored gadget is
  immediately followed by `allowThis()` and `allow(owner)`.
- **Wrong-address grants:** grants use the indexed seated player address; no
  opponent, unrelated caller, `tx.origin`, or robot grant exists on a human
  handle.
- **Fee funding:** exactly `2 * diceCount` die draws plus two gadget draws when
  enabled; `.add(1)` is a free operation over an existing handle. Both
  underpayment and overpayment reject.
- **Encrypted branching:** no `if`, `require`, or revert consumes an `ebool`.
- **Public projections:** `MatchPublic` contains no dice, gadget assignment,
  target, Scanner result, or plaintext secret.
- **Storage:** `_roundSecrets` is private and has no unrestricted getter.
- **Events/logs:** the HecliarGame ABI contains zero events; source contains no
  `emit`, `reveal`, plaintext/debug logging, or secret-bearing log path.
- **Views:** `getMyRoundHandles` derives the seat from `msg.sender`;
  `getRoundHandlesForSeat` verifies exact equality with that seat wallet.
- **Terminology/trust:** implementation and documentation use Inco as
  TEE-based confidential compute, never FHE or zero knowledge.

Static searches confirmed:

- no `reveal`, `attestedReveal`, plaintext, `emit`, or `event` in production
  Hecliar contract/module sources;
- no `blockhash` or `prevrandao`; `block.timestamp` appears only in public room
  expiry logic;
- no encrypted-condition branch pattern;
- no console/debug/log call;
- no public secret mapping.

## Room and Match Self-Review

- Supported dice counts are exactly 3, 4, 5, and 6; 2 and 7 reject with
  `InvalidDiceCount`.
- Client default 4 remains owned by the previously reviewed settings/UI layer;
  the contract accepts the full supported range.
- Friend rooms store only `keccak256` room hashes supplied by the caller,
  expose public settings, cap TTL to 24 hours, accept one distinct guest, and
  reject a third wallet. The admission expiry stops applying after a guest
  joins.
- Robot matches require a nonzero robot address distinct from the human and
  create exactly two seated wallet addresses.
- Match IDs start at 1 and increase monotonically.
- Inactive fixed-array slots remain zero.
- Disabled rounds generate no gadget handle.
- Enabled rounds generate exactly one gadget assignment per side; target,
  Scanner, and gadget-effect implementation remains correctly deferred to
  Task 7.
- No turn, challenge, settlement, gadget-action, recovery, or chain-gateway
  feature was preempted.
- The contract performs no external value transfer. Underfunding and surplus
  funding both revert before state mutation.

## Independent Review

The initial read-only review found no critical issues and three important
gaps:

1. surplus fee trapping;
2. zero-handle reconstruction in settlement packing; and
3. missing owner/opponent ACL decryption assertions.

All three were addressed. The residual review found no remaining critical or
important code findings and returned **Ready**, with the same Docker-backed
Inco integration gate documented below.

## Explicit Unverified Docker Gate

The required command:

```powershell
npm run contracts:node
```

was executed and failed before startup with:

```text
'docker' is not recognized as an internal or external command,
operable program or batch file.
```

The brief's exact command:

```powershell
npm --workspace contracts test -- --network anvil --grep "confidential rounds"
```

was also executed. Because the existing workspace test script already embeds
`--network anvil`, Hardhat rejected the duplicated flag with `HH309: Repeated
parameter --network`.

The equivalent non-duplicated command:

```powershell
npm --workspace contracts test -- --grep "confidential rounds"
```

was executed after the review fixes and discovered all 11 production
confidential tests, but every case stopped at `HH108: Cannot connect to the
network anvil`. Therefore these remain mandatory before deployment:

```powershell
npm run contracts:node
npm --workspace contracts test -- --grep "confidential rounds"
npm run contracts:node:down
```

Expected verified scope once Docker is available:

- 3, 4, 5, and 6 confidential dice per side;
- enabled/disabled gadget handle counts;
- runtime fee arithmetic and underfunding;
- distinct human/robot wallets;
- owner, opponent, and unrelated handle access boundaries;
- real covalidator processing and owner decryption;
- decrypted die bounds and active-handle uniqueness; and
- exact surplus-funding rejection.

## Files

- `contracts/hardhat.config.ts`
- `contracts/contracts/libraries/HecliarTypes.sol`
- `contracts/contracts/libraries/BidRules.sol`
- `contracts/contracts/HecliarGame.sol`
- `contracts/test/BidRules.test.ts`
- `contracts/test/HecliarGame.rooms.test.ts`
- `contracts/test/HecliarGame.confidential.test.ts`
- `contracts/test/IncoHelpers.test.ts`
- `contracts/test/helpers/BidRulesHarness.sol`
- `contracts/test/helpers/HecliarGameHarness.sol`
- `contracts/test/helpers/inco.ts`
- `contracts/ignition/modules/HecliarGame.ts`
