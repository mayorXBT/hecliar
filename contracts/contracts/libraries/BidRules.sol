// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

library BidRules {
    function isHigher(uint8 currentQuantity, uint8 currentFace, uint8 nextQuantity, uint8 nextFace)
        internal
        pure
        returns (bool)
    {
        return nextQuantity > currentQuantity
            || (nextQuantity == currentQuantity && nextFace > currentFace);
    }

    function isInBounds(uint8 quantity, uint8 face, uint8 diceCount) internal pure returns (bool) {
        return quantity >= 1 && quantity <= diceCount * 2 && face >= 1 && face <= 6;
    }
}
