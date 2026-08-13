import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { exit, stdout, stderr } from "node:process";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const SHELL = process.platform === "win32";

const checks = [
  ["rules/robot simulations", "npm", ["--workspace", "@hecliar/game-logic", "test"]],
  ["contract hardhat-network", "npm", ["--workspace", "contracts", "run", "test:pure"]],
  ["frontend unit tests", "npm", ["--workspace", "frontend", "test"]],
  ["frontend lint", "npm", ["--workspace", "frontend", "run", "lint"]],
  ["frontend production build", "npm", ["--workspace", "frontend", "run", "build"]],
  ["static confidentiality audit", "node", ["scripts/audit-confidentiality.mjs"]],
];

let failed = 0;
for (const [label, command, args] of checks) {
  stdout.write(`${label}... `);
  const result = spawnSync(command, args, { cwd: ROOT, stdio: "pipe", shell: SHELL, timeout: 120000 });
  if (result.status !== 0) {
    stdout.write("FAIL\n");
    const detail = (result.stderr || result.stdout || "").toString().slice(0, 400);
    if (detail.trim()) stderr.write(`${detail}\n`);
    failed++;
  } else {
    stdout.write("PASS\n");
  }
}

if (failed > 0) {
  stderr.write(`\n${failed} check(s) failed.\n`);
  exit(1);
}
stdout.write(`\nAll ${checks.length} acceptance checks passed.\n`);
