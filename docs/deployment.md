# Hecliar MVP Deployment

**Target network:** Base Sepolia (chain ID 84532)
**Inco Lightning version:** v1.0.2

## Prerequisites
- Node.js >= 20.11.0
- Docker (for local confidential testing)
- Funded deployer wallet + robot wallet on Base Sepolia
- WalletConnect Project ID

## Environment Variables
| Variable | Secret? | Purpose |
|---|---|---|
| PRIVATE_KEY_BASE_SEPOLIA | Yes | Deployer key |
| BASE_SEPOLIA_RPC_URL | No | RPC endpoint |
| ROBOT_PRIVATE_KEY | Yes | Robot wallet key |
| NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID | No | WalletConnect ID |
| NEXT_PUBLIC_ROBOT_ADDRESS | No | Robot address |

## Local Development
```
npm install
npm run contracts:compile
npm run contracts:node
npm run contracts:test
npm --workspace frontend dev
npm run contracts:node:down
```

## Testnet Deployment
```
npm run contracts:compile
npm --workspace contracts run deploy:testnet
node contracts/scripts/wire-frontend.mjs
cp frontend/.env.deployed frontend/.env.local
npm --workspace frontend run build
node scripts/smoke-base-sepolia.mjs
```

## Contract Verification
```
npm --workspace contracts run verify:testnet
```

## Robot Endpoint
The /api/robot/action route uses ROBOT_PRIVATE_KEY. Never commit it to git.
Set it in frontend/.env.local for production.
