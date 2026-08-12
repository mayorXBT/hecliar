// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

enum Mode { Robot, Friend }

enum MatchStatus {
    WaitingForPlayer, WaitingForReady, Rolling,
    ActiveTurn, ResolvingChallenge, RoundComplete,
    MatchComplete, Cancelled
}

enum GadgetKind { Echo, Jammer, Scanner }

struct Bid {
    uint8 quantity;
    uint8 face;
    uint8 bidderSeat;
    uint32 sequence;
}

struct MatchPublic {
    Mode mode;
    MatchStatus status;
    address[2] players;
    uint8 diceCount;
    bool gadgetsEnabled;
    bool[2] ready;
    uint8 activeSeat;
    uint8 startingSeat;
    uint8 roundNumber;
    uint8[2] score;
    Bid currentBid;
    uint32 actionSequence;
    uint64 actionDeadline;
    uint64 abandonmentDeadline;
    bool[2] rematchAccepted;
}

struct ChallengeSettlement {
    uint256[12] dieValues;
    bytes[][12] dieSignatures;
    uint256 effectiveCount;
    bytes[] effectiveCountSignatures;
}

struct RoundResult {
    bool settled;
    uint8[6][2] revealedRolls;
    Bid challengedBid;
    uint8 baseCount;
    uint256 effectiveCount;
    uint8 winnerSeat;
    uint8[2] resultingScore;
}

error InvalidDiceCount(uint8 diceCount);
error RoomExists(bytes32 roomHash);
error RoomNotFound(bytes32 roomHash);
error RoomExpired(bytes32 roomHash);
error RoomFull(uint256 matchId);
error SameWallet();
error NotPlayer(uint256 matchId, address caller);
error WrongStatus(uint256 matchId, MatchStatus status);
error NotActivePlayer(uint256 matchId, address caller);
error StaleSequence(uint32 expected, uint32 received);
error InvalidBid(uint8 quantity, uint8 face);
error NoBid(uint256 matchId);
error InvalidAttestation(uint8 slot);
error InvalidInactiveSlot(uint8 slot);
error RoundNotSettled(uint256 matchId, uint8 roundNumber);
error WrongMode(uint256 matchId, Mode mode);
error NotRoundFunder(uint256 matchId, address caller);
error InsufficientIncoFee(uint256 required, uint256 received);
error AlreadyReady(uint8 seat);
error UnauthorizedHandleView(address caller, uint8 seat);
error GadgetsDisabled(uint256 matchId);
error GadgetUsedThisRound(uint256 matchId, uint8 seat);
error GadgetTargetOutOfRange(uint8 target, uint8 diceCount);
error ScannerRequiresBid(uint256 matchId);
error NotReady(uint256 matchId, uint8 seat);
error TurnNotExpired(uint256 matchId);
error NoAbandonment(uint256 matchId);
error NotBothAccepted(uint256 matchId);
error RematchAlreadyAccepted(uint256 matchId, uint8 seat);
