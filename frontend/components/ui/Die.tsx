import type { DieFace } from "@hecliar/game-logic";
import { clsx } from "clsx";

/**
 * The die is the product's whole argument in one object.
 *
 * - `face`      the value, readable, resting on the table
 * - `hidden`    an opponent die: present, counted, unreadable
 * - `sealed`    your own die before the chain releases it, showing the
 *               ciphertext fragment instead of a value
 * - `revealing` mid-settlement, on its way from sealed to face
 *
 * `sealed` is the state that turns "your dice are encrypted" from a claim
 * into something on screen, so it renders the handle rather than a question
 * mark. Screen readers are told the value is hidden, not read the hex.
 */

export type DieState = "face" | "hidden" | "sealed" | "revealing";

const PIP_POSITIONS: Record<DieFace, readonly number[]> = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

const HEX = "0123456789abcdef";

/** Stable four-character fragment, so a sealed die does not flicker between
 *  renders and two dice do not accidentally show the same handle. */
export function sealFragment(seed: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  let out = "";
  for (let i = 0; i < 4; i += 1) {
    out += HEX[(h >>> (i * 4)) & 0xf];
  }
  return out;
}

export type DieProps = {
  state: DieState;
  face?: DieFace;
  /** Distinguishes one sealed die's handle from another. */
  seed?: string;
  size?: "sm" | "md";
  /** Position in its row, used for the landing stagger. */
  index?: number;
  label?: string;
  testId?: string;
};

export function Die({
  state,
  face,
  seed = "0",
  size = "md",
  index = 0,
  label,
  testId,
}: DieProps) {
  const className = clsx("hx-die", `hx-die--${size}`, `hx-die--${state}`);
  const style = { "--die-index": index } as React.CSSProperties;

  if (state === "hidden") {
    return (
      <span
        aria-label={label ?? "Hidden die"}
        className={className}
        data-testid={testId}
        role="img"
        style={style}
      >
        <span aria-hidden="true" className="hx-die-blank" />
      </span>
    );
  }

  if (state === "sealed") {
    return (
      <span
        aria-label={label ?? "Sealed die, value hidden until the reveal"}
        className={className}
        data-testid={testId}
        role="img"
        style={style}
      >
        {/* Two characters at sm: four would land at 8px, which reads as
            smudge rather than as ciphertext. */}
        <span aria-hidden="true" className="hx-die-seal">
          {size === "sm" ? sealFragment(seed).slice(0, 2) : sealFragment(seed)}
        </span>
      </span>
    );
  }

  if (face === undefined) return null;

  return (
    <span
      aria-label={label ?? `Die showing ${face}`}
      className={className}
      data-testid={testId}
      role="img"
      style={style}
    >
      {PIP_POSITIONS[face].map((position) => (
        <i
          aria-hidden="true"
          className="hx-pip"
          data-testid="pip"
          key={position}
          style={{
            gridArea: `${Math.ceil(position / 3)} / ${((position - 1) % 3) + 1}`,
          }}
        />
      ))}
    </span>
  );
}

export type DiceRowProps = {
  state: DieState;
  dice?: readonly DieFace[];
  /** Used when there are no readable values, i.e. hidden or sealed. */
  count?: number;
  seedPrefix?: string;
  size?: "sm" | "md";
  label: string;
  testId?: string;
};

export function DiceRow({
  state,
  dice,
  count,
  seedPrefix = "d",
  size = "md",
  label,
  testId,
}: DiceRowProps) {
  const length = dice?.length ?? count ?? 0;

  return (
    <div aria-label={label} className="hx-dice-row" role="group">
      {Array.from({ length }, (_, index) => (
        <Die
          face={dice?.[index]}
          index={index}
          key={index}
          seed={`${seedPrefix}:${index}`}
          size={size}
          state={state}
          testId={testId}
          {...(dice?.[index] !== undefined && state !== "hidden" && state !== "sealed"
            ? { label: `Die ${index + 1}: ${dice[index]}` }
            : {})}
        />
      ))}
    </div>
  );
}
