// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {euint256, ebool, e, inco} from "@inco/lightning/src/Lib.sol";
import {
    Mode,
    MatchStatus,
    MatchPublic,
    InvalidDiceCount,
    RoomExists,
    RoomNotFound,
    RoomExpired,
    RoomFull,
    SameWallet,
    NotPlayer,
    InsufficientIncoFee,
    UnauthorizedHandleView
} from "./libraries/HecliarTypes.sol";

interface IIncoFeeView {
    function getFee() external view returns (uint256);
}

contract HecliarGame {
    using e for *;

    uint64 private constant MAX_ROOM_TTL = 24 hours;

    struct RoundSecret {
        euint256[6][2] dice;
        euint256[2] gadgetKinds;
        euint256[2] gadgetTargets;
        ebool[2] scannerResults;
        ebool[2] gadgetTargetValid;
        euint256[2] disclosedEffectCodes;
        bool[2] gadgetPending;
        bool[2] gadgetArmed;
        bool[2] gadgetConsumed;
    }

    struct RoundHandles {
        euint256[6] dice;
        euint256 gadget;
        euint256 gadgetTarget;
        ebool scannerResult;
    }

    mapping(uint256 => MatchPublic) private _matches;
    mapping(uint256 => RoundSecret) private _roundSecrets;
    mapping(bytes32 => uint256) public matchByRoomHash;
    mapping(uint256 => bytes32) public roomHashByMatch;
    mapping(uint256 => uint64) public roomExpiry;
    uint256 public nextMatchId = 1;

    function createRoom(bytes32 roomHash, uint8 diceCount, bool gadgetsEnabled, uint64 ttl)
        external
        returns (uint256 matchId)
    {
        _validateDiceCount(diceCount);
        if (matchByRoomHash[roomHash] != 0) revert RoomExists(roomHash);

        matchId = nextMatchId++;
        MatchPublic storage state = _matches[matchId];
        state.mode = Mode.Friend;
        state.status = MatchStatus.WaitingForPlayer;
        state.players[0] = msg.sender;
        state.diceCount = diceCount;
        state.gadgetsEnabled = gadgetsEnabled;

        uint64 boundedTtl = ttl > MAX_ROOM_TTL ? MAX_ROOM_TTL : ttl;
        uint64 expiresAt = uint64(block.timestamp) + boundedTtl;
        matchByRoomHash[roomHash] = matchId;
        roomHashByMatch[matchId] = roomHash;
        roomExpiry[matchId] = expiresAt;
    }

    function inspectRoom(bytes32 roomHash)
        external
        view
        returns (uint256 matchId, MatchPublic memory state, uint64 expiresAt)
    {
        matchId = matchByRoomHash[roomHash];
        if (matchId == 0) revert RoomNotFound(roomHash);
        expiresAt = roomExpiry[matchId];
        MatchPublic storage storedState = _matches[matchId];
        if (
            storedState.status == MatchStatus.WaitingForPlayer
                && block.timestamp >= expiresAt
        ) {
            revert RoomExpired(roomHash);
        }
        state = storedState;
    }

    function joinRoom(bytes32 roomHash) external returns (uint256 matchId) {
        matchId = matchByRoomHash[roomHash];
        if (matchId == 0) revert RoomNotFound(roomHash);

        MatchPublic storage state = _matches[matchId];
        if (
            state.status == MatchStatus.WaitingForPlayer
                && block.timestamp >= roomExpiry[matchId]
        ) {
            revert RoomExpired(roomHash);
        }
        if (msg.sender == state.players[0]) revert SameWallet();
        if (state.players[1] != address(0)) revert RoomFull(matchId);

        state.players[1] = msg.sender;
        state.status = MatchStatus.WaitingForReady;
    }

    function createRobotMatch(uint8 diceCount, bool gadgetsEnabled, address robot)
        external
        payable
        returns (uint256 matchId)
    {
        _validateDiceCount(diceCount);
        if (robot == address(0) || robot == msg.sender) revert SameWallet();

        uint256 requiredFee = requiredRoundFee(diceCount, gadgetsEnabled);
        if (msg.value != requiredFee) {
            revert InsufficientIncoFee(requiredFee, msg.value);
        }

        matchId = nextMatchId++;
        MatchPublic storage state = _matches[matchId];
        state.mode = Mode.Robot;
        state.status = MatchStatus.ActiveTurn;
        state.players[0] = msg.sender;
        state.players[1] = robot;
        state.diceCount = diceCount;
        state.gadgetsEnabled = gadgetsEnabled;
        state.ready[0] = true;
        state.ready[1] = true;
        state.activeSeat = 0;
        state.startingSeat = 0;
        state.roundNumber = 1;

        _generateRound(matchId, state);
    }

    function requiredRoundFee(uint8 diceCount, bool gadgetsEnabled) public view returns (uint256) {
        _validateDiceCount(diceCount);
        uint256 operations = uint256(diceCount) * 2 + (gadgetsEnabled ? 2 : 0);
        return IIncoFeeView(address(inco)).getFee() * operations;
    }

    function getMyRoundHandles(uint256 matchId) external view returns (RoundHandles memory) {
        MatchPublic storage state = _matches[matchId];
        uint8 seat = _seatOf(state, matchId, msg.sender);
        return _roundHandles(matchId, seat);
    }

    function getRoundHandlesForSeat(uint256 matchId, uint8 seat)
        external
        view
        returns (RoundHandles memory)
    {
        if (seat > 1 || msg.sender != _matches[matchId].players[seat]) {
            revert UnauthorizedHandleView(msg.sender, seat);
        }
        return _roundHandles(matchId, seat);
    }

    function getPublicMatch(uint256 matchId) external view returns (MatchPublic memory) {
        return _matches[matchId];
    }

    function _generateRound(uint256 matchId, MatchPublic storage state) internal {
        RoundSecret storage secret = _roundSecrets[matchId];

        for (uint8 seat = 0; seat < 2; seat++) {
            address player = state.players[seat];
            for (uint8 dieIndex = 0; dieIndex < state.diceCount; dieIndex++) {
                euint256 die = _randomDie();
                secret.dice[seat][dieIndex] = die;
                die.allowThis();
                die.allow(player);
            }

            if (state.gadgetsEnabled) {
                euint256 gadget = _randomGadget();
                secret.gadgetKinds[seat] = gadget;
                gadget.allowThis();
                gadget.allow(player);
            }
        }
    }

    function _roundHandles(uint256 matchId, uint8 seat)
        internal
        view
        returns (RoundHandles memory handles)
    {
        RoundSecret storage secret = _roundSecrets[matchId];
        handles.dice = secret.dice[seat];
        handles.gadget = secret.gadgetKinds[seat];
        handles.gadgetTarget = secret.gadgetTargets[seat];
        handles.scannerResult = secret.scannerResults[seat];
    }

    function _seatOf(MatchPublic storage state, uint256 matchId, address caller)
        internal
        view
        returns (uint8)
    {
        if (state.players[0] == caller) return 0;
        if (state.players[1] == caller) return 1;
        revert NotPlayer(matchId, caller);
    }

    function _randomDie() internal virtual returns (euint256) {
        return e.randBounded(6).add(1);
    }

    function _randomGadget() internal virtual returns (euint256) {
        return e.randBounded(3);
    }

    function _validateDiceCount(uint8 diceCount) internal pure {
        if (diceCount < 3 || diceCount > 6) revert InvalidDiceCount(diceCount);
    }
}
