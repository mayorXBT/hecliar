// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {euint256, ebool, e, inco} from "@inco/lightning/src/Lib.sol";
import {
    Mode, MatchStatus, Bid, GadgetKind,
    MatchPublic, ChallengeSettlement, RoundResult,
    InvalidDiceCount, RoomExists, RoomNotFound, RoomExpired, RoomFull,
    SameWallet, NotPlayer, WrongStatus, NotActivePlayer,
    StaleSequence, InvalidBid, NoBid,
    InvalidAttestation, InvalidInactiveSlot,
    RoundNotSettled, WrongMode, NotRoundFunder,
    InsufficientIncoFee, UnauthorizedHandleView, AlreadyReady,
    GadgetsDisabled, GadgetUsedThisRound, GadgetTargetOutOfRange,
    ScannerRequiresBid, NotReady, TurnNotExpired,
    NoAbandonment, NotBothAccepted, RematchAlreadyAccepted
} from "./libraries/HecliarTypes.sol";
import {BidRules} from "./libraries/BidRules.sol";

interface IIncoFeeView {
    function getFee() external view returns (uint256);
}

contract HecliarGame {
    using e for *;

    uint64 private constant MAX_ROOM_TTL = 24 hours;
    uint64 private constant ACTION_WINDOW = 45 seconds;
    uint64 private constant ABANDONMENT_WINDOW = 120 seconds;

    event BidRaised(uint256 indexed matchId, uint8 quantity, uint8 face, uint8 indexed bidderSeat, uint32 sequence);
    event ChallengeRequested(uint256 indexed matchId, uint8 indexed challengerSeat, uint32 sequence, bytes32 effectiveCountHandle);
    event RoundSettled(uint256 indexed matchId, uint8 indexed roundNumber, uint8 bidQuantity, uint8 bidFace, uint8 bidderSeat, uint8 baseCount, uint256 effectiveCount, uint8 winnerSeat, uint8 score0, uint8 score1, uint256[12] dieValues);
    event GadgetUsed(uint256 indexed matchId, uint8 indexed seat, uint32 sequence);
    event ReadyChanged(uint256 indexed matchId, uint8 indexed seat, bool ready);
    event TurnTimedOut(uint256 indexed matchId, uint8 indexed expiredSeat, uint8 roundNumber);
    event Abandoned(uint256 indexed matchId, uint8 indexed abandonedSeat);
    event RematchAccepted(uint256 indexed matchId, uint8 indexed seat);
    event MatchRematched(uint256 indexed matchId, uint8 roundNumber);

    struct RoundSecret {
        euint256[6][2] dice;
        euint256[2] gadgetKinds;
        euint256[2] gadgetTargets;
        ebool[2] scannerResults;
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

    struct ChallengeHandles {
        bytes32[12] dice;
        bytes32 effectiveCount;
        bytes32[2] effectCodes;
    }

    mapping(uint256 => MatchPublic) private _matches;
    mapping(uint256 => RoundSecret) private _roundSecrets;
    mapping(uint256 => euint256) private _effectiveCounts;
    mapping(uint256 => mapping(uint8 => RoundResult)) private _roundResults;
    mapping(bytes32 => uint256) public matchByRoomHash;
    mapping(uint256 => bytes32) public roomHashByMatch;
    mapping(uint256 => uint64) public roomExpiry;
    uint256 public nextMatchId = 1;

    function createRoom(bytes32 roomHash, uint8 diceCount, bool gadgetsEnabled, uint64 ttl)
        external returns (uint256 matchId)
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
        external view returns (uint256 matchId, MatchPublic memory state, uint64 expiresAt)
    {
        matchId = matchByRoomHash[roomHash];
        if (matchId == 0) revert RoomNotFound(roomHash);
        expiresAt = roomExpiry[matchId];
        MatchPublic storage storedState = _matches[matchId];
        if (storedState.status == MatchStatus.WaitingForPlayer && block.timestamp >= expiresAt)
            revert RoomExpired(roomHash);
        state = storedState;
    }

    function joinRoom(bytes32 roomHash) external returns (uint256 matchId) {
        matchId = matchByRoomHash[roomHash];
        if (matchId == 0) revert RoomNotFound(roomHash);
        MatchPublic storage state = _matches[matchId];
        if (state.status == MatchStatus.WaitingForPlayer && block.timestamp >= roomExpiry[matchId])
            revert RoomExpired(roomHash);
        if (msg.sender == state.players[0]) revert SameWallet();
        if (state.players[1] != address(0)) revert RoomFull(matchId);
        state.players[1] = msg.sender;
        state.status = MatchStatus.WaitingForReady;
    }

    function createRobotMatch(uint8 diceCount, bool gadgetsEnabled, address robot)
        external payable returns (uint256 matchId)
    {
        _validateDiceCount(diceCount);
        if (robot == address(0) || robot == msg.sender) revert SameWallet();
        uint256 requiredFee = requiredRoundFee(diceCount, gadgetsEnabled);
        if (msg.value != requiredFee) revert InsufficientIncoFee(requiredFee, msg.value);
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
        _refreshDeadlines(state);
        _generateRound(matchId, state);
    }

    function requiredRoundFee(uint8 diceCount, bool gadgetsEnabled) public view returns (uint256) {
        _validateDiceCount(diceCount);
        uint256 operations = uint256(diceCount) * 2 + (gadgetsEnabled ? 2 : 0);
        return _incoFee() * operations;
    }

    function raise(uint256 matchId, uint8 quantity, uint8 face, uint32 expectedSequence) external {
        MatchPublic storage state = _requireActiveTurn(matchId, expectedSequence);
        uint8 seat = _seatOf(state, matchId, msg.sender);
        if (seat != state.activeSeat) revert NotActivePlayer(matchId, msg.sender);
        if (!BidRules.isInBounds(quantity, face, state.diceCount)) revert InvalidBid(quantity, face);
        Bid memory current = state.currentBid;
        if (current.quantity != 0 && !BidRules.isHigher(current.quantity, current.face, quantity, face))
            revert InvalidBid(quantity, face);
        uint32 sequence = state.actionSequence + 1;
        state.actionSequence = sequence;
        state.currentBid = Bid({quantity: quantity, face: face, bidderSeat: seat, sequence: sequence});
        state.activeSeat = 1 - seat;
        _refreshDeadlines(state);
        emit BidRaised(matchId, quantity, face, seat, sequence);
    }

    function challenge(uint256 matchId, uint32 expectedSequence) external {
        MatchPublic storage state = _requireActiveTurn(matchId, expectedSequence);
        uint8 challengerSeat = _seatOf(state, matchId, msg.sender);
        if (challengerSeat != state.activeSeat) revert NotActivePlayer(matchId, msg.sender);
        if (state.currentBid.quantity == 0) revert NoBid(matchId);
        state.status = MatchStatus.ResolvingChallenge;
        state.actionSequence += 1;
        euint256 effectiveCount = _prepareChallenge(matchId, state);
        _effectiveCounts[matchId] = effectiveCount;
        emit ChallengeRequested(matchId, challengerSeat, state.actionSequence, euint256.unwrap(effectiveCount));
    }

    function getChallengeHandles(uint256 matchId) external view returns (ChallengeHandles memory handles) {
        MatchPublic storage state = _matches[matchId];
        if (state.status != MatchStatus.ResolvingChallenge) revert WrongStatus(matchId, state.status);
        RoundSecret storage secret = _roundSecrets[matchId];
        for (uint8 seat = 0; seat < 2; seat++) {
            for (uint8 index = 0; index < 6; index++)
                handles.dice[uint256(seat) * 6 + index] = euint256.unwrap(secret.dice[seat][index]);
            handles.effectCodes[seat] = euint256.unwrap(secret.disclosedEffectCodes[seat]);
        }
        handles.effectiveCount = euint256.unwrap(_effectiveCounts[matchId]);
    }

    function settleChallenge(uint256 matchId, ChallengeSettlement calldata settlement, uint32 expectedSequence) external {
        MatchPublic storage state = _matches[matchId];
        if (state.status != MatchStatus.ResolvingChallenge) revert WrongStatus(matchId, state.status);
        if (state.actionSequence != expectedSequence) revert StaleSequence(state.actionSequence, expectedSequence);
        RoundSecret storage secret = _roundSecrets[matchId];
        uint8[6][2] memory revealedRolls;
        uint8 baseCount;
        for (uint8 seat = 0; seat < 2; seat++) {
            for (uint8 index = 0; index < 6; index++) {
                uint8 slot = seat * 6 + index;
                uint256 value = settlement.dieValues[slot];
                bytes[] calldata signatures = settlement.dieSignatures[slot];
                if (index >= state.diceCount) {
                    if (value != 0 || signatures.length != 0) revert InvalidInactiveSlot(slot);
                    continue;
                }
                if (!_verifyDecryption(secret.dice[seat][index], value, signatures))
                    revert InvalidAttestation(slot);
                revealedRolls[seat][index] = uint8(value);
                if (value == state.currentBid.face) baseCount += 1;
            }
        }
        if (!_verifyDecryption(_effectiveCounts[matchId], settlement.effectiveCount, settlement.effectiveCountSignatures))
            revert InvalidAttestation(12);
        Bid memory challengedBid = state.currentBid;
        uint8 winnerSeat = settlement.effectiveCount >= challengedBid.quantity
            ? challengedBid.bidderSeat : 1 - challengedBid.bidderSeat;
        state.score[winnerSeat] += 1;
        RoundResult storage result = _roundResults[matchId][state.roundNumber];
        result.settled = true;
        result.revealedRolls = revealedRolls;
        result.challengedBid = challengedBid;
        result.baseCount = baseCount;
        result.effectiveCount = settlement.effectiveCount;
        result.winnerSeat = winnerSeat;
        result.resultingScore = state.score;
        state.actionSequence += 1;
        state.status = state.score[winnerSeat] == 2 ? MatchStatus.MatchComplete : MatchStatus.RoundComplete;
        _emitRoundSettled(matchId, state, result, settlement.dieValues);
    }

    function getRoundResult(uint256 matchId, uint8 roundNumber) external view returns (RoundResult memory result) {
        result = _roundResults[matchId][roundNumber];
        if (!result.settled) revert RoundNotSettled(matchId, roundNumber);
    }

    function fundAndStartNextRound(uint256 matchId, uint32 expectedSequence) external payable {
        MatchPublic storage state = _matches[matchId];
        if (state.status != MatchStatus.RoundComplete) revert WrongStatus(matchId, state.status);
        if (state.actionSequence != expectedSequence) revert StaleSequence(state.actionSequence, expectedSequence);
        if (state.mode != Mode.Robot) revert WrongMode(matchId, state.mode);
        if (msg.sender != state.players[0]) revert NotRoundFunder(matchId, msg.sender);
        uint256 requiredFee = requiredRoundFee(state.diceCount, state.gadgetsEnabled);
        if (msg.value != requiredFee) revert InsufficientIncoFee(requiredFee, msg.value);
        _nextRound(matchId, state);
    }

    function setReady(uint256 matchId) external {
        MatchPublic storage state = _matches[matchId];
        if (state.status != MatchStatus.WaitingForReady) revert WrongStatus(matchId, state.status);
        uint8 seat = _seatOf(state, matchId, msg.sender);
        if (state.ready[seat]) revert AlreadyReady(seat);
        state.ready[seat] = true;
        emit ReadyChanged(matchId, seat, true);
        if (state.ready[0] && state.ready[1]) {
            state.status = MatchStatus.ActiveTurn;
            state.activeSeat = 0;
            state.startingSeat = 0;
            state.roundNumber = 1;
            state.actionSequence += 1;
            _refreshDeadlines(state);
            _generateRound(matchId, state);
        }
    }

    function useGadget(uint256 matchId, bytes calldata encryptedTarget, uint32 expectedSequence) external {
        MatchPublic storage state = _requireActiveTurn(matchId, expectedSequence);
        uint8 seat = _seatOf(state, matchId, msg.sender);
        if (seat != state.activeSeat) revert NotActivePlayer(matchId, msg.sender);
        if (!state.gadgetsEnabled) revert GadgetsDisabled(matchId);
        RoundSecret storage secret = _roundSecrets[matchId];
        if (secret.gadgetConsumed[seat]) revert GadgetUsedThisRound(matchId, seat);
        secret.gadgetArmed[seat] = true;
        secret.gadgetConsumed[seat] = true;
        secret.gadgetTargets[seat] = euint256.wrap(bytes32(encryptedTarget));
        secret.gadgetTargets[seat].allowThis();
        state.actionSequence += 1;
        state.activeSeat = 1 - seat;
        _refreshDeadlines(state);
        emit GadgetUsed(matchId, seat, state.actionSequence);
    }

    function claimTurnTimeout(uint256 matchId, uint32 expectedSequence) external {
        MatchPublic storage state = _matches[matchId];
        if (state.status != MatchStatus.ActiveTurn) revert WrongStatus(matchId, state.status);
        if (state.actionSequence != expectedSequence) revert StaleSequence(state.actionSequence, expectedSequence);
        if (block.timestamp < state.actionDeadline) revert TurnNotExpired(matchId);
        uint8 expiredSeat = state.activeSeat;
        uint8 winnerSeat = 1 - expiredSeat;
        state.score[winnerSeat] += 1;
        state.actionSequence += 1;
        state.status = state.score[winnerSeat] == 2 ? MatchStatus.MatchComplete : MatchStatus.RoundComplete;
        emit TurnTimedOut(matchId, expiredSeat, state.roundNumber);
    }

    function claimAbandonment(uint256 matchId, uint32 expectedSequence) external {
        MatchPublic storage state = _matches[matchId];
        if (state.status == MatchStatus.MatchComplete || state.status == MatchStatus.Cancelled)
            revert WrongStatus(matchId, state.status);
        if (state.actionSequence != expectedSequence) revert StaleSequence(state.actionSequence, expectedSequence);
        if (block.timestamp < state.abandonmentDeadline) revert NoAbandonment(matchId);
        uint8 abandonedSeat = 1 - _seatOf(state, matchId, msg.sender);
        state.status = MatchStatus.MatchComplete;
        state.score[1 - abandonedSeat] = 2;
        state.actionSequence += 1;
        emit Abandoned(matchId, abandonedSeat);
    }

    function acceptRematch(uint256 matchId) external {
        MatchPublic storage state = _matches[matchId];
        if (state.status != MatchStatus.MatchComplete) revert WrongStatus(matchId, state.status);
        uint8 seat = _seatOf(state, matchId, msg.sender);
        if (state.rematchAccepted[seat]) revert RematchAlreadyAccepted(matchId, seat);
        state.rematchAccepted[seat] = true;
        emit RematchAccepted(matchId, seat);
        if (state.mode == Mode.Robot || (state.rematchAccepted[0] && state.rematchAccepted[1]))
            _rematch(matchId, state);
    }

    function getMyRoundHandles(uint256 matchId) external view returns (RoundHandles memory) {
        uint8 seat = _seatOf(_matches[matchId], matchId, msg.sender);
        return _roundHandles(matchId, seat);
    }

    function getRoundHandlesForSeat(uint256 matchId, uint8 seat) external view returns (RoundHandles memory) {
        if (seat > 1 || msg.sender != _matches[matchId].players[seat])
            revert UnauthorizedHandleView(msg.sender, seat);
        return _roundHandles(matchId, seat);
    }

    function getPublicMatch(uint256 matchId) external view returns (MatchPublic memory) {
        return _matches[matchId];
    }

    function _rematch(uint256 matchId, MatchPublic storage state) internal {
        delete state.currentBid;
        delete _roundSecrets[matchId];
        _effectiveCounts[matchId] = euint256.wrap(bytes32(0));
        state.roundNumber = 1;
        state.startingSeat = 0;
        state.activeSeat = 0;
        state.score = [0, 0];
        state.rematchAccepted = [false, false];
        state.status = MatchStatus.ActiveTurn;
        state.actionSequence += 1;
        _refreshDeadlines(state);
        _generateRound(matchId, state);
        emit MatchRematched(matchId, 1);
    }

    function _nextRound(uint256 matchId, MatchPublic storage state) internal {
        delete state.currentBid;
        delete _roundSecrets[matchId];
        _effectiveCounts[matchId] = euint256.wrap(bytes32(0));
        state.roundNumber += 1;
        state.startingSeat = 1 - state.startingSeat;
        state.activeSeat = state.startingSeat;
        state.rematchAccepted = [false, false];
        state.status = MatchStatus.ActiveTurn;
        state.actionSequence += 1;
        _refreshDeadlines(state);
        _generateRound(matchId, state);
        emit MatchRematched(matchId, state.roundNumber);
    }

    function _generateRound(uint256 matchId, MatchPublic storage state) internal {
        RoundSecret storage secret = _roundSecrets[matchId];
        for (uint8 seat = 0; seat < 2; seat++) {
            address player = state.players[seat];
            for (uint8 dieIndex = 0; dieIndex < state.diceCount; dieIndex++) {
                euint256 die = _randomDie();
                secret.dice[seat][dieIndex] = die;
                _grantStoredSecret(die, player);
            }
            if (state.gadgetsEnabled) {
                euint256 gadget = _randomGadget();
                secret.gadgetKinds[seat] = gadget;
                _grantStoredSecret(gadget, player);
            }
        }
    }

    function _roundHandles(uint256 matchId, uint8 seat) internal view returns (RoundHandles memory handles) {
        RoundSecret storage secret = _roundSecrets[matchId];
        handles.dice = secret.dice[seat];
        handles.gadget = secret.gadgetKinds[seat];
        handles.gadgetTarget = secret.gadgetTargets[seat];
        handles.scannerResult = secret.scannerResults[seat];
    }

    function _seatOf(MatchPublic storage state, uint256 matchId, address caller) internal view returns (uint8) {
        if (state.players[0] == caller) return 0;
        if (state.players[1] == caller) return 1;
        revert NotPlayer(matchId, caller);
    }

    function _requireActiveTurn(uint256 matchId, uint32 expectedSequence)
        internal view returns (MatchPublic storage state)
    {
        state = _matches[matchId];
        if (state.status != MatchStatus.ActiveTurn) revert WrongStatus(matchId, state.status);
        if (state.actionSequence != expectedSequence) revert StaleSequence(state.actionSequence, expectedSequence);
    }

    function _refreshDeadlines(MatchPublic storage state) internal {
        state.actionDeadline = uint64(block.timestamp) + ACTION_WINDOW;
        state.abandonmentDeadline = uint64(block.timestamp) + ABANDONMENT_WINDOW;
    }

    function _prepareChallenge(uint256 matchId, MatchPublic storage state)
        internal virtual returns (euint256 count)
    {
        RoundSecret storage secret = _roundSecrets[matchId];
        euint256 zero = e.asEuint256(0);
        euint256 one = e.asEuint256(1);
        count = zero;
        for (uint8 seat = 0; seat < 2; seat++) {
            bool ownGadgetUsed = secret.gadgetArmed[seat] && secret.gadgetConsumed[seat];
            uint8 oppSeat = 1 - seat;
            bool oppGadgetUsed = secret.gadgetArmed[oppSeat] && secret.gadgetConsumed[oppSeat];
            for (uint8 index = 0; index < state.diceCount; index++) {
                ebool matches = secret.dice[seat][index].eq(uint256(state.currentBid.face));
                euint256 contribution = e.select(matches, one, zero);
                if (ownGadgetUsed) {
                    ebool isEcho = secret.gadgetKinds[seat].eq(uint256(GadgetKind.Echo));
                    ebool isTargeted = secret.gadgetTargets[seat].eq(uint256(index));
                    ebool echoBonus = isEcho.and(isTargeted).and(matches);
                    count = count.add(e.select(echoBonus, one, zero));
                }
                if (oppGadgetUsed) {
                    ebool isJammer = secret.gadgetKinds[oppSeat].eq(uint256(GadgetKind.Jammer));
                    ebool oppTargeted = secret.gadgetTargets[oppSeat].eq(uint256(index));
                    ebool jammerCancels = isJammer.and(oppTargeted);
                    count = count.sub(e.select(jammerCancels, contribution, zero));
                }
                count = count.add(contribution);
                e.reveal(secret.dice[seat][index]);
            }
        }
        count.allowThis();
        e.reveal(count);
    }

    function _randomDie() internal virtual returns (euint256) {
        return e.randBounded(6).add(1);
    }

    function _randomGadget() internal virtual returns (euint256) {
        return e.randBounded(3);
    }

    function _incoFee() internal view virtual returns (uint256) {
        return IIncoFeeView(address(inco)).getFee();
    }

    function _grantStoredSecret(euint256 value, address owner) internal virtual {
        value.allowThis();
        value.allow(owner);
    }

    function _verifyDecryption(euint256 handle, uint256 value, bytes[] calldata signatures)
        internal view virtual returns (bool)
    {
        return handle.verifyDecryption(value, signatures);
    }

    function _emitRoundSettled(uint256 matchId, MatchPublic storage state, RoundResult storage result, uint256[12] calldata dieValues) internal {
        emit RoundSettled(matchId, state.roundNumber, result.challengedBid.quantity, result.challengedBid.face, result.challengedBid.bidderSeat, result.baseCount, result.effectiveCount, result.winnerSeat, result.resultingScore[0], result.resultingScore[1], dieValues);
    }

    function _validateDiceCount(uint8 diceCount) internal pure {
        if (diceCount < 3 || diceCount > 6) revert InvalidDiceCount(diceCount);
    }
}
