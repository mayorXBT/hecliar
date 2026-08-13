import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { exit, stderr, stdout } from "node:process";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

function collectFiles(dir, results = []) {
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) { collectFiles(full, results); continue; }
      results.push(full);
    }
  } catch { /* skip missing dirs */ }
  return results;
}

const contractsDir = join(ROOT, "contracts", "contracts");
const frontendApp = join(ROOT, "frontend", "app");
const frontendComponents = join(ROOT, "frontend", "components");
const frontendHooks = join(ROOT, "frontend", "hooks");
const frontendLib = join(ROOT, "frontend", "lib");

const solFiles = collectFiles(contractsDir).filter(f => f.endsWith(".sol"));
const tsFiles = [
  ...collectFiles(frontendApp).filter(f => /\.tsx?$/.test(f)),
  ...collectFiles(frontendComponents).filter(f => /\.tsx?$/.test(f)),
  ...collectFiles(frontendHooks).filter(f => /\.tsx?$/.test(f)),
  ...collectFiles(frontendLib).filter(f => /\.ts$/.test(f)),
];

const violations = [];
const allFiles = [...solFiles, ...tsFiles];

for (const file of allFiles) {
  let source;
  try { source = readFileSync(file, "utf8"); } catch { continue; }

  const rel = relative(ROOT, file).replace(/\\/g, "/");

  if (rel !== "frontend/lib/logging/safe-log.ts" && /\bconsole\.(log|info|debug|warn|error)\b/.test(source)) {
    violations.push(`${rel}: direct console call`);
  }

  if (rel !== "frontend/lib/storage/public-recovery.ts"
      && /\b(localStorage|sessionStorage|indexedDB|caches)\b/.test(source)) {
    violations.push(`${rel}: browser persistence`);
  }

  if (/\b(PRIVATE_KEY|privateKey|secretKey)\b/.test(source)) {
    violations.push(`${rel}: private key reference`);
  }
}

if (violations.length > 0) {
  stderr.write("CONFIDENTIALITY VIOLATIONS:\n");
  for (const v of violations) stderr.write(`  ${v}\n`);
  exit(1);
}

stdout.write(`Static confidentiality audit passed. ${allFiles.length} files scanned.\n`);
