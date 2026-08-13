# Hecliar — deployment and developer notes

Last updated 13 August 2026.

## Deployment

| | |
| --- | --- |
| **Contract** | `HecliarGame` |
| **Address** | `0xF003E11d9309C55788D3daBA7393453A53AD900B` |
| **Network** | Base Sepolia |
| **Chain ID** | `84532` |
| **Deployed at block** | `45404585` (v1) / redeployed 13 Aug with the friend-mode fee fix |
| **Deploy transaction** | `0x768c97441003e851e2f68b99cab847006d62c2abffb1f3bb1a18b101845165b5` (v1) |
| **Deployer** | `0xe6D52f0dF2ce8698a5DAa33c2Cac1058125B8d6a` |
| **Bytecode size** | 17,890 bytes |
| **Deploy gas** | 3,942,437 (0.0000237 ETH) |
| **Tooling** | Hardhat Ignition, module `HecliarGameModule` |

Explorer: `https://sepolia.basescan.org/address/0xF003E11d9309C55788D3daBA7393453A53AD900B`

**Two earlier deployments are superseded and should not be used.**

`0xAE0EbFa13882160d19Ef4fC747564e7f9eDFC958` cannot *start* a friend match:
`setReady` was not payable, so when the second player readied up
`_generateRound` tried to buy randomness from Inco with a zero balance and
reverted with `CallFailedAfterFeeRefresh`.

`0xb4c65c3f9485ff6B2d8D270BdE1D5338e54FBA72` cannot *finish* one:
`fundAndStartNextRound` rejected friend mode with `WrongMode`, so a match
played round one and then sat at `RoundComplete` for good. A match is
best-of-three, so it could never be won.

Robot mode was unaffected by both, because `createRobotMatch` collects the
whole round fee up front and seat 0 is the only funder.

The contract is **not verified on Basescan** yet. `hardhat.config.ts` now
carries the Basescan configuration, so verification is one command once an
Etherscan V2 key is set (free, from etherscan.io/apis):

```bash
ETHERSCAN_API_KEY=... npm --workspace contracts run verify -- 0xF003E11d9309C55788D3daBA7393453A53AD900B
```

### Inco Lightning

`@inco/lightning/src/Lib.sol` hardcodes the Lightning address as a compile-time
constant, with no chain-id switching:

```solidity
IncoLightning constant inco = IncoLightning(payable(0x4b9911b0191B0b6a6eA8F2Ed562e20Cff5AC8624));
```

That address holds deployed code on Base Sepolia, and `requiredRoundFee`
returns real values, which is the practical proof the contract can reach
Lightning — that call goes through `IIncoFeeView(address(inco)).getFee()`.

**This is worth knowing before deploying to any other chain.** The address is
baked into the bytecode at compile time, so deploying elsewhere silently
produces a contract that points at whatever happens to live at that address on
that chain.

### Measured fee schedule

`requiredRoundFee` is `incoFee * (diceCount * 2 + (gadgets ? 2 : 0))`, and the
Lightning fee on Base Sepolia is `1e12` wei per operation:

| Dice | Gadgets | Fee per round |
| ---: | :--- | ---: |
| 3 | off | 0.000006 ETH |
| 4 | off | 0.000008 ETH |
| 4 | on | 0.000010 ETH |
| 6 | on | 0.000014 ETH |

`requiredSeatFee` is exactly half of `requiredRoundFee`: each seat in a friend
match funds its own dice and its own gadget, and the two together cover the
roll that the second `setReady` triggers. A robot match has no second payer, so
`createRobotMatch` charges the whole round fee to the human. Verified on chain:
seat 0.000004 ETH against round 0.000008 ETH at four dice.

A `createRobotMatch` costs about 1.1M gas on top of the fee — roughly
0.0000066 ETH at current Base Sepolia prices. A full match is cheap, but it is
not free, and **every round is funded separately** through
`fundAndStartNextRound`.

## What has been verified on-chain

Done against the live deployment, not a local node:

- `requiredRoundFee` returns correct values for every dice/gadget combination,
  which proves Lightning is reachable.
- `createRobotMatch` succeeds: transaction
  `0x139a1e63ef1481d45cfd40901e1e1eb7fef1c3a13a10a4254259dea8a930c605`,
  1,106,093 gas.
- `getPublicMatch(1)` returns status `3` (active turn), 4 dice, both players.
- `getMyRoundHandles(1)` returns **four real confidential handles** for the
  caller, for example
  `0x91dbcb1176007fd9f491224c929969899a0adf7cabff41c968d28029b7ce0800`.

That last one is the headline claim working on a public testnet: the dice exist
as ciphertext the contract can compute over and the opponent cannot read.

### A complete confidential round, on chain

`contracts/scripts/friend-e2e.ts` drives the whole loop with two wallets and is
re-runnable:

```bash
npx hardhat run scripts/friend-e2e.ts --network baseSepolia
```

Recorded run against the current deployment:

```
host  reads own dice: [4,1,5,4]
guest reads own dice: [1,6,5,1]
REFUSED: the guest cannot read the host's dice
claiming 2 x 4 (true across both hands)
revealed 9 handles, effective count 2
base count 2 · effective count 2 · winner seat 0 · score 1 - 0
round 2 is live, status 3
fresh dice dealt: yes
host reads new dice: [1,2,5,6]
```

Every step ran on Base Sepolia: `createRoom`, `joinRoom`, both `setReady` calls
with the seat fee, `attestedDecrypt` per seat, a refused cross-seat decrypt,
`raise`, `challenge`, `attestedReveal`, `settleChallenge` (~509,000 gas), and
`fundAndStartNextRound` into a second round with fresh dice.

