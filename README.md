# Hecliar

**Liar's dice where the protocol keeps your secret.**

Your dice are encrypted on-chain by [Inco Lightning](https://www.inco.org/), not
hidden by the interface. The contract counts them without being able to read
them, and a challenge settles on values the covalidator signed — so neither
player, nor the front end, nor anyone reading the chain can see the other's
hand before the reveal.

Roll. Bluff. Don't get caught.

---

## The claim, and the evidence

Most onchain games call state "hidden" while it sits in public storage. Hecliar
does not, and the difference is testable. One recorded run of
[`contracts/scripts/friend-e2e.ts`](contracts/scripts/friend-e2e.ts) against the
live contract on Base Sepolia:

```
host  reads own dice: [4,1,5,4]
guest reads own dice: [1,6,5,1]
REFUSED: the guest cannot read the host's dice
claiming 2 x 4 (true across both hands)
revealed 9 handles, effective count 2
base count 2 · effective count 2 · winner seat 0 · score 1 - 0
round 2 is live, status 3
fresh dice dealt: yes
```

The arithmetic is checkable from outside the system. The host holds two 4s and
the guest none, so two 4s exist. A bid of two 4s therefore held and the
challenge lost. **The contract reached the same 2 by computing over ciphertext
it could not itself read**, and the count arrived carrying covalidator
signatures that `settleChallenge` verified before it scored anything.

Step five is the product's whole claim written as an assertion rather than as
copy: the guest asks the covalidator for the host's handles and is refused. The
script fails if that decryption ever succeeds.

Re-run it yourself:

```bash
npx hardhat run scripts/friend-e2e.ts --network baseSepolia
```

## Deployment

| | |
|---|---|
| Contract | [`0xF003E11d9309C55788D3daBA7393453A53AD900B`](https://sepolia.basescan.org/address/0xF003E11d9309C55788D3daBA7393453A53AD900B) |
| Network | Base Sepolia (84532) |
| Confidentiality | Inco Lightning |
| Source | [Verified on Basescan](https://sepolia.basescan.org/address/0xF003E11d9309C55788D3daBA7393453A53AD900B#code) |

## The game

Each side is dealt confidential dice and can read only its own. Players take
turns raising a public bid — *"at least three dice show 5"* — until someone
challenges. The challenge opens both hands, the contract counts, and the bid
either held or it did not. First to two rounds wins.

**Two modes:**

- **Play the robot** — instant, no wallet, no transaction. The opponent is a
  rule-based robot with fixed probability logic, not a model.
- **Play a friend** — a private room on Base Sepolia. Two wallets, real
  confidential dice, settlement verified on-chain.

The transport follows the mode rather than a setting: robot play runs in memory,
friend play runs on the contract. Neither works on the other's transport, so the
app picks per mode and both work from one build.

## Running it

```bash
npm install
npm --workspace frontend run dev
```

Robot mode works immediately. Friend mode needs a deployed contract address in
`frontend/.env.local` and a wallet with Base Sepolia ETH:

```bash
NEXT_PUBLIC_HECLIAR_ADDRESS=0xF003E11d9309C55788D3daBA7393453A53AD900B
```

## Tests

```bash
npm --workspace contracts test    # 49 — resets the local Inco node first
npm --workspace frontend test     # 61
npm --workspace frontend run e2e  # 2 Playwright specs, both viewports
```

The contract suite runs against a real local Inco node in Docker, not a mock.
`npm test` resets that node first, because the covalidator observes blocks on a
poll and a warm node scored differently from a cold one — the suite gave
anywhere from 31 to 36 passes before the races were closed.

## How the confidentiality works

`getMyRoundHandles` is scoped to `msg.sender`, so a player only ever receives
handles for their own dice. Turning a handle into a face requires
`attestedDecrypt` **signed by that wallet**; the covalidator checks the contract
granted that address access. An opponent asking for the same handles is refused
at the protocol level — not hidden by the UI.

Calling `challenge` is the moment the contract authorises those handles to be
opened. `attestedReveal` then returns the values with covalidator signatures
attached, and `settleChallenge` verifies each one on-chain before scoring. The
contract never takes the client's word for a die.

More detail in [`docs/privacy-map.md`](docs/privacy-map.md) and
[`DEV.md`](DEV.md).

## Layout

```
contracts/            Solidity, Hardhat, the Inco integration
  scripts/friend-e2e  A full confidential match, end to end, on Base Sepolia
frontend/             Next.js app
  lib/game/           Gateways: in-memory and on-chain
packages/game-logic/  Rules, robot, and the attestation packing
```

The attestation packing lives in `game-logic` so the browser, the contract
tests and the scripts share one implementation. It decides which signed values
get submitted for on-chain verification, which is not code to keep two copies
of.

## What is not done

Being straight about this, because a hackathon demo should not pretend
otherwise:

- **The contract is unaudited.** It holds player funds briefly, between the
  seat fee and the round being dealt. Testnet only.
- **The robot has no on-chain signer.** `/api/robot/action` is a placeholder,
  which is why robot mode runs in memory.
- **`acceptRematch` has never run on-chain.** Two rounds are proven; a full
  best-of-three match is not.
- **Gadget effects are not broken out** in the round result. The contract
  stores no per-gadget breakdown, so the difference shows only as
  `effectiveCount - baseCount`.

Known-good state, remaining gaps and the full deployment history are in
[`DEV.md`](DEV.md). Acceptance results are in
[`docs/acceptance-evidence.md`](docs/acceptance-evidence.md).

## Licence

Third-party notices in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
