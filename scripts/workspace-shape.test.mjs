import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

for (const path of [
  "package.json",
  "contracts/package.json",
  "frontend/package.json",
  "packages/game-logic/package.json",
  "docker-compose.yaml",
]) {
  assert.equal(existsSync(path), true, `missing ${path}`);
}

const root = JSON.parse(readFileSync("package.json", "utf8"));
assert.deepEqual(root.workspaces, ["contracts", "frontend", "packages/game-logic"]);
assert.deepEqual(root.scripts, {
  test: "npm run test --workspaces --if-present",
  build: "npm run build --workspaces --if-present",
  lint: "npm run lint --workspaces --if-present",
  "contracts:compile": "npm --workspace contracts run compile",
  "contracts:test": "npm --workspace contracts test",
  "contracts:node": "npm --workspace contracts run node:up",
  "contracts:node:down": "npm --workspace contracts run node:down",
});

const contracts = JSON.parse(readFileSync("contracts/package.json", "utf8"));
assert.equal(contracts.scripts.test, "hardhat test --network anvil");
assert.equal(contracts.dependencies["@inco/lightning"], "1.0.2");
assert.equal(contracts.devDependencies["@inco/lightning-js"], "1.0.2");

const frontend = JSON.parse(readFileSync("frontend/package.json", "utf8"));
assert.equal(frontend.scripts.test, "vitest run");
assert.equal(frontend.scripts.e2e, "playwright test");
assert.equal(frontend.scripts.lint, "eslint .");
assert.equal(frontend.scripts.build, "next build");
assert.equal(frontend.dependencies["@inco/lightning-js"], "1.0.2");

for (const composePath of ["docker-compose.yaml", "contracts/docker-compose.yaml"]) {
  const compose = readFileSync(composePath, "utf8");
  assert.match(compose, /local-node-anvil-mainnet:v1\.0\.2/);
  assert.match(compose, /local-node-covalidator-mainnet:v1\.0\.2/);
  assert.match(compose, /The v1\.0\.2 images/);
}

const hardhatConfig = readFileSync("contracts/hardhat.config.ts", "utf8");
assert.match(hardhatConfig, /baseSepolia:\s*\{[\s\S]*?chainId:\s*84532/);

assert.equal(existsSync("packages/game-logic/src/index.ts"), true);
for (const path of [
  "contracts/contracts/ConfidentialERC20.sol",
  "contracts/contracts/ConfidentialLottery.sol",
  "contracts/test/ConfidentialERC20.test.ts",
  "contracts/test/ConfidentialLottery.test.ts",
  "contracts/ignition/modules/ConfidentialERC20.ts",
  "contracts/ignition/modules/ConfidentialLottery.ts",
  "frontend/abi/confToken.json",
  "frontend/abi/confLottery.json",
  "frontend/hooks/useConfLottery.ts",
  "frontend/components/ConfLottery.tsx",
]) {
  assert.equal(existsSync(path), false, `generated example remains: ${path}`);
}
