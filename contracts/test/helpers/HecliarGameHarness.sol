// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {euint256} from "@inco/lightning/src/Lib.sol";
import {HecliarGame} from "../../contracts/HecliarGame.sol";
import {MatchPublic} from "../../contracts/libraries/HecliarTypes.sol";

contract HecliarGameHarness is HecliarGame {
    uint256[] private _presetDice;
    uint256[] private _presetGadgets;
    uint256 private _dieCursor;
    uint256 private _gadgetCursor;
    uint256[] private _presetEffectiveCounts;
    uint256 private _effectiveCountCursor;
    uint256 private _testIncoFee;

    function setPresetSecrets(uint256[] calldata dice, uint256[] calldata gadgets) external {
        _presetDice = dice;
        _presetGadgets = gadgets;
        _dieCursor = 0;
        _gadgetCursor = 0;
    }

    function setPresetEffectiveCounts(uint256[] calldata counts) external {
        _presetEffectiveCounts = counts;
        _effectiveCountCursor = 0;
    }

    function setTestIncoFee(uint256 fee) external {
        _testIncoFee = fee;
    }

    function _randomDie() internal override returns (euint256) {
        return euint256.wrap(bytes32(_presetDice[_dieCursor++]));
    }

    function _randomGadget() internal override returns (euint256) {
        return euint256.wrap(bytes32(_presetGadgets[_gadgetCursor++]));
    }

    function _incoFee() internal view override returns (uint256) {
        return _testIncoFee;
    }

    function _grantStoredSecret(euint256, address) internal pure override {}

    function _prepareChallenge(uint256, MatchPublic storage) internal override returns (euint256) {
        return euint256.wrap(bytes32(_presetEffectiveCounts[_effectiveCountCursor++]));
    }

    function _verifyDecryption(euint256 handle, uint256 value, bytes[] calldata signatures) internal pure override returns (bool) {
        return euint256.unwrap(handle) == bytes32(value) && signatures.length == 1 && keccak256(signatures[0]) == keccak256(hex"01");
    }
}
