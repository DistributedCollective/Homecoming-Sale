pragma solidity ^0.6.2;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SBTC is ERC20 {
    // uint8 decimals = 18;

    constructor() public ERC20("Synth sBTC", "SBTC") {
        //  _setupDecimals(decimals);
    }

    // faucet for testing
    function faucet(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
