import type { DieFace } from "@hecliar/game-logic";

const PIP_POSITIONS: Record<DieFace, readonly number[]> = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

function DieTile({ face, label, testId }: { face: DieFace; label: string; testId: string }) {
  return (
    <span className="die die-pips" data-testid={testId} aria-label={label}>
      {PIP_POSITIONS[face].map((position) => (
        <i
          aria-hidden="true"
          className="pip"
          data-testid="pip"
          key={position}
          style={{ gridArea: `${Math.ceil(position / 3)} / ${((position - 1) % 3) + 1}` }}
        />
      ))}
    </span>
  );
}

export function DiceTray({ visibility, dice, count }: { visibility: "owner" | "revealed" | "hidden"; dice?: readonly DieFace[]; count: number }) {
  if (visibility === "hidden") {
    return (
      <div className="dice-tray hidden-dice" aria-label={`${count} hidden opponent dice`}>
        {Array.from({ length: count }, (_, index) => (
          <span aria-hidden="true" className="die hidden-die" data-testid="hidden-die" key={index}>?</span>
        ))}
      </div>
    );
  }

  const shownDice = dice ?? [];
  return (
    <div className="dice-tray" aria-label={visibility === "owner" ? "Your dice" : "Revealed dice"}>
      {shownDice.map((die, index) => (
        <DieTile
          face={die}
          key={`${die}-${index}`}
          label={`Die ${index + 1}: ${die}`}
          testId={visibility === "owner" ? "own-die" : "revealed-die"}
        />
      ))}
    </div>
  );
}
