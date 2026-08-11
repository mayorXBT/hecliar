import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";

test("lets technical demo items shrink at narrow breakpoints", () => {
  const styles = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

  expect(styles).toMatch(/\.marketing-technical\s*>\s*\*\s*\{[^}]*min-width:\s*0/);
});
