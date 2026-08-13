/**
 * Drive a complete confidential friend match on Base Sepolia.
 *
 * This exists to answer one question with evidence rather than assertion: can
 * two wallets play a round where each reads only its own dice, and can a
 * challenge be settled from covalidator-signed values the contract verifies?
 *
 * Run with:
 *   node scripts/friend-e2e.mjs
 *
 * Needs PRIVATE_KEY_BASE_SEPOLIA (host) and PRIVATE_KEY_GUEST_SEPOLIA (guest)
 * in contracts/.env, both funded, and HECLIAR_ADDRESS below pointing at the
 * current deployment.
 */

import { createPublicClient, createWalletClient, http, keccak256, toHex, zeroHash, formatEther, bytesToHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { Lightning } from "@inco/lightning-js/lite";
import { readFileSync } from "node:fs";
import dotenv from "dotenv";

dotenv.config();

const HECLIAR_ADDRESS = process.env.HECLIAR_ADDRESS
  ?? "0xb4c65c3f9485ff6B2d8D270BdE1D5338e54FBA72";

const abi = JSON.parse(
  readFileSync("./artifacts/contracts/HecliarGame.sol/HecliarGame.json", "utf8"),
).abi;

const rpc = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
const withPrefix = (k) => (k.startsWith("0x") ? k : `0x${k}`);
const host = privateKeyToAccount(withPrefix(process.env.PRIVATE_KEY_BASE_SEPOLIA));
const guest = privateKeyToAccount(withPrefix(process.env.PRIVATE_KEY_GUEST_SEPOLIA));

const pub = createPublicClient({ chain: baseSepolia, transport: http(rpc) });
const wallets = {
  host: createWalletClient({ account: host, chain: baseSepolia, transport: http(rpc) }),
  guest: createWalletClient({ account: guest, chain: baseSepolia, transport: http(rpc) }),
};

const nonZero = (handles) => handles.filter((h) => h !== zeroHash);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * The covalidator observes blocks on a poll, so a handle is not servable the
 * instant it is created, and a public RPC can serve a read from a node that is
 * behind. Both are transient; a real failure still surfaces once attempts run
 * out.
 */
async function settle(label, fn, attempts = 20, delay = 3000) {
  let last;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      return await fn();
    } catch (error) {
      last = error;
      if (i < attempts) await sleep(delay);
    }
  }
  throw new Error(`${label} failed after ${attempts} attempts: ${last?.shortMessage ?? last?.message}`);
}

async function send(who, fn, args, value) {
  const { request, result } = await pub.simulateContract({
    abi, address: HECLIAR_ADDRESS, account: who === "host" ? host : guest,
    functionName: fn, args, ...(value === undefined ? {} : { value }),
  });
  const hash = await wallets[who].writeContract(request);
  const receipt = await pub.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`${fn} reverted (${hash})`);
  return { result, gas: receipt.gasUsed, hash };
}

const read = (fn, args, account) =>
  pub.readContract({ abi, address: HECLIAR_ADDRESS, functionName: fn, args, ...(account ? { account } : {}) });

const step = (n, text) => console.log(`\n[${n}] ${text}`);

/** ChallengeSettlement wants uint256[12] and bytes[][12], zeros for unused slots. */
function packSettlement(handles, revealed) {
  const byHandle = new Map(revealed.map((a) => [a.handle.toLowerCase(), a]));
  const valueFor = (h) => (h === zeroHash ? 0n : BigInt(byHandle.get(h.toLowerCase()).plaintext.value));
  const sigsFor = (h) => (h === zeroHash ? [] : byHandle.get(h.toLowerCase()).covalidatorSignatures.map(bytesToHex));
  for (const h of nonZero([...handles.dice, handles.effectiveCount, ...handles.effectCodes])) {
    if (!byHandle.has(h.toLowerCase())) throw new Error(`missing attestation for ${h}`);
  }
  return {
    dieValues: handles.dice.map(valueFor),
    dieSignatures: handles.dice.map(sigsFor),
    effectiveCount: valueFor(handles.effectiveCount),
    effectiveCountSignatures: sigsFor(handles.effectiveCount),
  };
}

