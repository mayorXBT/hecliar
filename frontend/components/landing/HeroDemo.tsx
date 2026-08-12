"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import type { DieFace } from "@hecliar/game-logic";
import { clsx } from "clsx";
import { BidLine } from "@/components/ui/BidLine";
import { DiceRow } from "@/components/ui/Die";
import { StatusPip } from "@/components/ui/StatusPip";

/**
 * One round, scripted and deterministic.
 *
 * Built from the same Die and BidLine the game renders, so this is the
 * product rather than a picture of it — but it is not the live gateway, and
 * it is not meant to be. A judge who watches it twice sees the same round
 * both times, and the arithmetic below is checkable against the dice shown.
 *
 * You hold two 5s, the robot holds two 5s. The standing claim is three.
 * Four is enough, so the bid holds and the challenge loses.
 */

const YOURS: readonly DieFace[] = [5, 2, 5, 1];
const ROBOT: readonly DieFace[] = [5, 6, 3, 5];

type Step = {
  status: string;
  tone: "idle" | "pending" | "verified" | "failed";
  bid: { quantity: number; face: DieFace } | null;
  robotRevealed: boolean;
  note?: string;
  hold: number;
};

const SCRIPT: readonly Step[] = [
  { status: "Both hands sealed", tone: "pending", bid: null, robotRevealed: false, hold: 1500 },
  {
    status: "Robot opens",
    tone: "idle",
    bid: { quantity: 2, face: 5 },
    robotRevealed: false,
    hold: 1900,
  },
  {
    status: "You raise",
    tone: "idle",
    bid: { quantity: 3, face: 5 },
    robotRevealed: false,
    hold: 1900,
  },
  {
    status: "Robot challenges",
    tone: "failed",
    bid: { quantity: 3, face: 5 },
    robotRevealed: false,
    hold: 1400,
  },
  {
    status: "Verifying against sealed dice",
    tone: "pending",
    bid: { quantity: 3, face: 5 },
    robotRevealed: false,
    hold: 1300,
  },
  {
    status: "Settled",
    tone: "verified",
    bid: { quantity: 3, face: 5 },
    robotRevealed: true,
    note: "Four 5s across both hands. The claim was three, so the bid holds and the challenge loses.",
    hold: 5200,
  },
];

const LAST = SCRIPT.length - 1;

export function HeroDemo() {
  const reduced = usePrefersReducedMotion();
  const [step, setStep] = useState(0);
  const [driven, setDriven] = useState(false);
  const timer = useRef<number | null>(null);

  // Reduced motion holds on the settled round rather than starting at the
  // beginning and never moving, so the arithmetic is readable at rest.
  const index = reduced && !driven ? LAST : step;

  useEffect(() => {
    if (reduced) return;
    timer.current = window.setTimeout(
      () => setStep((current) => (current + 1) % SCRIPT.length),
      SCRIPT[index].hold,
    );
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [reduced, index]);

  // Under reduced motion nothing advances on its own, so the control steps
  // through the round instead of restarting it.
  const replay = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    setDriven(true);
    setStep((current) => (reduced ? ((current === 0 && !driven ? LAST : current) + 1) % SCRIPT.length : 0));
  }, [driven, reduced]);

  const current = SCRIPT[index];

  return (
    <figure className="demo" aria-label="A scripted round of Hecliar">
      <div className="demo-chrome">
        <span className="demo-chrome-label">Round 1 · best of three</span>
        <span className="demo-chrome-net">Base Sepolia</span>
      </div>

      <div className="demo-body">
        <div className="demo-seat">
          <div className="demo-seat-head">
            <span className="demo-seat-name">Robot</span>
            <span className="demo-seat-note">
              {current.robotRevealed ? "revealed" : "sealed"}
            </span>
          </div>
          <DiceRow
            dice={current.robotRevealed ? ROBOT : undefined}
            count={ROBOT.length}
            label={current.robotRevealed ? "Robot revealed dice" : "Robot sealed dice"}
            seedPrefix="hero-robot"
            size="sm"
            state={current.robotRevealed ? "face" : "sealed"}
          />
        </div>

        <div className="demo-bid">
          <span className="demo-bid-label">Current bid</span>
          <BidLine bid={current.bid} emptyLabel="No bid yet" size="lead" />
          <StatusPip live tone={current.tone}>
            {current.status}
          </StatusPip>
        </div>

        <div className="demo-seat">
          <div className="demo-seat-head">
            <span className="demo-seat-name">You</span>
            <span className="demo-seat-note">only you can read these</span>
          </div>
          <DiceRow
            dice={YOURS}
            label="Your dice"
            seedPrefix="hero-you"
            size="sm"
            state="face"
          />
        </div>

        <p className={clsx("demo-note", current.note && "is-shown")}>
          {current.note ?? " "}
        </p>
      </div>

      <figcaption className="demo-foot">
        <span className="demo-progress" aria-hidden="true">
          {SCRIPT.map((_, dot) => (
            <i className={clsx(dot <= index && "is-done")} key={dot} />
          ))}
        </span>
        <button className="demo-replay" onClick={replay} type="button">
          {reduced ? "Step through it" : "Replay"}
        </button>
      </figcaption>
    </figure>
  );
}
