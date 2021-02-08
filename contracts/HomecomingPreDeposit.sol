pragma solidity ^0.6.2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./DutchAuction.sol";

contract HomecomingPreDeposit is Ownable{
    using SafeMath for uint256;
    using Address for address;
    using EnumerableSet for EnumerableSet.AddressSet;

    mapping (address => EnumerableSet.AddressSet) investors;
    mapping (address => mapping (address => uint)) public investments;
    mapping (address => uint256) public lastProcessed;
    
    DutchAuction public auctionContract;

    event Deposit(address indexed token, address indexed user, uint256 indexed amount);
    event Withdraw(address indexed token, address indexed user, uint256 indexed amount);
    event SetAuctionContract(DutchAuction indexed newAuctionContract);
    event MoveToAuction(address indexed token, uint256 indexed lastProcessed);

    constructor (DutchAuction _auctionContract) public {
        auctionContract = _auctionContract;
    }

    /** 
     * @notice
     * Can only be called before sale started
     * Before calling this function to deposit, users need approve this contract to be able to spend or transfer their tokens
     */
    function deposit(address _token, uint256 _amount) public {
        require((DutchAuction.Stages.AuctionDeployed == auctionContract.stage()) || (DutchAuction.Stages.AuctionSetUp == auctionContract.stage()), "Only could be called before sale started");
        require(_token.isContract(), "Token address should be smart contract address");
        require(_amount > 0, "Amount should larger than zero");
        IERC20(_token).transferFrom(msg.sender, address(this), _amount);
        uint256 balance = investments[_token][msg.sender];
        if (balance > 0) {
            investments[_token][msg.sender] = balance.add(_amount);
        } else {
            investors[_token].add(msg.sender);
            investments[_token][msg.sender] = _amount;
        }
        emit Deposit(_token, msg.sender, _amount);
    }

    /** 
     * @notice Can only be called before sale started
     */
    function withdraw(address _token, uint256 _amount) public {
        require((DutchAuction.Stages.AuctionDeployed == auctionContract.stage()) || (DutchAuction.Stages.AuctionSetUp == auctionContract.stage()), "Only could be called before sale started");
        require(_token.isContract(), "Token address should be smart contract address");
        require(_amount > 0, "Amount should larger than zero");

        uint256 balance = investments[_token][msg.sender];

        require(balance > 0, "You do not make an investment");
        require(balance >= _amount, "Balance not enough");

        if (balance == _amount) {
            investors[_token].remove(msg.sender);
            investments[_token][msg.sender] = 0;
        } else {
            investments[_token][msg.sender] = balance.sub(_amount);
        }

        IERC20(_token).transfer(msg.sender, _amount);

        emit Withdraw(_token, msg.sender, _amount);
    }

    /** 
     * @notice Can only be called by authorized wallet / owner
     */
    function setAuctionContract(DutchAuction _auctionContract) public onlyOwner {
        auctionContract = _auctionContract;

        emit SetAuctionContract(_auctionContract);
    }

    /** 
     * @notice Can only be called after sale started
     */
    function moveToAuction(address _token) public {
        require(_token.isContract(), "Token address should be smart contract address");
        require(DutchAuction.Stages.AuctionStarted == auctionContract.stage(), "Only could be called after sale started");

        IERC20(_token).approve(address(auctionContract), IERC20(_token).balanceOf(address(this)));
        
        EnumerableSet.AddressSet storage investors_ = investors[_token];
        uint256 investorsLength = investors_.length();
        uint256 gasLeft;
        for (uint256 i = lastProcessed[_token]; i < investorsLength; i++) {
            address payable investor = payable(investors_.at(i));
            auctionContract.bidEBTC(investor, investments[_token][investor], _token);
            assembly {gasLeft := gas()}
            if (gasLeft < 100000) {
                lastProcessed[_token] = i.add(1);
                emit MoveToAuction(_token, lastProcessed[_token]);
                return;
            }
        }

        lastProcessed[_token] = investorsLength;

        emit MoveToAuction(_token, lastProcessed[_token]);
    }
}