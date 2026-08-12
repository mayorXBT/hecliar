import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { HECLIAR_GAME_ABI } from "@/lib/contracts/hecliar";

/**
 * The frontend ABI is hand-written, so it can drift from the contract without
 * anything failing until a decode goes wrong at runtime. It already had:
 * scannerResult declared as `bool` when RoundHandles holds an `ebool`, which
 * encodes as bytes32. That would have mis-decoded every call to
 * getMyRoundHandles on a live chain.
 *
 * contracts/artifacts is gitignored, so this skips when the contracts have not
 * been compiled rather than failing a clean checkout. Run
 * `npm --workspace contracts run compile` to make it meaningful.
 */
const ARTIFACT = resolve(
  __dirname,
  "../../contracts/artifacts/contracts/HecliarGame.sol/HecliarGame.json",
);

type AbiParam = { name?: string; type: string; components?: readonly AbiParam[] };
type AbiFn = {
  type: string;
  name?: string;
  inputs?: readonly AbiParam[];
  outputs?: readonly AbiParam[];
};

const shape = (param: AbiParam): string =>
  param.components
    ? `(${param.components.map((c) => `${c.name ?? ""}:${shape(c)}`).join(",")})`
    : param.type;

const signature = (fn: AbiFn) =>
  `${(fn.inputs ?? []).map(shape).join(",")} -> ${(fn.outputs ?? []).map(shape).join(",")}`;

describe("frontend ABI matches the compiled contract", () => {
  const available = existsSync(ARTIFACT);

  it.skipIf(!available)("agrees on every function the frontend declares", () => {
    const artifact = JSON.parse(readFileSync(ARTIFACT, "utf8")) as { abi: AbiFn[] };
    const compiled = new Map(
      artifact.abi
        .filter((entry) => entry.type === "function" && entry.name)
        .map((entry) => [entry.name as string, entry]),
    );

    const mismatches: string[] = [];
    for (const entry of HECLIAR_GAME_ABI as unknown as readonly AbiFn[]) {
      if (entry.type !== "function" || !entry.name) continue;
      const real = compiled.get(entry.name);
      if (!real) {
        mismatches.push(`${entry.name}: not present in the compiled contract`);
        continue;
      }
      if (signature(entry) !== signature(real)) {
        mismatches.push(
          `${entry.name}:\n    frontend: ${signature(entry)}\n    contract: ${signature(real)}`,
        );
      }
    }

    expect(mismatches, `ABI drift:\n  ${mismatches.join("\n  ")}`).toEqual([]);
  });
});
