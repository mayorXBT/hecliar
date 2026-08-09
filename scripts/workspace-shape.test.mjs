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
assert.equal(root.scripts.test, "npm run test --workspaces --if-present");
assert.equal(root.scripts.build, "npm run build --workspaces --if-present");
