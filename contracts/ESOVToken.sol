//SPDX-License-Identifier: MIT
pragma solidity 0.6.2;

//import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
//import "@openzeppelin/contracts/token/ERC20/ERC20Burnable.sol";

//import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/GSN/Context.sol";
//import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/math/SafeMath.sol";
//import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/access/Ownable.sol";
//import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/ERC20.sol";

contract ESOVToken is ERC20, Ownable {
    using SafeMath for uint256;

    string private constant NAME = "ESOVrynToken"; // Token Name
    string private constant SYMBOL = "ESOV"; // Token Symbol

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
}
