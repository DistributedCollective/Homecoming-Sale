//SPDX-License-Identifier: MIT
pragma solidity 0.6.2;

import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

//import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/GSN/Context.sol";
//import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/math/SafeMath.sol";
//import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/access/Ownable.sol";
//import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/ERC20.sol";

contract ESOVToken is ERC20, Ownable {
    using SafeMath for uint256;

    string private constant NAME = "ESOVrynToken"; // Token Name
    string private constant SYMBOL = "ESOV"; // Token Symbol

    bool public isSaleEnded;
    address payable saleAdmin;
    bool public isSaleAdminsUpdate;

    /**
     *
     * All three of these values are immutable: they can only be set once during
     * construction.
     */
    constructor(uint256 totalSupply_, address payable _esovAdmin)
        public
        ERC20(NAME, SYMBOL)
    {
        transferOwnership(_esovAdmin);
        _mint(_esovAdmin, totalSupply_);
    }

    function saleClosure(bool _isSaleEnded) public {
        require(msg.sender == saleAdmin, "Only saleAdmin can close the sale");
        if (!isSaleEnded) {
            isSaleEnded = _isSaleEnded;
        }
    }

    function setSaleAdmin(address payable _saleAdmin) external onlyOwner {
        saleAdmin = _saleAdmin;
        isSaleAdminsUpdate = true;
        require(
            transfer(saleAdmin, balanceOf(owner())),
            "saleAdmin token transer failed"
        );
    }

    /**
     * @dev See {IERC20-transfer}.
     *
     * Requirements:
     *
     * - `recipient` cannot be the zero address.
     * - the caller must have a balance of at least `amount`.
     */
    function transfer(address to, uint256 value)
        public
        override
        returns (bool)
    {
        if (onlyAllowed(msg.sender)) {
            return super.transfer(to, value);
        }
        return false;
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public override returns (bool) {
        if (onlyAllowed(sender)) {
            return super.transferFrom(sender, recipient, amount);
        }
        return false;
    }

    function onlyAllowed(address adminAllowed) internal view returns (bool) {
        require(
            isSaleEnded || adminAllowed == owner() || adminAllowed == saleAdmin,
            "Token Transfer is not allowed during the sale"
        );
        return true;
    }
}
