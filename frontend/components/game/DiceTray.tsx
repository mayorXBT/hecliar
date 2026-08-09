import type { DieFace } from "@hecliar/game-logic";

export function DiceTray({ visibility, dice, count }: { visibility: "owner" | "revealed" | "hidden"; dice?: readonly DieFace[]; count: number }) {
  if (visibility === "hidden") return <p className="hidden-dice" aria-label={`${count} hidden opponent dice`}>{count} hidden dice</p>;
  const shownDice = dice ?? [];
  return <div className="dice-tray" aria-label={visibility === "owner" ? "Your dice" : "Revealed dice"}>
    {shownDice.map((die, index) => <span className="die" data-testid={visibility === "owner" ? "own-die" : "revealed-die"} key={`${die}-${index}`} aria-label={`Die ${index + 1}: ${die}`}>{die}</span>)}
  </div>;
}
