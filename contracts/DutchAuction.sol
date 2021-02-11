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
    // address payable public owner;
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
    bool public saleEnded;
    uint256 public blockDuration;
    bool public IsRemovedFailedTx;
    //bool public IsBtc;
    // Admin wallets allowed to assign tokens to BTC investors
    mapping(address => bool) public isAdmin;
    // BTC address AND amount for manual reimburse
    address public reimburseBTCAddr;
    uint256 public reimburseBTCAmount;
    address[] public SovAddresses;
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

    modifier timedTransitions() {
        if (
            stage == Stages.AuctionStarted &&
            ((calcTokenPrice() <= calcStopPrice()) || block.number >= endBlock)
        ) finalizeAuction();

        if (stage == Stages.AuctionEnded && saleEnded)
            stage = Stages.TradingStarted;
        _;
    }

    modifier onlyAdmin() {
        require(isAdmin[msg.sender], "unauthorized");
        _;
    }

    /*
    modifier tokenExist(address erc20Token) {
        require(
            allowedTokens[erc20Token] == true,
            "this token is not Allowed"
        );
        _;
    }

*/
    /*
     *  Public functions
     */
    /// @dev Contract constructor function sets owner.
    /// @param _wallet Sovryn wallet.
    /// @param _ceiling Auction ceiling.
    /// @param _priceFactorNumerator Auction price Factor Numerator.
    /// @param _priceFactorDenominator Auction price Factor Denominator.
    /// @param _priceConst Auction price Factor Denominator.
    constructor(
        address payable _wallet,
        uint256 _ceiling,
        uint256 _priceFactorNumerator,
        uint256 _priceFactorDenominator,
        uint256 _priceConst,
        uint256 _blockDuration
    ) public {
        require(
            _wallet != address(0) ||
                _ceiling != 0 ||
                _priceFactorNumerator != 0 ||
                _priceFactorDenominator != 0 ||
                _priceConst != 0 ||
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

    /*
    function addToken(address[] memory _erc20Token)
        public
        onlyOwner
    {
        for (uint256 i = 0; i < _erc20Token.length; i++) {
            allowedTokens[_erc20Token[i]] = true;
        }
    }

    function removeToken(address[] memory _erc20Token) public onlyOwner {
        for (uint256 i = 0; i < _erc20Token.length; i++) {
            allowedTokens[_erc20Token[i]] = false;
        }
    }
*/
    
    function SovAddrSize() public view returns (uint){
        return SovAddresses.length;
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

    function preDeposit(
        address[] memory _preDepositAddr,
        uint256[] memory _preDepositAmount
    ) public onlyOwner atStage(Stages.AuctionSetUp) {
        require(
            _preDepositAddr.length == _preDepositAmount.length,
            "pre deposit Addresses and Amounts arrays should have the same size"
        );
        for (uint256 i = 0; i < _preDepositAddr.length; i++) {
            uint256 tempTotal = totalReceived.add(_preDepositAmount[i]);
            if (tempTotal > ceiling) {
                break;
            }
            if (_preDepositAmount[i] == 0) {
                continue;
            }
            updateBids(_preDepositAddr[i], _preDepositAmount[i]);
        }
    }

    function updateBids(address _bidAdr, uint256 _bidVal) internal {
        require(_bidVal != 0, "Should send more than 0 amount");
        if (bids[_bidAdr] == 0) {
            SovAddresses.push(_bidAdr);
        }
        bids[_bidAdr] = bids[_bidAdr].add(_bidVal);
        totalReceived = totalReceived.add(_bidVal);
    }

    /// @dev remove not approved PreDeposit TX
    /// @param _bidAdr array of addresses of Non approved TX BTC pre-deposit
    /// @param _bidVal array of amounts of Non approved TX BTC pre-deposit
    function removeBTCAdr(
        address[] calldata _bidAdr,
        uint256[] calldata _bidVal
    ) external onlyOwner atStage(Stages.AuctionEnded) {
        require(
            _bidAdr.length == _bidVal.length,
            "pre deposit Addresses and Amounts arrays should have the same size"
        );
        for (uint256 i = 0; i < _bidAdr.length; i++) {
            if (bids[_bidAdr[i]] >= _bidVal[i]) {
                bids[_bidAdr[i]] = bids[_bidAdr[i]].sub(_bidVal[i]);
                totalReceived = totalReceived.sub(_bidVal[i]);
            }
        }
        IsRemovedFailedTx = true;
    }

    /// @dev Starts auction and sets startBlock.
    function startAuction() public onlyOwner atStage(Stages.AuctionSetUp) {
        stage = Stages.AuctionStarted;
        startBlock = block.number;
        endBlock = blockDuration.add(startBlock);
    }

    /// @dev Changes auction ceiling and start price factor before auction is started.
    /// @param _ceiling Updated auction ceiling.
    /// @param _priceFactorNumerator Auction price Factor Numerator.
    /// @param _priceFactorDenominator Auction price Factor Denominator.
    /// @param _priceConst Auction price Constant.
    /// @param _blockDuration Auction block Duration.
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
        // max blockDuration of the sale
        blockDuration = _blockDuration;
    }

    /// @dev Calculates current token price.
    /// @return Returns token price.
    function calcCurrentTokenPrice() public timedTransitions returns (uint256) {
        if (stage == Stages.AuctionEnded || stage == Stages.TradingStarted)
            return finalPrice;
        return calcTokenPrice();
    }

    /// @dev Returns correct stage, even if a function with timedTransitions modifier has not yet been called yet.
    /// @return Returns current auction stage.
    function updateStage() public timedTransitions returns (Stages) {
        return stage;
    }

    // BTC deposit - Allowed only by the admins wallets
    /// @dev Allows to send a RBTC bid to the auction.
    /// @param _investor - address
    /// @param _amount - amount (wei)
    function bidBTC(address payable _investor, uint256 _amount)
        external
        onlyAdmin
        atStage(Stages.AuctionStarted)
        timedTransitions
    //returns (uint256 actualAmount)
    {
        bid(_investor, _amount, true);
    }

    // RBTC deposit - sent by the users
    /// @dev Allows to send a RBTC bid to the auction.
    function bidRBTC()
        external
        payable
        atStage(Stages.AuctionStarted)
        timedTransitions
    //returns (uint256 actualAmount)
    {
        bid(msg.sender, msg.value, false);
    }

    // RBTC deposit
    /// @dev Allows to send a RBTC bid to the auction.
    ///  receiver Bid will be assigned to this address if set.
    function bid(
        address _receiver,
        uint256 _amount,
        bool _IsBtc
    )
        internal
        //atStage(Stages.AuctionStarted)
        //timedTransitions
    //returns (uint256 actualAmount)
    {
        bool IsBtc = _IsBtc;
        uint256 amount = _amount;
        address payable receiver = payable(_receiver);

        // Auction has ended during this block - full reimburse
        if (stage == Stages.AuctionEnded && !IsBtc) {
            receiver.transfer(amount);
        } else if (stage == Stages.AuctionEnded && IsBtc) {
            reimburseBTCAddr = receiver;
            reimburseBTCAmount = amount;
        } else {
            // Prevent that more than 90% of tokens are sold. Only relevant if cap not reached.
            //uint256 maxWei =
            uint256 maxWei =
                ((MAX_TOKENS_SOLD.div(10**18)).mul(calcTokenPrice())).sub(
                    totalReceived
                );
            uint256 maxWeiBasedOnTotalReceived = ceiling.sub(totalReceived);
            if (maxWeiBasedOnTotalReceived < maxWei)
                maxWei = maxWeiBasedOnTotalReceived;

            // Only invest maximum possible amount.
            if (amount > maxWei) {
                uint256 reImburse = amount.sub(maxWei);
                amount = maxWei;
                if (!IsBtc) {
                    receiver.transfer(reImburse);
                } else {
                    reimburseBTCAddr = receiver;
                    reimburseBTCAmount = reImburse;
                }
            }

            // Forward funding to vault wallet only for RBTC bid case
            require(amount != 0);
            if (!IsBtc) {
                wallet.transfer(amount);
            }

            updateBids(receiver, amount);
            if (maxWei == amount)
                // When maxWei is equal to thSe big amount the auction is ended and finalizeAuction is triggered.
                finalizeAuction();
            BidSubmission(receiver, amount);
            //actualAmount = amount;
            //return actualAmount;
        }
    }

    function addAdmins(address[] calldata admins) external onlyOwner {
        for (uint256 i = 0; i < admins.length; i++) {
            if (admins[i] == address(0)) {
                continue;
            }
            isAdmin[admins[i]] = true;
        }
    }

    function removeAdmins(address[] calldata admins) external onlyOwner {
        for (uint256 i = 0; i < admins.length; i++) {
            if (admins[i] == address(0)) {
                continue;
            }
            isAdmin[admins[i]] = false;
        }
    }

    /*
    // ChangePooh add ERC20 BTC deposits
    /// @dev Allows to send a bid of ERC20 to the auction.
    /// @param receiver Bid will be assigned to this address if set.
    /// @param amountEBTC Amount of ERC20 BTC units of wei.
    /// @param tickerEBTC Ticker of ERC20 BTC.

    //Pooh added for debug
    //uint256 public maxWei;
    //uint256 public reImburse;

    // ERC20 btc wrappers tokens deposit
    function bidEBTC(
        address payable receiver,
        uint256 amountEBTC,
        address _erc20Token
    )
        external
        payable
        tokenExist(_erc20Token)
        atStage(Stages.AuctionStarted)
        timedTransitions
        returns (uint256 actualAmount)
    {
        address tokenDeposit = _erc20Token;
        IERC20(tokenDeposit).transferFrom(
            msg.sender,
            address(this),
            amountEBTC
        );
        // Auction has ended during this block - full reimburse
        if (stage == Stages.AuctionEnded) {
            require(
                IERC20(tokenDeposit).transfer(receiver, amountEBTC),
                "Reimburse failed"
            );
            return 0;
        } else {
            // Prevent that more than 90% of tokens are sold. Only relevant if cap not reached.
            //uint256 maxWei =
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

            // Forward funding to vault wallet
            require(amountEBTC != 0);
            require(
                IERC20(tokenDeposit).transfer(wallet, amountEBTC),
                "Deposit to Vault failed"
            );

            bids[receiver] = bids[receiver].add(amountEBTC);
            totalReceived = totalReceived.add(amountEBTC);
            if (maxWei == amountEBTC)
                // When maxWei is equal to thSe big amount the auction is ended and finalizeAuction is triggered.
                finalizeAuction();
            BidSubmission(receiver, amountEBTC);
            actualAmount = amountEBTC;
            return actualAmount;
        }
    }
*/
    /// @dev SOV allocation of _investor
    /// @param _investor address SOV allocated to
    function tokenAllocation(address _investor)
        external
        view
        returns (uint256)
    {
        require(
            stage == Stages.AuctionEnded || stage == Stages.TradingStarted,
            "cannot call tokenAllocation at current stage"
        );
        return ((bids[_investor] * 10**18) / finalPrice);
    }

    /// @dev Claims tokens for bidder after auction.
    ///  receiver Tokens will be assigned to this address if set.
    function claimTokens()
        public
        timedTransitions
        atStage(Stages.TradingStarted)
    {
        address payable receiver = msg.sender;
        require(bids[receiver] > 0, "Not eligable to receive tokens");
        uint256 tokenCount = (bids[receiver] * 10**18) / finalPrice;
        bids[receiver] = 0;
        sovrynToken.transfer(receiver, tokenCount);
    }

    /// @dev Calculates stop price.
    /// @return Returns stop price.
    function calcStopPrice() public view returns (uint256) {
        return ((totalReceived.mul(10**18)).div(MAX_TOKENS_SOLD)).add(1);
    }

    /// @dev Calculates token price.
    /// @return Returns token price.
    function calcTokenPrice() public view returns (uint256) {
        // return (priceFactor * 10**18) / (block.number - startBlock + 7500) + 1;
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

    /// @dev Close the sale after it has ended
    /// @param _isSaleEnded = true to close the sale.
    function saleClosure(bool _isSaleEnded)
        external
        onlyOwner()
        atStage(Stages.AuctionEnded)
    {
        require(
            IsRemovedFailedTx,
            "Must remove Failed BTC TX Before Sale closure"
        );
        sovrynToken.saleClosure(_isSaleEnded);
        if(!saleEnded) {
            saleEnded = _isSaleEnded;
        }
    }

    /*
     *  Private functions
     */
    function finalizeAuction() private {
        stage = Stages.AuctionEnded;
        //if (totalReceived == ceiling || block.number >= endBlock) {
        if ((totalReceived == ceiling) || block.number >= endBlock) {
            finalPrice = calcTokenPrice();
        } else finalPrice = calcStopPrice();
        uint256 soldTokens = (totalReceived.mul(10**18)).div(finalPrice);
        // Auction contract transfers all unsold tokens to Sovryn inventory multisig
        sovrynToken.transfer(wallet, MAX_TOKENS_SOLD.sub(soldTokens));
        //endBlock = now;
    }
}
