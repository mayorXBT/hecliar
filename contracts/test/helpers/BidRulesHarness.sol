// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {BidRules} from "../../contracts/libraries/BidRules.sol";

contract BidRulesHarness {
    function isHigher(uint8 currentQuantity, uint8 currentFace, uint8 nextQuantity, uint8 nextFace)
        external
        pure
        returns (bool)
    {
        return BidRules.isHigher(currentQuantity, currentFace, nextQuantity, nextFace);
    }

    function isInBounds(uint8 quantity, uint8 face, uint8 diceCount) external pure returns (bool) {
        return BidRules.isInBounds(quantity, face, diceCount);
    }
}
