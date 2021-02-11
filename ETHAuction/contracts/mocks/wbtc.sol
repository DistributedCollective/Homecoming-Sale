pragma solidity ^0.6.2;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract WBTC is ERC20 {
    uint8 decimals_ = 8;
    
    constructor() public ERC20("Wrapped BTC", "WBTC") {
        _setupDecimals(decimals_);
    }

// faucet for testing
function faucet(address to, uint amount) external {
    _mint(to, amount);
  }
}