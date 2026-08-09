import { describe, expect, it } from "vitest";
import { LocalGameGateway } from "../src/local-game";

describe("local Robot match", () => {
  it.each([3, 4, 5, 6] as const)("creates fresh rolls with %i dice per side", async (diceCount) => {
    const gateway = new LocalGameGateway({
      rolls: [[1, 2, 3, 4, 5, 6], [6, 5, 4, 3, 2, 1]],
    });
    const matchId = await gateway.createRobotMatch({
      mode: "robot", diceCount, gadgetsEnabled: false, difficulty: "easy",
    });

    expect((await gateway.getPrivatePlayer(matchId)).ownDice).toHaveLength(diceCount);
    expect((await gateway.getPublicMatch(matchId)).settings.diceCount).toBe(diceCount);
  });

  it("settles each round once and rematches with unused fresh rolls", async () => {
    const gateway = new LocalGameGateway({
      rolls: [
        [5, 5, 2, 1], [5, 3, 4, 6],
        [2, 2, 2, 2], [1, 3, 4, 6],
        [6, 6, 1, 2], [3, 3, 4, 5],
      ],
      robotActions: [{ type: "raise", bid: { quantity: 8, face: 6 } }],
    });
    const id = await gateway.createRobotMatch({
      mode: "robot", diceCount: 4, gadgetsEnabled: false, difficulty: "easy",
    });

    await gateway.raise(id, { quantity: 3, face: 5 }, 0);
    await gateway.challenge(id, 1);
    await gateway.settleChallenge(id, 2);
    expect((await gateway.getPublicMatch(id)).score).toEqual([1, 0]);
    await expect(gateway.settleChallenge(id, 3)).rejects.toThrow("not resolving a challenge");

    await gateway.continueMatch(id, 3);
    await gateway.requestRobotAction(id, 4);
    await gateway.challenge(id, 5);
    await gateway.settleChallenge(id, 6);
    expect((await gateway.getPublicMatch(id)).score).toEqual([2, 0]);

    await gateway.acceptRematch(id);
    expect((await gateway.getPublicMatch(id)).score).toEqual([0, 0]);
    expect((await gateway.getPrivatePlayer(id)).ownDice).toEqual([6, 6, 1, 2]);
  });

  it("never includes the robot hand in its public projection before a challenge settles", async () => {
    const gateway = new LocalGameGateway({ rolls: [[1, 1, 1, 1], [6, 6, 6, 6]] });
    const id = await gateway.createRobotMatch({
      mode: "robot", diceCount: 4, gadgetsEnabled: false, difficulty: "easy",
    });

    expect(Object.keys(await gateway.getPublicMatch(id)).sort()).toEqual([
      "actionSequence", "activeSeat", "bid", "deadlines", "matchId", "mode",
      "players", "rematchAccepted", "round", "score", "settings", "startingSeat", "status",
    ]);
  });
});
