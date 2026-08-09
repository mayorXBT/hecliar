// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

enum Mode {
    Robot,
    Friend
}

enum MatchStatus {
    WaitingForPlayer,
    WaitingForReady,
    Rolling,
    ActiveTurn,
    ResolvingChallenge,
    RoundComplete,
    MatchComplete,
    Cancelled
}

enum GadgetKind {
    Echo,
    Jammer,
    Scanner
}

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
error InsufficientIncoFee(uint256 required, uint256 received);
error AlreadyReady(uint8 seat);
error UnauthorizedHandleView(address caller, uint8 seat);
