/**
 * Drive a complete confidential friend match on Base Sepolia.
 *
 * Answers one question with evidence rather than assertion: can two wallets
 * play a round where each reads only its own dice, and can a challenge be
 * settled from covalidator-signed values the contract verifies?
 *
 *   npx hardhat run scripts/friend-e2e.ts --network baseSepolia
 *
 * Runs through hardhat because @inco/lightning-js ships extensionless ESM
 * imports that plain Node cannot resolve. Needs PRIVATE_KEY_BASE_SEPOLIA and
 * PRIVATE_KEY_GUEST_SEPOLIA in contracts/.env, both funded.
 */

import { keccak256, toHex, zeroHash, formatEther, bytesToHex, type Hex } from "viem";
import { Lightning } from "@inco/lightning-js/lite";
import hre from "hardhat";

const ADDRESS = (process.env.HECLIAR_ADDRESS
  ?? "0xF003E11d9309C55788D3daBA7393453A53AD900B") as `0x${string}`;
const DICE = 4;

const nonZero = (handles: readonly Hex[]) => handles.filter((h) => h !== zeroHash);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const step = (n: number, text: string) => console.log("\n[" + n + "] " + text);

/**
 * The covalidator observes blocks on a poll, and a public RPC can serve a read
 * from a node that is behind. Both are transient; a real failure still
 * surfaces once the attempts run out.
 */
async function settle<T>(label: string, fn: () => Promise<T>, attempts = 20, delay = 3000): Promise<T> {
  let last: unknown;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      return await fn();
    } catch (error) {
      last = error;
      if (i < attempts) await sleep(delay);
    }
  }
  const message = last instanceof Error ? last.message : String(last);
  throw new Error(label + " failed after " + attempts + " attempts: " + message);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function packSettlement(handles: any, revealed: readonly any[]) {
  const byHandle = new Map<string, any>(revealed.map((a) => [a.handle.toLowerCase(), a]));
  for (const h of nonZero([...handles.dice, handles.effectiveCount, ...handles.effectCodes])) {
    if (!byHandle.has(h.toLowerCase())) throw new Error("missing attestation for " + h);
  }
  const valueFor = (h: Hex) => (h === zeroHash ? 0n : BigInt(byHandle.get(h.toLowerCase()).plaintext.value));
  const sigsFor = (h: Hex) => (h === zeroHash ? [] : byHandle.get(h.toLowerCase()).covalidatorSignatures.map(bytesToHex));
  return {
    dieValues: handles.dice.map(valueFor),
    dieSignatures: handles.dice.map(sigsFor),
    effectiveCount: valueFor(handles.effectiveCount),
    effectiveCountSignatures: sigsFor(handles.effectiveCount),
  };
}

