import assert from "node:assert/strict";

const ADDRESS = process.env.NEXT_PUBLIC_HECLIAR_ADDRESS;
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL;
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const ROBOT_KEY = process.env.ROBOT_PRIVATE_KEY;

const missing = [];
if (!ADDRESS) missing.push("NEXT_PUBLIC_HECLIAR_ADDRESS");
if (!RPC_URL) missing.push("BASE_SEPOLIA_RPC_URL");
if (!DEPLOYER_KEY) missing.push("DEPLOYER_PRIVATE_KEY");
if (!ROBOT_KEY) missing.push("ROBOT_PRIVATE_KEY");

if (missing.length > 0) {
  console.error("Missing required environment variables:", missing.join(", "));
  console.error("Run: npm --workspace contracts run deploy:testnet first");
  console.error("Then: node contracts/scripts/wire-frontend.mjs");
  process.exit(2);
}

console.log("HecliarGame address:", ADDRESS);
console.log("RPC:", RPC_URL.replace(/\/\/.*@/, "//***@"));
console.log();
console.log("Smoke test requires a live Base Sepolia RPC and funded wallets.");
console.log("Implementation stub: verify bytecode, create Robot match, complete one round.");
console.log();
console.log("Run when credentials are available:");
console.log("  node scripts/smoke-base-sepolia.mjs");
