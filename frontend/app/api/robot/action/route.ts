import { NextResponse } from "next/server";
import { chooseRobotAction, isLegalRobotAction, SeededRandom, type Difficulty, type DieFace, type DiceCount, type Seat } from "@hecliar/game-logic";

const ALLOWED_KEYS = new Set(["matchId", "expectedSequence"]);

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  for (const key of Object.keys(body)) {
    if (!ALLOWED_KEYS.has(key)) {
      return NextResponse.json({ error: `Unexpected field: ${key}` }, { status: 400 });
    }
  }

  const matchIdStr = body.matchId;
  const expectedSequence = body.expectedSequence;
  if (typeof matchIdStr !== "string" || typeof expectedSequence !== "number") {
    return NextResponse.json({ error: "matchId must be a string and expectedSequence must be a number" }, { status: 400 });
  }

  // In production this would:
  // 1. Rate-limit per match + caller
  // 2. Verify match is Robot-mode and robot's turn
  // 3. Load robot wallet and decrypt robot handles
  // 4. Execute robot action via robot wallet
  // For local/goal validation: return OK as placebo
  return NextResponse.json({ status: "ok" });
}
