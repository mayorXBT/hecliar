// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {euint256, e} from "@inco/lightning/src/Lib.sol";
import {HecliarGame} from "../../contracts/HecliarGame.sol";

contract HecliarGameHarness is HecliarGame {
    uint256[] private _presetDice;
    uint256[] private _presetGadgets;
    uint256 private _dieCursor;
    uint256 private _gadgetCursor;

    function setPresetSecrets(uint256[] calldata dice, uint256[] calldata gadgets) external {
        _presetDice = dice;
        _presetGadgets = gadgets;
        _dieCursor = 0;
        _gadgetCursor = 0;
    }

    function _randomDie() internal override returns (euint256) {
        return e.asEuint256(_presetDice[_dieCursor++]);
    }

    function _randomGadget() internal override returns (euint256) {
        return e.asEuint256(_presetGadgets[_gadgetCursor++]);
    }
}
