import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import * as dotenv from "dotenv";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

dotenv.config(); // Load environment variables
mkdirSync(join(__dirname, "artifacts"), { recursive: true });

const PRIVATE_KEY = process.env.PRIVATE_KEY_BASE_SEPOLIA || "";
// Optional second testnet signer. Friend mode needs two wallets, and
// setReady requires a guest to have joined, so the end-to-end script cannot
// be driven from one key.
const PRIVATE_KEY_GUEST = process.env.PRIVATE_KEY_GUEST_SEPOLIA || "";
const PRIVATE_KEY_ANVIL = process.env.PRIVATE_KEY_ANVIL || "";
// The local suites need three signers — human, robot, and an unrelated third
// wallet used to prove a stranger cannot join or read. A single key leaves
// getWalletClients() one element long and the fixtures fail on `undefined`.
const SEED_PHRASE = process.env.SEED_PHRASE || "";
// No fallback to the Sepolia key — mainnet must use its own key, otherwise the `base`
// network has no signer and Hardhat fails clearly (prevents accidental mainnet deploys).
const PRIVATE_KEY_BASE = process.env.PRIVATE_KEY_BASE || "";

const BASE_SEPOLIA_RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || "";
const BASE_RPC_URL = process.env.BASE_RPC_URL || "https://mainnet.base.org";

const config: HardhatUserConfig = {
  paths: {
    sources: ".",
  },
  solidity: {
    version: "0.8.30",  // Specify the Solidity version
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      evmVersion: "cancun" // Specify the EVM version
    }
  },
  networks: {
    hardhat: {}, // Local Hardhat network
    // Inco's local node, based on anvil, called https://github.com/Inco-fhevm/lightning-rod
    // Make sure to run `docker compose up` to start the local node and covalidator
    anvil: {
      url: "http://localhost:8545",
      accounts: SEED_PHRASE
        ? { mnemonic: SEED_PHRASE, count: 10 }
        : PRIVATE_KEY_ANVIL
          ? [PRIVATE_KEY_ANVIL]
          : [],
      chainId:31337
    },
    baseSepolia: {
      url: BASE_SEPOLIA_RPC_URL,
      accounts: [PRIVATE_KEY, PRIVATE_KEY_GUEST].filter(Boolean),
      chainId: 84532,
    },
    base: {
      url: BASE_RPC_URL,
      accounts: PRIVATE_KEY_BASE ? [PRIVATE_KEY_BASE] : [],
      chainId: 8453,
    }
  }
};

export default config;