async function main() {
  const [host, guest] = await hre.viem.getWalletClients();
  const pub = await hre.viem.getPublicClient();
  if (!guest) throw new Error("No guest signer. Set PRIVATE_KEY_GUEST_SEPOLIA in contracts/.env.");

  const game = await hre.viem.getContractAt("HecliarGame", ADDRESS);
  const confirm = async (write: Promise<`0x${string}`>) => {
    const hash = await write;
    const receipt = await pub.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error("reverted " + hash);
    return receipt;
  };

  console.log("contract :", ADDRESS);
  console.log("host     :", host.account.address, formatEther(await pub.getBalance({ address: host.account.address })), "ETH");
  console.log("guest    :", guest.account.address, formatEther(await pub.getBalance({ address: guest.account.address })), "ETH");

  const zap = await Lightning.baseSepoliaTestnet();
  const code = "HEC" + Math.floor(Math.random() * 90000 + 10000);
  const roomHash = keccak256(toHex(code));

  step(1, "Host creates room " + code);
  const created = await confirm(game.write.createRoom([roomHash, DICE, false, 3600n], { account: host.account }));
  // Read until it is non-zero: the public RPC load-balances across nodes at
  // different heights, so a read straight after a confirmed write can come
  // back from one that has not seen it. Zero here silently poisons every
  // later call with the wrong match.
  const matchId = await settle("matchByRoomHash", async () => {
    const id = await game.read.matchByRoomHash([roomHash]);
    if (id === 0n) throw new Error("room not visible yet");
    return id;
  });
  console.log("    matchId " + matchId + ", gas " + created.gasUsed);

  step(2, "Guest joins");
  await settle("joinRoom", () => confirm(game.write.joinRoom([roomHash], { account: guest.account })));
  console.log("    status " + (await game.read.getPublicMatch([matchId])).status + " (1 = waiting for ready)");

  step(3, "Both seats ready up, each paying for its own dice");
  const seatFee = await game.read.requiredSeatFee([DICE, false]);
  console.log("    seat fee " + formatEther(seatFee) + " ETH each");
  await confirm(game.write.setReady([matchId], { account: host.account, value: seatFee }));
  await settle("guest setReady", () => confirm(game.write.setReady([matchId], { account: guest.account, value: seatFee })));

  const started = await settle("match start", async () => {
    const s = await game.read.getPublicMatch([matchId]);
    if (s.status !== 3) throw new Error("status " + s.status + ", expected 3");
    return s;
  });
  console.log("    status " + started.status + " (3 = active turn), round " + started.roundNumber);

  step(4, "Each seat decrypts its own dice");
  const handlesFor = (account: any) =>
    settle("handles for " + account.address, async () => {
      const h = await game.read.getMyRoundHandles([matchId], { account });
      const dice = nonZero(h.dice);
      if (dice.length === 0) throw new Error("dice not rolled yet");
      return dice;
    });

  const hostHandles = await handlesFor(host.account);
  const guestHandles = await handlesFor(guest.account);
  const decrypt = (wallet: any, handles: readonly Hex[]) =>
    settle("attestedDecrypt", () => zap.attestedDecrypt(wallet, [...handles]));

  const hostDice = (await decrypt(host, hostHandles)).map((r: any) => Number(r.plaintext.value));
  const guestDice = (await decrypt(guest, guestHandles)).map((r: any) => Number(r.plaintext.value));
  console.log("    host  reads own dice: [" + hostDice + "]");
  console.log("    guest reads own dice: [" + guestDice + "]");
  if (![...hostDice, ...guestDice].every((d) => d >= 1 && d <= 6)) throw new Error("die out of range");

  step(5, "Guest is refused the host's dice");
  let refused = false;
  try {
    await zap.attestedDecrypt(guest as any, [...hostHandles]);
  } catch {
    refused = true;
  }
  console.log(refused
    ? "    REFUSED: the guest cannot read the host's dice"
    : "    *** LEAK: the guest decrypted the host's dice ***");
  if (!refused) throw new Error("confidentiality violated");

  step(6, "Host raises, guest challenges");
  const face = hostDice[0];
  const onTable = [...hostDice, ...guestDice].filter((d) => d === face).length;
  console.log("    claiming " + onTable + " x " + face + " (true across both hands)");
  const seq = (await game.read.getPublicMatch([matchId])).actionSequence;
  await confirm(game.write.raise([matchId, onTable, face, seq], { account: host.account }));
  await settle("challenge", () => confirm(game.write.challenge([matchId, seq + 1], { account: guest.account })));

  step(7, "Reveal and settle from covalidator-signed values");
  const challengeHandles = await settle("getChallengeHandles", () => game.read.getChallengeHandles([matchId]));
  const requested = nonZero([...challengeHandles.dice, challengeHandles.effectiveCount, ...challengeHandles.effectCodes]);
  const settlement = await settle("attestedReveal", async () =>
    packSettlement(challengeHandles, await zap.attestedReveal(requested)));
  console.log("    revealed " + requested.length + " handles, effective count " + settlement.effectiveCount);

  const done = await settle("settleChallenge", () =>
    confirm(game.write.settleChallenge([matchId, settlement as any, seq + 2], { account: guest.account })));
  console.log("    settled, gas " + done.gasUsed);

  step(8, "Round result");
  const result = await settle("getRoundResult", () => game.read.getRoundResult([matchId, 1]));
  const final = await game.read.getPublicMatch([matchId]);
  console.log("    revealed rolls : [" + result.revealedRolls[0].slice(0, DICE) + "] vs [" + result.revealedRolls[1].slice(0, DICE) + "]");
  console.log("    bid            : " + result.challengedBid.quantity + " x " + result.challengedBid.face);
  console.log("    base count     : " + result.baseCount);
  console.log("    effective count: " + result.effectiveCount);
  console.log("    winner seat    : " + result.winnerSeat + " (0 = host/bidder, 1 = guest/challenger)");
  console.log("    score          : " + final.score.join(" - "));

  const bidHeld = Number(result.effectiveCount) >= result.challengedBid.quantity;
  console.log("\n    the bid " + (bidHeld ? "held" : "failed") + ", so the " + (bidHeld ? "bidder" : "challenger") + " wins");
  if ((result.winnerSeat === 0) !== bidHeld) throw new Error("winner disagrees with the revealed count");

  step(9, "Fund and play a second round");
  const roundFee = await game.read.requiredRoundFee([DICE, false]);
  const afterRound = await game.read.getPublicMatch([matchId]);
  // The guest funds, not the host. A friend match has two humans, and
  // restricting this to seat 0 left every friend match stuck at RoundComplete,
  // which made a best-of-three impossible to finish.
  await settle("fundAndStartNextRound", () =>
    confirm(game.write.fundAndStartNextRound([matchId, afterRound.actionSequence], {
      account: guest.account,
      value: roundFee,
    })));

  const round2 = await settle("round two", async () => {
    const next = await game.read.getPublicMatch([matchId]);
    if (next.roundNumber !== 2 || next.status !== 3) {
      throw new Error("round " + next.roundNumber + ", status " + next.status);
    }
    return next;
  });
  console.log("    round " + round2.roundNumber + " is live, status " + round2.status);

  const freshHandles = await handlesFor(host.account);
  const dealtAgain = freshHandles.join(",") !== hostHandles.join(",");
  console.log("    fresh dice dealt: " + (dealtAgain ? "yes" : "NO — handles unchanged"));
  if (!dealtAgain) throw new Error("round two reused round one's handles");

  const round2Dice = (await decrypt(host, freshHandles)).map((r: any) => Number(r.plaintext.value));
  console.log("    host reads new dice: [" + round2Dice + "]");
  if (!round2Dice.every((d) => d >= 1 && d <= 6)) throw new Error("die out of range");

  console.log("\nTwo confidential rounds completed on Base Sepolia.");
}

main().catch((error) => {
  console.error("\nFAILED:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