async function main() {
  console.log("contract :", HECLIAR_ADDRESS);
  console.log("host     :", host.address, formatEther(await pub.getBalance({ address: host.address })), "ETH");
  console.log("guest    :", guest.address, formatEther(await pub.getBalance({ address: guest.address })), "ETH");

  const zap = await Lightning.baseSepoliaTestnet();
  const code = `HEC${Math.floor(Math.random() * 90000 + 10000)}`;
  const roomHash = keccak256(toHex(code));
  const DICE = 4;

  step(1, `Host creates room ${code}`);
  const created = await send("host", "createRoom", [roomHash, DICE, false, 3600n]);
  const matchId = created.result;
  console.log(`    matchId ${matchId}, gas ${created.gas}`);

  step(2, "Guest joins");
  await settle("joinRoom", () => send("guest", "joinRoom", [roomHash]));
  console.log(`    status ${(await read("getPublicMatch", [matchId])).status} (1 = waiting for ready)`);

  step(3, "Both seats ready up, each paying for its own dice");
  const seatFee = await read("requiredSeatFee", [DICE, false]);
  console.log(`    seat fee ${formatEther(seatFee)} ETH each`);
  await send("host", "setReady", [matchId], seatFee);
  await settle("guest setReady", () => send("guest", "setReady", [matchId], seatFee));

  const started = await settle("match start", async () => {
    const s = await read("getPublicMatch", [matchId]);
    if (s.status !== 3) throw new Error(`status ${s.status}, expected 3`);
    return s;
  });
  console.log(`    status ${started.status} (3 = active turn), round ${started.roundNumber}`);

  step(4, "Each seat decrypts its own dice");
  const handlesFor = async (account) =>
    settle(`handles for ${account.address}`, async () => {
      const h = await read("getMyRoundHandles", [matchId], account);
      const dice = nonZero(h.dice);
      if (dice.length === 0) throw new Error("dice not rolled yet");
      return dice;
    });

  const hostHandles = await handlesFor(host);
  const guestHandles = await handlesFor(guest);

  const decrypt = (wallet, handles) =>
    settle("attestedDecrypt", () => zap.attestedDecrypt(wallet, [...handles]));

  const hostDice = (await decrypt(wallets.host, hostHandles)).map((r) => Number(r.plaintext.value));
  const guestDice = (await decrypt(wallets.guest, guestHandles)).map((r) => Number(r.plaintext.value));
  console.log(`    host  reads own dice: [${hostDice}]`);
  console.log(`    guest reads own dice: [${guestDice}]`);
  if (![...hostDice, ...guestDice].every((d) => d >= 1 && d <= 6)) throw new Error("die out of range");

  step(5, "Guest is refused the host's dice — the privacy claim");
  let refused = false;
  try {
    await zap.attestedDecrypt(wallets.guest, [...hostHandles]);
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
  // Claim exactly what the table holds, so the bid is true and the challenge
  // should lose. Anything the contract computes must agree with this.
  console.log(`    claiming ${onTable} x ${face} (true across both hands)`);
  const seq = Number((await read("getPublicMatch", [matchId])).actionSequence);
  await send("host", "raise", [matchId, onTable, face, seq]);
  await settle("challenge", () => send("guest", "challenge", [matchId, seq + 1]));

  step(7, "Reveal and settle from covalidator-signed values");
  const challengeHandles = await settle("getChallengeHandles", () => read("getChallengeHandles", [matchId]));
  const requested = nonZero([...challengeHandles.dice, challengeHandles.effectiveCount, ...challengeHandles.effectCodes]);
  const settlement = await settle("attestedReveal", async () =>
    packSettlement(challengeHandles, await zap.attestedReveal(requested)));
  console.log(`    revealed ${requested.length} handles, effective count ${settlement.effectiveCount}`);

  const settled = await settle("settleChallenge", () =>
    send("guest", "settleChallenge", [matchId, settlement, seq + 2]));
  console.log(`    settled, gas ${settled.gas}`);

  step(8, "Round result");
  const result = await settle("getRoundResult", () => read("getRoundResult", [matchId, 1]));
  const final = await read("getPublicMatch", [matchId]);
  console.log(`    revealed rolls : [${result.revealedRolls[0].slice(0, DICE)}] vs [${result.revealedRolls[1].slice(0, DICE)}]`);
  console.log(`    bid            : ${result.challengedBid.quantity} x ${result.challengedBid.face}`);
  console.log(`    base count     : ${result.baseCount}`);
  console.log(`    effective count: ${result.effectiveCount}`);
  console.log(`    winner seat    : ${result.winnerSeat} (0 = host/bidder, 1 = guest/challenger)`);
  console.log(`    score          : ${final.score.join(" - ")}`);

  const bidHeld = Number(result.effectiveCount) >= result.challengedBid.quantity;
  console.log(`\n    the bid ${bidHeld ? "held" : "failed"}, so the ${bidHeld ? "bidder" : "challenger"} wins`);
  if ((result.winnerSeat === 0) !== bidHeld) throw new Error("winner disagrees with the revealed count");

  console.log("\nFull confidential round completed on Base Sepolia.");
}

main().catch((error) => {
  console.error("\nFAILED:", error.shortMessage ?? error.message);
  process.exit(1);
});
