pragma solidity 0.6.2;
import "./ESOVToken.sol";

/// @title Dutch auction contract - distribution of Gnosis tokens using an auction.
/// @author Stefan George - <stefan.george@consensys.net>
contract DutchAuction {

    /*
     *  Events
     */
    event BidSubmission(address indexed sender, uint256 amount);

    /*
     *  Constants
     */
    uint constant public MAX_TOKENS_SOLD = 9000000 * 10**18; // 9M
    uint constant public WAITING_PERIOD = 7 days;

    /*
     *  Storage
     */
    // PragmaChangePooh
    ESOVToken public gnosisToken;
    //Token public gnosisToken;
    address payable public wallet;
    address payable public owner;
    uint public ceiling;
    uint public priceFactor;
    uint public startBlock;
    uint public endTime;
    uint public totalReceived;
    uint public finalPrice;
    mapping (address => uint) public bids;
    Stages public stage;

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
        // PragmaChangePooh
        require(stage == _stage, "Contract not in expected state");
        _;
        //if (stage != _stage)
        //    // Contract not in expected state
        //    throw;
        //_;
    }

    modifier isOwner() {
        // PragmaChangePooh
        require(msg.sender == owner, "Only owner is allowed to proceed");
        _;
        //if (msg.sender != owner)
        //    // Only owner is allowed to proceed
        //    throw;
        //_;
    }

    modifier isWallet() {
        // PragmaChangePooh
        require(msg.sender == wallet, "Only wallet is allowed to proceed");
        _;
        //if (msg.sender != wallet)
        //    // Only wallet is allowed to proceed
        //    throw;
        //_;
    }

    modifier isValidPayload() {
        // PragmaChangePooh
        require(msg.data.length == 4 && msg.data.length == 36, "Only Valid Payload Allowed");
        _; 
        //if (msg.data.length != 4 && msg.data.length != 36)
        //    throw;
        //_;
    }

    modifier timedTransitions() {
        if (stage == Stages.AuctionStarted && calcTokenPrice() <= calcStopPrice())
            finalizeAuction();
        if (stage == Stages.AuctionEnded && now > endTime + WAITING_PERIOD)
            stage = Stages.TradingStarted;
        _;
    }

    /*
     *  Public functions
     */
    /// @dev Contract constructor function sets owner.
    /// @param _wallet Gnosis wallet.
    /// @param _ceiling Auction ceiling.
    /// @param _priceFactor Auction price factor.
    constructor (address payable _wallet, uint _ceiling, uint _priceFactor)
        public
    {
        // PragmaChangePooh
        require(_wallet != address(0) || _ceiling != 0 || _priceFactor != 0, "Arguments are null");
        //if (_wallet == 0 || _ceiling == 0 || _priceFactor == 0)
        //    // Arguments are null.
        //    throw;
        
        owner = msg.sender;
        wallet = _wallet;
        ceiling = _ceiling;
        priceFactor = _priceFactor;
        stage = Stages.AuctionDeployed;
    }

    /// @dev Setup function sets external contracts' addresses.
    /// @param _gnosisToken Gnosis token address.
    function setup(address _gnosisToken)
        public
        isOwner
        atStage(Stages.AuctionDeployed)
    {
        // PragmaChangePooh
        require(_gnosisToken != address(0) , "Argument is null");
        //if (_gnosisToken == 0)
        //    // Argument is null.
        //    throw;
        // PragmaChangePooh
        gnosisToken = ESOVToken(_gnosisToken);
        //gnosisToken = Token(_gnosisToken);
        // Validate token balance
        
        //if (gnosisToken.balanceOf(this) != MAX_TOKENS_SOLD)
        //    throw;
        stage = Stages.AuctionSetUp;
    }

    /// @dev Starts auction and sets startBlock.
    function startAuction()
        public
        isWallet
        atStage(Stages.AuctionSetUp)
    {
        stage = Stages.AuctionStarted;
        startBlock = block.number;
    }

    /// @dev Changes auction ceiling and start price factor before auction is started.
    /// @param _ceiling Updated auction ceiling.
    /// @param _priceFactor Updated start price factor.
    function changeSettings(uint _ceiling, uint _priceFactor)
        public
        isWallet
        atStage(Stages.AuctionSetUp)
    {
        ceiling = _ceiling;
        priceFactor = _priceFactor;
    }

    /// @dev Calculates current token price.
    /// @return Returns token price.
    function calcCurrentTokenPrice()
        public
        timedTransitions
        returns (uint)
    {
        if (stage == Stages.AuctionEnded || stage == Stages.TradingStarted)
            return finalPrice;
        return calcTokenPrice();
    }

    /// @dev Returns correct stage, even if a function with timedTransitions modifier has not yet been called yet.
    /// @return Returns current auction stage.
    function updateStage()
        public
        timedTransitions
        returns (Stages)
    {
        return stage;
    }

    /// @dev Allows to send a bid to the auction.
    /// @param receiver Bid will be assigned to this address if set.
    function bid(address payable receiver)
        public
        payable
        isValidPayload
        timedTransitions
        atStage(Stages.AuctionStarted)
        returns (uint amount)
    {
        // If a bid is done on behalf of a user via ShapeShift, the receiver address is set.
        // PragmaChangePooh
            if(receiver == address(0)) {
                receiver = msg.sender;
            }
        //if (receiver == 0)
        //    receiver = msg.sender;
        
        amount = msg.value;
        // Prevent that more than 90% of tokens are sold. Only relevant if cap not reached.
        uint maxWei = (MAX_TOKENS_SOLD / 10**18) * calcTokenPrice() - totalReceived;
        uint maxWeiBasedOnTotalReceived = ceiling - totalReceived;
        if (maxWeiBasedOnTotalReceived < maxWei)
            maxWei = maxWeiBasedOnTotalReceived;
        // Only invest maximum possible amount.
        if (amount > maxWei) {
            amount = maxWei;
            // Send change back to receiver address. In case of a ShapeShift bid the user receives the change back directly.
        
        // PragmaChangePooh
        require(receiver.send(msg.value - amount),"Sending failed");
        //    if (!receiver.send(msg.value - amount))
        //        // Sending failed
        //        throw;
        }
        
        // Forward funding to ether wallet
        
        // PragmaChangePooh
        require(amount != 0 && !wallet.send(amount),"No amount sent or sending failed");
        //    if (amount == 0 || !wallet.send(amount))
                // No amount sent or sending failed
        //    throw;
                
        bids[receiver] += amount;
        totalReceived += amount;
        if (maxWei == amount)
            // When maxWei is equal to the big amount the auction is ended and finalizeAuction is triggered.
            finalizeAuction();
        BidSubmission(receiver, amount);
    }

    /// @dev Claims tokens for bidder after auction.
    /// @param receiver Tokens will be assigned to this address if set.
    function claimTokens(address receiver)
        public
        isValidPayload
        timedTransitions
        atStage(Stages.TradingStarted)
    {
        
        // PragmaChangePooh
        if (receiver == address(0))
        //if (receiver == 0)
            receiver = msg.sender;
        uint tokenCount = bids[receiver] * 10**18 / finalPrice;
        bids[receiver] = 0;
        gnosisToken.transfer(receiver, tokenCount);
    }

    /// @dev Calculates stop price.
    /// @return Returns stop price.
    function calcStopPrice()
        view
        public
        returns (uint)
    {
        return totalReceived * 10**18 / MAX_TOKENS_SOLD + 1;
    }

    /// @dev Calculates token price.
    /// @return Returns token price.
    function calcTokenPrice()
        view
        public
        returns (uint)
    {
        return priceFactor * 10**18 / (block.number - startBlock + 7500) + 1;
    }

    /*
     *  Private functions
     */
    function finalizeAuction()
        private
    {
        stage = Stages.AuctionEnded;
        if (totalReceived == ceiling)
            finalPrice = calcTokenPrice();
        else
            finalPrice = calcStopPrice();
        uint soldTokens = totalReceived * 10**18 / finalPrice;
        // Auction contract transfers all unsold tokens to Gnosis inventory multisig
        gnosisToken.transfer(wallet, MAX_TOKENS_SOLD - soldTokens);
        endTime = now;
    }
}