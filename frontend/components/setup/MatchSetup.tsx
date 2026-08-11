"use client";

import { useRef, useState } from "react";
import { DEFAULT_DICE_COUNT, type Difficulty, type MatchSettings } from "@hecliar/game-logic";

export function MatchSetup({ mode, onStart }: { mode: "robot" | "friend"; onStart(settings: MatchSettings): void | Promise<void> }) {
  const [diceCount, setDiceCount] = useState<3 | 4 | 5 | 6>(DEFAULT_DICE_COUNT);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [gadgetsEnabled, setGadgetsEnabled] = useState(false);
  const [starting, setStarting] = useState(false);
  const startingRef = useRef(false);
  return (
    <form className={`hecliar-panel setup-panel setup-panel--${mode}`} onSubmit={(event) => {
      event.preventDefault();
      if (startingRef.current) return;
      startingRef.current = true;
      setStarting(true);
      Promise.resolve(onStart({ mode, diceCount, gadgetsEnabled, ...(mode === "robot" ? { difficulty } : {}) })).finally(() => {
        startingRef.current = false;
        setStarting(false);
      });
    }}>
      <p className="eyebrow">Table settings</p>
      <h1>Set the table</h1>
      <p className="panel-copy">Choose the dice and the robot’s nerve. Your hand stays private until a challenge resolves.</p>
      <label className="field-label" htmlFor="dice-count">Dice per side</label>
      <input id="dice-count" aria-label="Dice per side" className="dice-readout" type="number" readOnly value={diceCount} />
      <div role="group" aria-label="Choose dice count" className="segmented-control">
        {([3, 4, 5, 6] as const).map((count) => <button type="button" aria-pressed={diceCount === count} key={count} onClick={() => setDiceCount(count)}>{count} dice</button>)}
      </div>
      {mode === "robot" && <fieldset className="difficulty-fieldset">
        <legend>Robot difficulty</legend>
        {(["easy", "medium", "hard"] as const).map((value) => <label key={value} className="choice-label">
          <input type="radio" name="difficulty" checked={difficulty === value} onChange={() => setDifficulty(value)} />
          {value[0].toUpperCase() + value.slice(1)}
        </label>)}
      </fieldset>}
      <label className="toggle-label"><input type="checkbox" checked={gadgetsEnabled} onChange={(event) => setGadgetsEnabled(event.target.checked)} /> Enable secret gadgets</label>
      <p className="quiet-note">Local practice uses an in-memory game table. No wallet or transaction is needed.</p>
      <button className="primary-action" type="submit" disabled={starting} aria-busy={starting}>{starting ? "Starting match" : "Start match"}</button>
    </form>
  );
}