The arithmetic is checkable from outside: two 5s in the host's hand and one in
the guest's make three, so a bid of three 5s held. The contract reached the same
3 by computing over ciphertext it could not read, and the count arrived carrying
covalidator signatures that `settleChallenge` verified before scoring.

**Still not exercised:** `attestedDecrypt` from a *browser* wallet. The script
signs with a local key, and MetaMask's signing prompt is a different path.
`acceptRematch` is also untouched.

## Running the app

The frontend has two transports, selected by `NEXT_PUBLIC_GAME_TRANSPORT`.

### Local (current default, and the working demo)

```bash
npm --workspace frontend run dev
```

`frontend/.env.local` holds `NEXT_PUBLIC_GAME_TRANSPORT=local`. Everything runs
in memory: no wallet, no chain, no gas, instant matches. The dice are hidden by
being in another object rather than by cryptography, so this mode demonstrates
the game but not the privacy claim.

### Chain

```bash
cp frontend/.env.deployed frontend/.env.local
# then add:
#   NEXT_PUBLIC_GAME_TRANSPORT=chain
#   NEXT_PUBLIC_ROBOT_ADDRESS=0x...
#   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...   (optional)
npm --workspace frontend run dev
```

`frontend/.env.deployed` is generated by `contracts/scripts/wire-frontend.mjs`
and carries the address, network and chain id.

**The default was deliberately left on `local`.** In chain mode the robot never
moves, because `app/api/robot/action/route.ts` is still a placeholder that
returns `{status:"ok"}` without submitting anything. Switching the default
would break the primary demo path. Friend mode needs no robot and is the
cheaper route to a genuinely on-chain demonstration.

## Redeploying

```bash
npm --workspace contracts run compile
npm --workspace contracts run deploy:testnet
node contracts/scripts/wire-frontend.mjs
```

Requires `contracts/.env` with `PRIVATE_KEY_BASE_SEPOLIA` and
`BASE_SEPOLIA_RPC_URL`. Ignition prompts for confirmation and keeps state in
`contracts/ignition/deployments/chain-84532/`, so a failed run resumes rather
than redeploying — delete that directory to force a fresh deployment.

## Testing

```bash
npm --workspace contracts test      # typecheck, reset the node, 49 tests
npm --workspace frontend test       # 60 tests
npm --workspace frontend run e2e    # Playwright, robot mode on port 3210
```

The contract suite resets the Docker node first, so it needs Docker running. Use
`test:fast` to skip the reset while iterating.

## Things that will bite you

**Public RPC reads go stale.** Right after a confirmed transaction,
`https://sepolia.base.org` returned an empty match and a `NotPlayer` revert for
a match that had just been created successfully; the same read was correct
moments later. The load balancer routes reads to nodes at different heights.
`lib/game/contract-adapter.ts` waits for receipts, which is necessary but *not*
sufficient — a read after a confirmed write can still hit a lagging node. A
dedicated RPC (Alchemy, QuickNode) largely removes this.

**The public RPC also drops requests.** The first deploy failed with a 502
while waiting for the receipt, after the transaction had already been sent.
Ignition's journal recovered it, but the naive reading is "the deploy failed"
when the contract was in fact deployed. Always check the journal for a
`TRANSACTION_SEND` hash before retrying.

**The covalidator lags the chain.** It observes blocks on a poll, so a handle
cannot be decrypted the instant it is created. Both `lib/game/attestation.ts`
and `contracts/test/helpers/inco.ts` retry for 9 seconds. Base Sepolia block
times are longer than the local node's, so this matters more, not less.

**hardhat-viem resolves writes on submission, not on mining.** This produced a
different failing contract test on every run until `withConfirmedWrites` wrapped
the fixtures. Any new test that writes and then reads needs the same treatment.

**The frontend ABI is hand-written** in `lib/contracts/hecliar.ts`. It had
`scannerResult` as `bool` where the contract returns `bytes32` (an `ebool`),
which would have mis-decoded every call on a live chain.
`frontend/test/abi-matches-artifact.test.ts` now compares it against the
compiled artifact, but it skips when `contracts/artifacts` is absent, so run
`npm --workspace contracts run compile` before trusting it.

## Known gaps

1. **The robot route is a placeholder.** `app/api/robot/action/route.ts` returns
   `{status:"ok"}` and submits nothing. On-chain robot play needs a server-side
   signer that decrypts the robot's dice and sends its action. This is the last
   large piece.
2. **Attestation packing is duplicated** between
   `frontend/lib/game/attestation.ts` and `contracts/test/helpers/inco.ts`. Two
   hand-synced copies of security-relevant packing should become one shared
   package.
3. **Gadget effects are not broken down** in `getRoundResult`; `effects` is
   always empty. Correct while gadgets are disabled, and the difference is still
   visible as `effectiveCount - baseCount`.
4. **The contract is unverified on Basescan.**
5. **Playwright has never been run** in this working session.

## Secrets

`contracts/.env` and `frontend/.env.local` are gitignored, and no environment
file is tracked. `contracts/.env` currently also holds `PRIVATE_KEY_BASE`, a
**mainnet** key that a testnet deployment does not need — worth removing until
a mainnet deployment is actually planned.

Never give the robot's private key a `NEXT_PUBLIC_` prefix; that ships it to
the browser. `NEXT_PUBLIC_ROBOT_ADDRESS` is an address, and is safe to expose.
