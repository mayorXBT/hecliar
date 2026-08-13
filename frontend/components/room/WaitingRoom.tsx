"use client";

import type { MatchSettings } from "@hecliar/game-logic";

type Props = {
  roomCode: string;
  settings: MatchSettings;
  hostReady: boolean;
  guestReady: boolean;
  isHost: boolean;
  pendingAction: string | null;
  onReady: () => void;
  onCancel: () => void;
};

export function WaitingRoom({ roomCode, settings, hostReady, guestReady, isHost, pendingAction, onReady, onCancel }: Props) {
  const blocked = pendingAction !== null;
  return (
    <div className="waiting-room">
      <h2>Private Room</h2>
      <div className="room-code-display">
        <span className="label">Room code</span>
        <span className="room-code">{roomCode}</span>
      </div>
      <div className="room-settings">
        <span>{settings.diceCount} dice per side</span>
        <span>{settings.gadgetsEnabled ? "Gadgets enabled" : "No gadgets"}</span>
      </div>
      <div className="player-status">
        <div className={`player-slot ${hostReady ? "ready" : ""}`}>
          <span>Host</span>
          <span>{hostReady ? "Ready" : "Waiting"}</span>
        </div>
        <div className={`player-slot ${guestReady ? "ready" : ""}`}>
          <span>{isHost ? "Guest" : "You"}</span>
          <span>{guestReady ? "Ready" : "Waiting"}</span>
        </div>
      </div>
      <div className="room-actions">
        <button className="primary-action" disabled={blocked} onClick={onReady}>
          {pendingAction ? "Confirming…" : "Ready"}
        </button>
        <button className="secondary-action" disabled={blocked} onClick={onCancel}>
          Leave
        </button>
      </div>
    </div>
  );
}
