pragma solidity 0.6.2;
import "./ESOVToken.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

//import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/IERC20.sol";

/// @title Dutch auction contract - distribution of Gnosis tokens using an auction.
/// @author Stefan George - <stefan.george@consensys.net>
contract DutchAuction is Ownable {
    using SafeMath for uint256;
    /*
     *  Events
     */
    event BidSubmission(address indexed sender, uint256 amount);

    /*
     *  Constants
     */
    uint256 public constant MAX_TOKENS_SOLD = 2000000 * 10**18; // 2M
    //uint256 public constant WAITING_PERIOD = 7 days;
    uint256 public constant WAITING_PERIOD = 1; ///testing

    /*
     *  Storage
     */
    ESOVToken public sovrynToken;
    address payable public wallet;
    // wei deposits ceiling for the Auction
    uint256 public ceiling;
    // Parameters for calcTokenPrice() equation
    uint256 public priceFactorNumerator;
    uint256 public priceFactorDenominator;
    uint256 public priceConst;

    uint256 public startBlock;
    uint256 public endBlock;
    // wei received
    uint256 public totalReceived;
    uint256 public finalPrice;
    mapping(address => uint256) public bids;
    Stages public stage;
    // bool public saleEnded;
    uint256 public blockDuration;
    mapping(address => bool) public allowedTokens;
    address[] public tokensAddr;
    
    /*
     *  Enums
     */
    enum Stages {
        AuctionDeployed,
        AuctionSetUp,
        AuctionStarted,                                  
        AuctionEnded,
        TradingStarted
    }

    /*
     *  Modifiers
     */
    modifier atStage(Stages _stage) {
        require(stage == _stage, "Contract not in expected stage");
        _;
    }

    modifier tokenExist(address erc20Token) {
        require(
            allowedTokens[erc20Token] == true,
            "this token is not Allowed"
        );
        _;
    }

    /*
     *  Public functions
     */
    /// @dev Contract constructor function sets owner.
    /// @param _wallet Sovryn wallet.
    /// @param _ceiling Auction ceiling.
    /// @param _priceFactorNumerator Auction price Factor Numerator.
    /// @param _priceFactorDenominator Auction price Factor Denominator.
    /// @param _priceConst Auction price Factor Denominator.
    /// @param _blockDuration Auction block duration.
    constructor(
        address payable _wallet,
        uint256 _ceiling,
        uint256 _priceFactorNumerator,
        uint256 _priceFactorDenominator,
        uint256 _priceConst,
        uint256 _blockDuration
    ) public {
        require(
            _wallet != address(0) &&
                _ceiling != 0 &&
                _priceFactorNumerator != 0 &&
                _priceFactorDenominator != 0 &&
                _priceConst != 0 &&
                _blockDuration != 0,
            "Arguments are null"
        );

        wallet = _wallet;
        ceiling = _ceiling;
        blockDuration = _blockDuration;
        // Parameters for calcTokenPrice() equation
        priceFactorNumerator = _priceFactorNumerator;
        priceFactorDenominator = _priceFactorDenominator;
        priceConst = _priceConst;

        stage = Stages.AuctionDeployed;
    }

    /// @dev add allowed tokens for deposit. price calculation assumes BTC wrappers tokens only.
    /// @param _erc20Token Array of approved tokens for deposit.
    function addToken(address[] memory _erc20Token)
        public
        onlyOwner
    {
        for (uint256 i = 0; i < _erc20Token.length; i++) {
            if (allowedTokens[_erc20Token[i]] == false) {
                allowedTokens[_erc20Token[i]] = true;
                tokensAddr.push(_erc20Token[i]);
            }
        }
    }

    /// @dev remove allowed tokens for deposit. price calculation assumes BTC wrappers tokens only.
    /// @param _erc20Token Array of tokens to be removed for deposit.
    function removeToken(address[] memory _erc20Token)
        public
        onlyOwner
    {
        for (uint256 i = 0; i < _erc20Token.length; i++) {
            if(allowedTokens[_erc20Token[i]] == true) {
                allowedTokens[_erc20Token[i]] = false;
                for (uint256 j = 0; j < tokensAddr.length; j++) {
                    if(tokensAddr[j]==_erc20Token[i]) {
                        tokensAddr[j] = tokensAddr[tokensAddr.length-1];
                        delete tokensAddr[tokensAddr.length-1];
                    }
                }
            }
        }
    }

    /// @dev Setup function sets external contracts' addresses.
    /// @param _sovrynToken Sovryn token address.
    /// @param _esovAdmin New owner.

    function setup(address _sovrynToken, address payable _esovAdmin)
        public
        onlyOwner
        atStage(Stages.AuctionDeployed)
    {
        require(_sovrynToken != address(0), "Argument is null");
        sovrynToken = ESOVToken(_sovrynToken);
        transferOwnership(_esovAdmin);
        stage = Stages.AuctionSetUp;
    }

    /// @dev Starts auction and sets startBlock.
    function startAuction() public onlyOwner atStage(Stages.AuctionSetUp) {
        require(sovrynToken.balanceOf(address(this)) == MAX_TOKENS_SOLD,
            "Auction SC must hold MAX_TOKENS_SOLD ESOV balance before starting the auction"); 
        stage = Stages.AuctionStarted;
        startBlock = block.number;
        endBlock = blockDuration.add(startBlock);
    }

    /// @dev Changes auction setup parameters before auction start.
    /// @param _ceiling Auction ceiling.
    /// @param _priceFactorNumerator Auction price Factor Numerator.
    /// @param _priceFactorDenominator Auction price Factor Denominator.
    /// @param _priceConst Auction price Factor Constant.
    /// @param _blockDuration Auction block duration.
    function changeSettings(
        uint256 _ceiling,
        uint256 _priceFactorNumerator,
        uint256 _priceFactorDenominator,
        uint256 _priceConst,
        uint256 _blockDuration
    ) public onlyOwner atStage(Stages.AuctionSetUp) {
        ceiling = _ceiling;
        // Parameters for calcTokenPrice() equation
        priceFactorNumerator = _priceFactorNumerator;
        priceFactorDenominator = _priceFactorDenominator;
        priceConst = _priceConst;
        blockDuration = _blockDuration;
    }

    /// @dev Calculates current token price.
    /// @return Returns token price.
    function calcCurrentTokenPrice() public returns (uint256) {
        if (stage == Stages.AuctionStarted){
            return calcTokenPrice();    
        } 
        else if (stage == Stages.AuctionEnded || stage == Stages.TradingStarted) {
            return finalPrice;
        }
        return 0;
    }
    
    /// @dev Allows to send a bid of ERC20 (BTC Wrapper) to the auction.
    /// @param receiver Bid will be assigned to this address if set.
    /// @param amountEBTC Amount of ERC20 BTC units of wei.
    /// @param _erc20Token Address of ERC20 BTC.
    function bidEBTC(
        address payable receiver,
        uint256 amountEBTC, 
        address _erc20Token
    )
        external
        payable
        tokenExist(_erc20Token)
        atStage(Stages.AuctionStarted)
        returns (uint256 actualAmount)
    {
        address tokenDeposit = _erc20Token;
        IERC20(tokenDeposit).transferFrom(
            msg.sender,
            address(this),
            amountEBTC
        );

        // Check if auction has ended due to blockDuration or to price equilibrium
        if(block.number >= endBlock || calcTokenPrice() <= calcStopPrice())
        {
            finalizeAuction();
        }
        // Auction has ended during this block - full reimburse
        if (stage == Stages.AuctionEnded) {
            require(
                IERC20(tokenDeposit).transfer(receiver, amountEBTC),
                "Reimburse failed"
            );
            return 0;
        } else {
            // Prevent that more than 90% of tokens are sold. Only relevant if cap not reached.
            uint256 maxWei =
                ((MAX_TOKENS_SOLD.div(10**18)).mul(calcTokenPrice())).sub(
                    totalReceived
                );
            uint256 maxWeiBasedOnTotalReceived = ceiling.sub(totalReceived);
            if (maxWeiBasedOnTotalReceived < maxWei)
                maxWei = maxWeiBasedOnTotalReceived;

            // Only invest maximum possible amount.
            if (amountEBTC > maxWei) {
                uint256 reImburse = amountEBTC.sub(maxWei);
                amountEBTC = maxWei;
                require(
                    IERC20(tokenDeposit).transfer(receiver, reImburse),
                    "Reimburse failed"
                );
            }

            bids[receiver] = bids[receiver].add(amountEBTC);
            totalReceived = totalReceived.add(amountEBTC);
            if (maxWei == amountEBTC)
                // When maxWei is equal to the bid amount the auction is ended and finalizeAuction is triggered.
                finalizeAuction();
            BidSubmission(receiver, amountEBTC);
            actualAmount = amountEBTC;
            return actualAmount;
        }
    }

/// @dev Withdraw all ERC20 Deposits to the wallet thru the bridge 
    function withdrawDeposits()
        public
        onlyOwner
    {
        require((stage == Stages.AuctionEnded || stage == Stages.TradingStarted),
             "cannot withdraw before the sale ends"); 
        for(uint256 i = 0; i < tokensAddr.length; i++) {
            address token = tokensAddr[i];
            uint256 balance = IERC20(token).balanceOf(address(this));
            if(balance > 0 ) {
               require(
                 IERC20(token).transfer(wallet,balance),
                 "Withdraw deposits to wallet thru the bridge failed"
                );
            }
        }
    }

    /// @dev Claims tokens for bidder after auction.
    ///  receiver Tokens will be assigned to this address if set.
    function claimTokens()
        public
        atStage(Stages.TradingStarted)
    {
        address payable receiver = msg.sender;
        require(bids[receiver] > 0, "Not eligable to receive tokens");
        uint256 tokenCount = (bids[receiver] * 10**18) / finalPrice;
        bids[receiver] = 0;
        require(sovrynToken.transfer(receiver, tokenCount), "ESOV token transfer failed");
    }

    /// @dev Calculates stop price.
    /// @return Returns stop price.
    function calcStopPrice() public view returns (uint256) {
        return ((totalReceived.mul(10**18)).div(MAX_TOKENS_SOLD)).add(1);
    }

    /// @dev Calculates token price.
    /// @return Returns token price.
    function calcTokenPrice() public returns (uint256) {
        uint256 lastBlock;
        if (block.number >= endBlock) {
            lastBlock = endBlock;
        } else {
            lastBlock = block.number;
        }
        uint256 calculatedPrice =
            (
                (priceFactorNumerator.mul(10**18)).div(
                    (
                        priceFactorDenominator.mul(
                            ((lastBlock.sub(startBlock)).add(priceConst))
                        )
                    )
                )
            )
                .add(1);
        return calculatedPrice;
    }

    /// @dev Owner Closes the sale after it has ended
    function saleClosure()
        external
        onlyOwner
        atStage(Stages.AuctionEnded)
    {
        stage = Stages.TradingStarted;
    }

    /*
     *  Private functions
     */
     /// @dev finalize AuctionOwner Closes the sale after it has ended
    function finalizeAuction() private {
        stage = Stages.AuctionEnded;
        if ((totalReceived == ceiling) || block.number >= endBlock) {
            finalPrice = calcTokenPrice();
        } else finalPrice = calcStopPrice();
        uint256 soldTokens = (totalReceived.mul(10**18)).div(finalPrice);
        // Auction contract transfers all unsold tokens to Sovryn Wallet thru bridge
        sovrynToken.transfer(wallet, MAX_TOKENS_SOLD.sub(soldTokens));
    }
}
