const { expectEvent, expectRevert, time, expect } = require('@openzeppelin/test-helpers');
const DutchAuction = artifacts.require('DutchAuction.sol');
const ESOVToken = artifacts.require('ESOVToken.sol');
const Wbtc = artifacts.require('mocks/WBTC.sol');
const Sbtc = artifacts.require('mocks/SBTC.sol');

contract('DutchAuction', (accounts) => {
  let dutch;
  let saleAddress;
  let token;
  let tokenAddr;
  let gasPrice;
  let wbtc, sbtc;
  let dutchAddress;
  let totalReceivedTest = web3.utils.toBN('0');

  const [WBTC, SBTC] = ['WBTC', 'SBTC']
        .map(ticker => web3.utils.fromAscii(ticker));

  const totalSupply = web3.utils.toWei('2000000');
  
  let blockDuration = 20;
  
  let ceiling = web3.utils.toWei('2.5');
  let priceFactorNumerator = '6';
  let priceFactorDenominator = '10000';
  let priceConst = '6';
  //let floorPrice = web3.utils.toWei('0.00003');

  const investor1 = accounts[1];
  const investor2 = accounts[2];
  const investor3 = accounts[3];
  
  const Stages = {
    AuctionDeployed: 0,
    AuctionSetUp: 1,
    AuctionStarted: 2,
    AuctionEnded: 3,
    TradingStarted: 4
  };
  let owner = accounts[0]; 
  console.log("Owner: " + owner);
  
  let sovrynAddress = accounts[8];
  let esovAdmin = accounts[9];
    
describe("Deploy DutchAuction contracts", () => {
  it('Check ESOV Deployment', async () => {
  //deploy ESOVToken
    token = await ESOVToken.new(totalSupply, esovAdmin, {from: owner});
    tokenAddr = await token.address;

  // Deploy DutchAuction  
    dutch = await DutchAuction.new(
      sovrynAddress,
      ceiling,
      priceFactorNumerator,
      priceFactorDenominator,
      priceConst,
      blockDuration,
      { from: owner });
    dutchAddress = await dutch.address;

    await token.setSaleAdmin(dutchAddress, {from: esovAdmin});
    console.log("ESOV sc balance: " + await token.balanceOf(dutchAddress));

    ([wbtc, sbtc] = await Promise.all([
      Wbtc.new(),
      Sbtc.new()
    ]));

    await dutch.addToken([WBTC, SBTC], [wbtc.address, sbtc.address], { from: owner });

  // seed amount per investor per ERC20-BTC
    const amount = web3.utils.toWei('2');
  // Declare a function that:
  // 1. Faucet the trader account
  // 2. Approve DutchAuction SC for token transfer.
    const seedTokenBalance = async (token, investor) => {
      await token.faucet(investor, amount, { from: esovAdmin });
    
      await token.approve(
              dutchAddress,
              amount,
              {from: investor}
          );
      };
  // Call the seedTokenBalance function
      await Promise.all(
          [wbtc, sbtc].map(
              token => seedTokenBalance(token, investor1)
          )
      );
      await Promise.all(
          [wbtc, sbtc].map(
              token => seedTokenBalance(token, investor2)
          )
      );
  });
/*
  it('Check ESOV Deployment', async () => {
    const totalSC = await token.totalSupply();
    const ownerSC = await token.owner();

    assert(totalSC.eq(web3.utils.toBN(totalSupply)));
    console.log( "ESOV Owner: " + ownerSC );
    console.log( "ESOV Owner: " + esovAdmin );
  });
  it('Check DutchAuction Deployment', async () => {
    const walletSC = await dutch.wallet();
    const ceilingSC = await dutch.ceiling();
    const priceFactorNumeratorSC = await dutch.priceFactorNumerator();
    const priceFactorDenominatorSC = await dutch.priceFactorDenominator();
    const priceConstSC = await dutch.priceConst();
    const blockDurationSC = await dutch.blockDuration();
    const ownerSC = await dutch.owner();

    assert(ceilingSC.eq(web3.utils.toBN(ceiling)));
    assert(priceFactorNumeratorSC.eq(web3.utils.toBN(priceFactorNumeratorSC)));
    assert(priceFactorDenominatorSC.eq(web3.utils.toBN(priceFactorDenominatorSC)));
    assert(priceConstSC.eq(web3.utils.toBN(priceConstSC)));
    assert(blockDurationSC.eq(web3.utils.toBN(blockDurationSC)));
    console.log( "Vault: " + walletSC );
    console.log( "Vault: " + sovrynAddress );
    console.log( "Dutch Owner: " + ownerSC );
    console.log( "Dutch Owner: " + owner );
    let currentStage =await dutch.stage();
    assert(currentStage.toNumber() === 0);
  });
*/
});

beforeEach (async () => {
//deploy ESOVToken
    token = await ESOVToken.new(totalSupply, esovAdmin, {from: owner});
    tokenAddr = await token.address;
// Deploy DutchAuction  
    dutch = await DutchAuction.new(
      sovrynAddress,
      ceiling,
      priceFactorNumerator,
      priceFactorDenominator,
      priceConst,
      blockDuration,
      { from: owner });
    dutchAddress = await dutch.address;
    await token.setSaleAdmin(dutchAddress, {from: esovAdmin});
    //console.log("ESOV sc balance: " + await token.balanceOf(dutchAddress));

    ([wbtc, sbtc] = await Promise.all([
      Wbtc.new(),
      Sbtc.new()
     ]));
// Add Allowed token deposit to DutchAuction 
    await dutch.addToken([WBTC, SBTC], [wbtc.address, sbtc.address], { from: owner });
  
  // seed amount per investor per ERC20-BTC
    const amount = web3.utils.toWei('2');
  // Declare a function that:
  // 1. Faucet the trader account
    const seedTokenBalance = async (token, investor) => {
      await token.faucet(investor, amount, { from: esovAdmin });

      await token.approve(
              dutchAddress,
              amount,
              {from: investor}
          );
      };
  // Call the seedTokenBalance function
      await Promise.all(
          [wbtc, sbtc].map(
              token => seedTokenBalance(token, investor1)
          )
      );
      await Promise.all(
          [wbtc, sbtc].map(
              token => seedTokenBalance(token, investor2)
          )
      );
});
/*
describe("setup", () => {
    it('should NOT setup if not owner', async () => {
      await expectRevert(
        dutch.setup(tokenAddr, esovAdmin,{ from: accounts[2] }),
        'Ownable: caller is not the owner.'
      );
    });
    
    it('should setup', async () => {
      let currentStage =await dutch.stage();
      assert(currentStage.toNumber() === 0);
      await dutch.setup(tokenAddr, esovAdmin,{ from: owner });
      console.log(" DutchAuction new owner: " + await dutch.owner());
      console.log(" DutchAuction token address: " + await dutch.sovrynToken());
      currentStage =await dutch.stage();
      assert(currentStage.toNumber() === 1);
      });
});

describe("changeSettings", () => {
    it('should NOT changeSettings if not owner', async () => {
      await dutch.setup(tokenAddr, esovAdmin,{ from: owner });
      let currentStage =await dutch.stage();
      assert(currentStage.toNumber() === 1);
      await expectRevert(
        dutch.changeSettings(1000 ,8 ,10000, 9, 30, { from: accounts[2] }),
        'Ownable: caller is not the owner.'
      );  
    });
    
    it('should changeSettings', async () => {
      await dutch.setup(tokenAddr, esovAdmin,{ from: owner });
      let currentStage =await dutch.stage();
      assert(currentStage.toNumber() === 1);

      await dutch.changeSettings(1000 ,8 ,10000, 9, 30, { from: esovAdmin });

      const ceilingSC = await dutch.ceiling();
      const priceFactorNumeratorSC = await dutch.priceFactorNumerator();
      const priceFactorDenominatorSC = await dutch.priceFactorDenominator();
      const priceConstSC = await dutch.priceConst();
      const blockDurationSC = await dutch.blockDuration();
      //const floorPriceSC = await dutch.floorPrice();

  
      assert(ceilingSC.eq(web3.utils.toBN('1000')));
      assert(priceFactorNumeratorSC.eq(web3.utils.toBN('8')));
      assert(priceFactorDenominatorSC.eq(web3.utils.toBN('10000')));
      assert(priceConstSC.eq(web3.utils.toBN('9')));
      assert(blockDurationSC.eq(web3.utils.toBN('30')));
      //assert(floorPriceSC.eq(web3.utils.toBN(web3.utils.toWei('0.0003'));

    });
});

describe("startAuction", () => {
    it('should NOT startAuction if not owner', async () => {
      await dutch.setup(tokenAddr, esovAdmin, { from: owner });
      let currentStage =await dutch.stage();
      assert(currentStage.toNumber() === 1);
      await expectRevert(
        dutch.startAuction({ from: sovrynAddress }),
        'Ownable: caller is not the owner.'
      );
    });
    
    it('should startAuction', async () => {
      await dutch.setup(tokenAddr, esovAdmin, { from: owner });
      let currentStage =await dutch.stage();
      assert(currentStage.toNumber() === 1);
      await dutch.startAuction({ from: esovAdmin });
      currentStage =await dutch.stage();
      assert(currentStage.toNumber() === 2);
      console.log(currentStage.toNumber());
    });
});

// bidEBTC - ERC20 (BTC wrapper) deposit
describe("bidEBTC NOT on correct Stage", () => {
    it('should NOT send bidEBTC if not on AuctionStarted stage', async () => {
      await dutch.setup(tokenAddr, esovAdmin, { from: owner });
      let bidAmount = web3.utils.toWei('1');
      await expectRevert(
        dutch.bidEBTC(investor2, bidAmount, sbtc, {from: investor2}),
        "Contract not in expected stage"
      );
    })
});
*/
describe("bidEBTC onStage - deposit ceiling constraint path", () => {
    beforeEach(async () => {
      await dutch.setup(tokenAddr, esovAdmin, { from: owner });
      await dutch.startAuction({ from: esovAdmin });
      currentStage =await dutch.stage();
      assert(currentStage.toNumber() === 2);
    });  
    
    it('should NOT send bidEBTC if not allowed token deposit', async () => {
      await dutch.removeToken([WBTC], { from: esovAdmin });
      let allowedToken = await dutch.allowedTokens(WBTC);
      console.log("sbtc Not allowed (should be 0x0): " + allowedToken.tokenAddress);

      let bidAmount = web3.utils.toWei('1');
      await expectRevert(
        dutch.bidEBTC(investor2, bidAmount, WBTC, {from: investor2}),
        "this token is not Allowed"
      );
    });

    it('Full flow send bidEBTC => end sale at ceiling => reimburse => close sale => claim ESOV', async () => {
      let blockNumber = await web3.eth.getBlockNumber();
      console.log("block#: " + blockNumber);

      let tprice = await dutch.calcTokenPrice.call();
      console.log("t0 price: " + tprice); 
      
      let allowedArray = [];
      
      let allowedToken = await dutch.allowedTokens(WBTC);
      console.log("WBTC address allowed: " + allowedToken.tokenAddress);
      allowedToken = await dutch.allowedTokens(SBTC);
      console.log("SBTC address allowed: " + allowedToken.tokenAddress);
      
      let bidAmount = web3.utils.toWei('1.1');
    // Deposit 1: investor1 deposit wbtc
      blockNumber = await web3.eth.getBlockNumber();
      console.log("block#: " + blockNumber);  
      tprice = await dutch.calcTokenPrice.call();
      console.log("t1 price: " + tprice); 
  
      let wbtcInvestor1BalanceBefore = await wbtc.balanceOf(investor1);
      let auctionTotalreceivedBefore = await dutch.totalReceived()
      let walletwbtcBefore = await wbtc.balanceOf(sovrynAddress);
      
      let tx = await dutch.bidEBTC(investor1, bidAmount, WBTC, {from: investor1});
      totalReceivedTest = totalReceivedTest.add(web3.utils.toBN(bidAmount));

      let wbtcInvestor1BalanceAfter = await wbtc.balanceOf(investor1);
      let auctionTotalreceivedAfter = await dutch.totalReceived()
      let walletwbtcAfter = await wbtc.balanceOf(sovrynAddress);

      expectEvent(tx, 'BidSubmission', {
        sender: investor1,
        amount: '1100000000000000000'
      });
      
      assert((wbtcInvestor1BalanceBefore - wbtcInvestor1BalanceAfter) ==
             (auctionTotalreceivedAfter - auctionTotalreceivedBefore));
      assert((wbtcInvestor1BalanceBefore - wbtcInvestor1BalanceAfter) ==
             (walletwbtcAfter - walletwbtcBefore));
   
    // Deposit 2:  investor1 deposit sbtc
      blockNumber = await web3.eth.getBlockNumber();
      console.log("block#: " + blockNumber);    
      tprice = await dutch.calcTokenPrice.call();
      console.log("t2 price: " + tprice); 

      let sbtcInvestor1BalanceBefore = await sbtc.balanceOf(investor1);
      auctionTotalreceivedBefore = await dutch.totalReceived()
      let walletsbtcBefore = await sbtc.balanceOf(sovrynAddress);
      
      tx = await dutch.bidEBTC(investor1, bidAmount, SBTC, {from: investor1});
      totalReceivedTest  = totalReceivedTest.add(web3.utils.toBN(bidAmount));

      let sbtcInvestor1BalanceAfter = await sbtc.balanceOf(investor1);
      auctionTotalreceivedAfter = await dutch.totalReceived()
      let walletsbtcAfter = await sbtc.balanceOf(sovrynAddress);

      expectEvent(tx, 'BidSubmission', {
        sender: investor1,
        amount: '1100000000000000000'
      });
      
      assert((sbtcInvestor1BalanceBefore - sbtcInvestor1BalanceAfter) ==
             (auctionTotalreceivedAfter - auctionTotalreceivedBefore));
      assert((sbtcInvestor1BalanceBefore - sbtcInvestor1BalanceAfter) ==
             (walletsbtcAfter - walletsbtcBefore));         
             
    // Deposit 3: investor2 deposit sbtc - ceiling is reached,  0.2 reimbursed
      blockNumber = await web3.eth.getBlockNumber();
      console.log("block#: " + blockNumber);  
      tprice = await dutch.calcTokenPrice.call();
      console.log("t3 price: " + tprice);   
    
      bidAmount = web3.utils.toWei('0.5');
      let sbtcInvestor2BalanceBefore = await sbtc.balanceOf(investor2);
      auctionTotalreceivedBefore = await dutch.totalReceived()
      walletsbtcBefore = await sbtc.balanceOf(sovrynAddress);
      
      tx = await dutch.bidEBTC(investor2, bidAmount, SBTC, {from: investor2});
      totalReceivedTest = totalReceivedTest.add(web3.utils.toBN(web3.utils.toWei('0.3')));
      
      blockNumber = await web3.eth.getBlockNumber();
      console.log("block#: " + blockNumber);  
      
      const calcPriceEnd = await dutch.calcTokenPrice.call();
      const calcPriceFinal = await dutch.finalPrice();
      const calcStopPrice = await dutch.calcStopPrice();

      let sbtcInvestor2BalanceAfter = await sbtc.balanceOf(investor2);
      auctionTotalreceivedAfter = await dutch.totalReceived()
      walletsbtcAfter = await sbtc.balanceOf(sovrynAddress);

      expectEvent(tx, 'BidSubmission', {
        sender: investor2,
        amount: '300000000000000000'
      });
      
      assert((sbtcInvestor2BalanceBefore - sbtcInvestor2BalanceAfter) ==
             (auctionTotalreceivedAfter - auctionTotalreceivedBefore));
      assert((sbtcInvestor2BalanceBefore - sbtcInvestor2BalanceAfter) ==
             (walletsbtcAfter - walletsbtcBefore));         

    // Deposit 4: Deposit not allowed, since stage has changed to AuctionEnded
      let currentStage =await dutch.stage();
      assert(currentStage.toNumber() === 3);

      await expectRevert(
        dutch.bidEBTC(investor2, bidAmount, SBTC, {from: investor2}),
              'Contract not in expected stage.'
      );
    //

    // Validate final price
      const totalReceived = await dutch.totalReceived();
      assert(totalReceived.eq(totalReceivedTest));
      
      const soldTokens = (totalReceived * (10**18))/calcPriceFinal;
      const soldTokensSC = await token.balanceOf(dutchAddress);
      assert(soldTokensSC == soldTokens);

      const leftTokens = await token.balanceOf(sovrynAddress);
      const totalCalculated = soldTokensSC + leftTokens;

      console.log("totalCalculated: " + totalCalculated);
      console.log("calcStopPrice: " + calcStopPrice);
      console.log("calcPriceEnd: " + calcPriceEnd);
      console.log("calcPriceFinal: " + calcPriceFinal);

      console.log("soldTokens: " + soldTokens);
      console.log("ESOV sc balance: " + soldTokensSC);
      console.log("ESOV Wallet balance: " + leftTokens);
      
      
      console.log("investor1 ESOV SC bal: "+ await dutch.bids(investor1));
      
     
      //let blockDuration = await dutch.WAITING_PERIOD();
      //const start = parseInt((new Date()).getTime() / 1000);
      //let end = start + blockDuration ;
      //await time.increaseTo(end);
      await expectRevert(
        dutch.claimTokens({from: investor1}),
        "Contract not in expected stage"
      );
      
      await dutch.saleClosure(true, { from: esovAdmin });
      
      const investor1Bids = await dutch.bids(investor1);
      const investor1ESOVAmount = (investor1Bids * (10**18))/calcPriceFinal;
      console.log("investor1ESOVAmount: " + investor1ESOVAmount);
      
      await dutch.claimTokens({from: investor1});
      const investor1ESOVBal = await token.balanceOf(investor1)
      assert(investor1ESOVBal == investor1ESOVAmount);
      console.log( "investor1 ESOV bal: " + await token.balanceOf(investor1));
      console.log("investor1 ESOV SC bal: "+ await dutch.bids(investor1));

    // Cannot claimTokens twice
      await expectRevert(
        dutch.claimTokens({from: investor1}),
        "Not eligable to receive tokens"
      );

      const investor2Bids = await dutch.bids(investor2);
      const investor2ESOVAmount = (investor2Bids * (10**18))/calcPriceFinal;
      console.log("investor2ESOVAmount: " + investor2ESOVAmount);

      await dutch.claimTokens({from: investor2});
      const investor2ESOVBal = await token.balanceOf(investor2);
      //assert(investor2ESOVBal == investor2ESOVAmount);
      console.log( "investor2 ESOV bal: " + await token.balanceOf(investor2));
      console.log("investor2 ESOV SC bal: "+ await dutch.bids(investor2));

     // console.log(await dutch.isFloorPrice());
    });
  });
//////////////////////////////////////////
  describe("bidEBTC onStage - blockDuration constraint path", () => {
    beforeEach(async () => {
    
      blockDuration = 6;
      await dutch.setup(tokenAddr, esovAdmin, { from: owner });
      await dutch.changeSettings(
        ceiling,
        priceFactorNumerator,
        priceFactorDenominator,
        priceConst,
        blockDuration,
         { from: esovAdmin });

      await dutch.startAuction({ from: esovAdmin });
      currentStage = await dutch.stage();
      assert(currentStage.toNumber() === 2);
    });

    it('Full flow send bidEBTC => end sale at blockEnd => reimburse => close sale => claim ESOV', async () => {
      let blockNumber = await web3.eth.getBlockNumber();
      console.log("block#: " + blockNumber);  
      let tprice = await dutch.calcTokenPrice.call();
      console.log("t0 price: " + tprice);
    
      let allowedArray = [];
    
      let allowedToken = await dutch.allowedTokens(WBTC);
      console.log("WBTC address allowed: " + allowedToken.tokenAddress);
      allowedToken = await dutch.allowedTokens(SBTC);
      console.log("SBTC address allowed: " + allowedToken.tokenAddress);
    
      let bidAmount = web3.utils.toWei('1.1');
      
      // Deposit 1: investor1 deposit wbtc
      blockNumber = await web3.eth.getBlockNumber();
      console.log("block#: " + blockNumber);
      tprice = await dutch.calcTokenPrice.call();
      console.log("t1 price: " + tprice);

      let wbtcInvestor1BalanceBefore = await wbtc.balanceOf(investor1);
      let auctionTotalreceivedBefore = await dutch.totalReceived()
      let walletwbtcBefore = await wbtc.balanceOf(sovrynAddress);
    
      let tx = await dutch.bidEBTC(investor1, bidAmount, WBTC, { from: investor1 });
      totalReceivedTest = totalReceivedTest.add(web3.utils.toBN(bidAmount));

      let wbtcInvestor1BalanceAfter = await wbtc.balanceOf(investor1);
      let auctionTotalreceivedAfter = await dutch.totalReceived()
      let walletwbtcAfter = await wbtc.balanceOf(sovrynAddress);

      expectEvent(tx, 'BidSubmission', {
        sender: investor1,
        amount: '1100000000000000000'
      });
    
      assert((wbtcInvestor1BalanceBefore - wbtcInvestor1BalanceAfter) ==
        (auctionTotalreceivedAfter - auctionTotalreceivedBefore));
      assert((wbtcInvestor1BalanceBefore - wbtcInvestor1BalanceAfter) ==
        (walletwbtcAfter - walletwbtcBefore));
 
      // Deposit 2:  investor2 deposit sbtc 
      bidAmount = web3.utils.toWei('0.1');
      
      blockNumber = await web3.eth.getBlockNumber();
      console.log("block#: " + blockNumber);  
      tprice = await dutch.calcTokenPrice.call();
      console.log("price: " + tprice);
      
      await time.advanceBlock();
      blockNumber = await web3.eth.getBlockNumber();
      console.log("block#: " + blockNumber);
      tprice = await dutch.calcTokenPrice.call();
      console.log("price: " + tprice);
        
      await time.advanceBlock();
      blockNumber = await web3.eth.getBlockNumber();
      console.log("block#: " + blockNumber); 
      tprice = await dutch.calcTokenPrice.call();
      console.log("price: " + tprice);
 
      dutch.bidEBTC(investor2, bidAmount, SBTC, { from: investor2 });

      await time.advanceBlock();
      blockNumber = await web3.eth.getBlockNumber();
      console.log("block#: " + blockNumber); 
      tprice = await dutch.calcTokenPrice.call();
      console.log("price: " + tprice);

      await time.advanceBlock(); 
      blockNumber = await web3.eth.getBlockNumber();
      console.log("block#: " + blockNumber);  
      tprice = await dutch.calcTokenPrice.call();
      console.log("price: " + tprice);

      await time.advanceBlock();
      blockNumber = await web3.eth.getBlockNumber();
      console.log("block#: " + blockNumber);  
      tprice = await dutch.calcTokenPrice.call();
      console.log("price: " + tprice);
        
      // Deposit 2:  investor2 gets full reimbursment of sbtc beacuse reached blockEnd ==> auction ends

      let sbtcInvestor2BalanceBefore = await sbtc.balanceOf(investor2);
      auctionTotalreceivedBefore = await dutch.totalReceived()
      walletsbtcBefore = await sbtc.balanceOf(sovrynAddress);
    
      console.log("sbtcInvestor2BalanceBefore: " + sbtcInvestor2BalanceBefore);
      console.log("auctionTotalreceivedBefore: " + auctionTotalreceivedBefore);
      console.log("walletsbtcBefore: " + walletsbtcBefore);

      let currentStage = await dutch.stage();
      console.log("stage is: " + currentStage);
      dutch.bidEBTC(investor2, bidAmount, SBTC, { from: investor2 })

      let sbtcInvestor2BalanceAfter = await sbtc.balanceOf(investor2);
      auctionTotalreceivedAfter = await dutch.totalReceived()
      let walletsbtcAfter = await sbtc.balanceOf(sovrynAddress);

      console.log("sbtcInvestor2BalanceAfter: " + sbtcInvestor2BalanceAfter);
      console.log("auctionTotalreceivedAfter: " + auctionTotalreceivedAfter);
      console.log("walletsbtcAfter: " + walletsbtcAfter);

      // Auction has ended
      await expectRevert(
        dutch.bidEBTC(investor2, bidAmount, SBTC, { from: investor2 }),
        'Contract not in expected stage.'
      );
      
      currentStage = await dutch.stage();
      assert(currentStage.toNumber() === 3);
      console.log("stage is: " + currentStage);


      // Validate final price
      
      const calcPriceEnd = await dutch.calcTokenPrice.call();
      const calcPriceFinal = await dutch.finalPrice();
      const calcStopPrice = await dutch.calcStopPrice();
      
      
      const totalReceived = await dutch.totalReceived();
      //assert(totalReceived.eq(totalReceivedTest));
      
      const soldTokens = (totalReceived * (10**18))/calcPriceFinal;
      const soldTokensSC = await token.balanceOf(dutchAddress);
      //assert(soldTokensSC == soldTokens);

      const leftTokens = await token.balanceOf(sovrynAddress);
      const totalCalculated = soldTokensSC + leftTokens;

      console.log("totalCalculated: " + totalCalculated);
      console.log("calcStopPrice: " + calcStopPrice);
      console.log("calcPriceEnd: " + calcPriceEnd);
      console.log("calcPriceFinal: " + calcPriceFinal);

      console.log("soldTokens: " + soldTokens);
      console.log("ESOV sc balance: " + soldTokensSC);
      console.log("ESOV Wallet balance: " + leftTokens);
      
      //
      /*
      
          tx = await dutch.bidEBTC(investor1, bidAmount, SBTC, {from: investor1});
          totalReceivedTest  = totalReceivedTest.add(web3.utils.toBN(bidAmount));
      
          let sbtcInvestor1BalanceAfter = await sbtc.balanceOf(investor1);
          auctionTotalreceivedAfter = await dutch.totalReceived()
          let walletsbtcAfter = await sbtc.balanceOf(sovrynAddress);
      
          expectEvent(tx, 'BidSubmission', {
            sender: investor1,
            amount: '1100000000000000000'
          });
          
          assert((sbtcInvestor1BalanceBefore - sbtcInvestor1BalanceAfter) ==
                 (auctionTotalreceivedAfter - auctionTotalreceivedBefore));
          assert((sbtcInvestor1BalanceBefore - sbtcInvestor1BalanceAfter) ==
                 (walletsbtcAfter - walletsbtcBefore));         
                 
        // Deposit 3: investor2 deposit sbtc - ceiling is reached,  0.2 reimbursed
          bidAmount = web3.utils.toWei('0.5');
          let sbtcInvestor2BalanceBefore = await sbtc.balanceOf(investor2);
          auctionTotalreceivedBefore = await dutch.totalReceived()
          walletsbtcBefore = await sbtc.balanceOf(sovrynAddress);
          
          tx = await dutch.bidEBTC(investor2, bidAmount, SBTC, {from: investor2});
          totalReceivedTest = totalReceivedTest.add(web3.utils.toBN(web3.utils.toWei('0.3')));
          
          const calcPriceEnd = await dutch.calcTokenPrice.call();
          const calcPriceFinal = await dutch.finalPrice();
          const calcStopPrice = await dutch.calcStopPrice();
      
          let sbtcInvestor2BalanceAfter = await sbtc.balanceOf(investor2);
          auctionTotalreceivedAfter = await dutch.totalReceived()
          walletsbtcAfter = await sbtc.balanceOf(sovrynAddress);
      
          expectEvent(tx, 'BidSubmission', {
            sender: investor2,
            amount: '300000000000000000'
          });
          
          assert((sbtcInvestor2BalanceBefore - sbtcInvestor2BalanceAfter) ==
                 (auctionTotalreceivedAfter - auctionTotalreceivedBefore));
          assert((sbtcInvestor2BalanceBefore - sbtcInvestor2BalanceAfter) ==
                 (walletsbtcAfter - walletsbtcBefore));         
      
        // Deposit 4: Deposit not allowed, since stage has changed to AuctionEnded
          let currentStage =await dutch.stage();
          assert(currentStage.toNumber() === 3);
      
          await expectRevert(
            dutch.bidEBTC(investor2, bidAmount, SBTC, {from: investor2}),
                  'Contract not in expected stage.'
          );
        //
      
        // Validate final price
          const totalReceived = await dutch.totalReceived();
          assert(totalReceived.eq(totalReceivedTest));
          
          const soldTokens = (totalReceived * (10**18))/calcPriceFinal;
          const soldTokensSC = await token.balanceOf(dutchAddress);
          assert(soldTokensSC == soldTokens);
      
          const leftTokens = await token.balanceOf(sovrynAddress);
          const totalCalculated = soldTokensSC + leftTokens;
      
          console.log("totalCalculated: " + totalCalculated);
          console.log("calcStopPrice: " + calcStopPrice);
          console.log("calcPriceEnd: " + calcPriceEnd);
          console.log("calcPriceFinal: " + calcPriceFinal);
      
          console.log("soldTokens: " + soldTokens);
          console.log("ESOV sc balance: " + soldTokensSC);
          console.log("ESOV Wallet balance: " + leftTokens);
          
          
          console.log("investor1 ESOV SC bal: "+ await dutch.bids(investor1));
          
         
          //let blockDuration = await dutch.WAITING_PERIOD();
          //const start = parseInt((new Date()).getTime() / 1000);
          //let end = start + blockDuration ;
          //await time.increaseTo(end);
          await expectRevert(
            dutch.claimTokens({from: investor1}),
            "Contract not in expected stage"
          );
          
          await dutch.saleClosure(true, { from: esovAdmin });
          
          const investor1Bids = await dutch.bids(investor1);
          const investor1ESOVAmount = (investor1Bids * (10**18))/calcPriceFinal;
          console.log("investor1ESOVAmount: " + investor1ESOVAmount);
          
          await dutch.claimTokens({from: investor1});
          const investor1ESOVBal = await token.balanceOf(investor1)
          assert(investor1ESOVBal == investor1ESOVAmount);
          console.log( "investor1 ESOV bal: " + await token.balanceOf(investor1));
          console.log("investor1 ESOV SC bal: "+ await dutch.bids(investor1));
      
        // Cannot claimTokens twice
          await expectRevert(
            dutch.claimTokens({from: investor1}),
            "Not eligable to receive tokens"
          );
      
          const investor2Bids = await dutch.bids(investor2);
          const investor2ESOVAmount = (investor2Bids * (10**18))/calcPriceFinal;
          console.log("investor2ESOVAmount: " + investor2ESOVAmount);
      
          await dutch.claimTokens({from: investor2});
          const investor2ESOVBal = await token.balanceOf(investor2);
          //assert(investor2ESOVBal == investor2ESOVAmount);
          console.log( "investor2 ESOV bal: " + await token.balanceOf(investor2));
          console.log("investor2 ESOV SC bal: "+ await dutch.bids(investor2));
      
          console.log(await dutch.isFloorPrice());
        });
        */
    });
  });

});
/////////////////////////////////////////////


  /*// bid() - RBTC deposit
  describe("bid NOT on correct Stage", () => {
    it('should NOT send bid if not on AuctionStarted stage', async () => {
      await dutch.setup(tokenAddr, esovAdmin, { from: owner });
      //owner = esovAdmin;
      let bidAmount = web3.utils.toWei('1');
      await expectRevert(
        dutch.bid({value: bidAmount, from: investor2}),
        "Contract not in expected stage"
      );
    })
  });
  
  describe("bid onStage", () => {
    beforeEach(async () => {
      await dutch.setup(tokenAddr, esovAdmin, { from: owner });
      //owner = esovAdmin;
      await dutch.startAuction({ from: owner });
      currentStage =await dutch.stage();
      assert(currentStage.toNumber() === 2);
      console.log(currentStage.toNumber());
    });  
    it('should send bidEBTC', async () => {
      let tprice = await dutch.calcTokenPrice();
      console.log("t0 price: " + tprice); 
      let bidAmount = web3.utils.toWei('1');
     
      let amount = await dutch.bid({from: investor1, value: bidAmount});
      console.log("total received: "+ await dutch.totalReceived());
      
      amount = await dutch.bid({value: bidAmount, from: investor2});
      console.log("total received: "+ await dutch.totalReceived());
            

      let blockDuration = 100000;
      const start = parseInt((new Date()).getTime() / 1000);
      let end = start + blockDuration ;

      await time.increaseTo(end);
      tprice = await dutch.calcTokenPrice();
      console.log("t1 price: " + tprice); 

      bidAmount = web3.utils.toWei('0.5');
      amount = await dutch.bid({value: bidAmount, from: investor2});
      console.log("total received: "+ await dutch.totalReceived());
  
    });
  });
*/

      /*
      let blockDuration = 100000;
      const start = parseInt((new Date()).getTime() / 1000);
      let end = start + blockDuration ;

      await time.increaseTo(end);
      tprice = await dutch.calcTokenPrice();
      console.log("t1 price: " + tprice); 
*/
 


  /////////////////////////////////////
  /*describe("claimTokens", () => {
    it('should claimTokens', async () => {
      let blockDuration = await dutch.WAITING_PERIOD();
      const start = parseInt((new Date()).getTime() / 1000);
      let end = start + blockDuration ;

      await time.increaseTo(end);
      
      await dutch.setup(tokenAddr, esovAdmin, { from: owner });
      //owner = esovAdmin;
      let bidAmount = web3.utils.toWei('1');
      await expectRevert(
        dutch.bidEBTC(investor2, bidAmount, sbtc, {from: investor2}),
        "Contract not in expected stage"
      );
    })
  });
*/
//});

/*
  beforeEach (async () => {

 
//deploy CrowdSale
  crowdsale = await CrowdSale.new(
      tokenAddr,
      NFAddr,
      maxpricelist,
      sovrynAddress,
      adminWallet,
      {from: owner}); 
//console.log(tokenAddr + "  " + NFAddr + "   " + maxpricelist + "   "+ sovrynAddress+ "   "+ adminWallet);
      saleAddress = await crowdsale.address;
//console.log("Crowdsale Address: " + saleAddress);
  });

  describe("set Admins", () => {
    it('should NOT start the CrowdSale because admins not set', async () => {
      const blockDuration = 100;
      const rate = 2;
      let crowdsalesupply = web3.utils.toWei('200');
      await expectRevert(
        crowdsale.start(blockDuration, rate, minpurchase, crowdsalesupply, {from: owner}), 
        'setAdmins before start'
      );
    });  
    it('should setAdmins', async () => {   
      const tokenbalanceBefore = await crowdsale.balanceOf(csovAdmin);
      const salebalanceBefore = await crowdsale.balanceOf(saleAddress);
      
      await token.setSaleAdmin(saleAddress, { from: csovAdmin });
      
      const tokenbalanceAfter = await crowdsale.balanceOf(csovAdmin);
      const salebalanceAfter = await crowdsale.balanceOf(saleAddress);
      
      assert(salebalanceAfter.eq(web3.utils.toBN(totalSupply)));
      assert(salebalanceAfter.eq(tokenbalanceBefore));
      assert(salebalanceBefore.eq(tokenbalanceAfter));      
    });  
  }); 

  describe("Fail Start", () => {
    it('should NOT start if crowdSaleSupply > totalSupply', async () => {
      await token.setSaleAdmin(saleAddress,{ from: csovAdmin });
      
      crowdsalesupply = web3.utils.toWei('301');
      await expectRevert(
        crowdsale.start(blockDuration, rate, minpurchase, crowdsalesupply, {from: owner}), 
        'crowdSaleSupply should be <= totalSupply'
      );
    });
    it('should NOT start if not owner', async () => {
      await token.setSaleAdmin(saleAddress,{ from: csovAdmin });
      crowdsalesupply = web3.utils.toWei('50');
      await expectRevert(
        crowdsale.start(blockDuration, rate, minpurchase, crowdsalesupply, {from: accounts[2]}),
        'Ownable: caller is not the owner.'
      );
    });
    it('should NOT start if miPurchase == 0', async () => {
      await token.setSaleAdmin(saleAddress,{ from: csovAdmin });
      let minpurchaseNA = 0;
      await expectRevert(
        crowdsale.start(blockDuration, rate, minpurchaseNA, crowdsalesupply, {from: owner}),
        '_minPurchase should be > 0'
      );
    });
    it('should NOT start the CrowdSale if miPurchase >= crowdSaleSupply', async () => {
      await token.setSaleAdmin(saleAddress,{ from: csovAdmin });
      minpurchaseNA = web3.utils.toWei('51');
      await expectRevert(
        crowdsale.start(blockDuration, rate, minpurchaseNA, crowdsalesupply, {from: owner}),
        '_minPurchase should be < crowdSaleSupply'
      );
    });
    it('should Fail start after successful start', async () => {
      await token.setSaleAdmin(saleAddress, { from: csovAdmin });
      await crowdsale.start(blockDuration, rate, minpurchase, crowdsalesupply, { from: owner });
      await expectRevert(
        crowdsale.start(blockDuration, rate, minpurchase, crowdsalesupply, {from: owner}),
        'Sale should not be active'
      );
    });
  });
  
  describe("success Start", () => {
    it('should start the CrowdSale', async () => {
      await token.setSaleAdmin(saleAddress,{ from: csovAdmin });
      crowdsalesupply = web3.utils.toWei('5');
  const start = parseInt((new Date()).getTime() / 1000);
//  time.increaseTo(start +5);
      await crowdsale.start(blockDuration, rate, minpurchase, crowdsalesupply, {from: owner}); 
  const expectedEnd = start + blockDuration ;
  const end = await crowdsale.end();
      
      console.log("expectedEnd:  " + expectedEnd);
      console.log("end:  " + end);

      const actualAvailableTokens = await crowdsale.availableTokens();
      const actualMinPurchase = await crowdsale.minPurchase();
      const actualRate = await crowdsale.rate();

      assert(actualAvailableTokens.eq(web3.utils.toBN(crowdsalesupply)));
      assert(actualMinPurchase.eq(web3.utils.toBN(minpurchase)));
      assert(actualRate.eq(web3.utils.toBN(rate)));
    });
  });
  
  describe("BUY before START", () => {
    it('should fail BUY before Sale has started', async () => {
      await token.setSaleAdmin(saleAddress,{ from: csovAdmin });
      
      await expectRevert(
        crowdsale.buy({from: accounts[2], value: web3.utils.toWei('0.2')}),
          'Sale must be active'
        );
    });
  });

  context('Sale started', () => {
    
    crowdsalesupply = web3.utils.toWei('5');
    beforeEach(async() => {
   //   start = parseInt((new Date()).getTime() / 1000);
   //   time.increaseTo(start);
      await token.setSaleAdmin(saleAddress,{ from: csovAdmin }); 
      await crowdsale.start(blockDuration, rate, minpurchase, crowdsalesupply, {from: owner});
    });
    describe("BUY", () => {
    
      it('should NOT let non-investors buy', async () => {
        await expectRevert(
        crowdsale.buy({from: accounts[6], value: web3.utils.toWei('0.2')}),
          'The User does NOT hold NFT'
        );
      });

      it('should NOT buy if amount < minpurchase', async () => {
        let value = await web3.utils.toBN(minpurchase).sub(await(web3.utils.toBN(1))); 
        await expectRevert(
        crowdsale.buy({from: accounts[2], value}),
          'must send more then global minPurchase'
        );
      });
      
      it('should NOT buy if total deposits reached maxPurchase', async () => {
        const amount2 = web3.utils.toWei('0.5'); 
        await crowdsale.buy({from: holder2, value: amount2});
        await expectRevert(
          crowdsale.buy({from: holder2, value: amount2}),
          'Investor deposits have reached maxPurchase amount'
        );
      });

      it('should buy and receive tokens  holder0', async () => {
        gasPrice = await web3.eth.getGasPrice();
        const amount0 = web3.utils.toBN(web3.utils.toWei('1'));
        
        const balance0Before = await web3.eth.getBalance(holder0);
        const token0balanceBefore = await token.balanceOf(holder0);

        let tx = await crowdsale.buy({ from: holder0, value: amount0 });
        const amount = '1000000000000000000';
        const tokenAmount = '2000000000000000000';
        expectEvent(tx, 'TokenPurchase', {
          purchaser: holder0,
          value: amount,
          amount: tokenAmount
        });

        const balance0After = await web3.eth.getBalance(holder0);
        const token0balanceAfter = await token.balanceOf(holder0);

        let gasUsed = await web3.utils.toBN(tx.receipt.gasUsed);
        let gasSpent = web3.utils.toBN(10* gasPrice * gasUsed);

        const amount0WithGas = amount0.add(gasSpent);
        const balance0 = token0balanceAfter.sub(token0balanceBefore);
        const delta = balance0Before - balance0After ;

        // Add small margin for mismatch in calculation
        assert((delta - amount0WithGas < 5000000) &&  (delta - amount0WithGas > (-5000000) ));
        assert(balance0.eq(amount0.mul(web3.utils.toBN(rate))));    
      });

      it('should buy and receive tokens  holder1', async () => {
        const amount1 = web3.utils.toBN(web3.utils.toWei('0.5'));
        
        const balance1Before = await web3.eth.getBalance(holder1);
        const token1balanceBefore = await token.balanceOf(holder1);
        
        let tx = await crowdsale.buy({from: holder1, value: amount1});
        const amount = '500000000000000000';
        const tokenAmount = '1000000000000000000';
        expectEvent(tx, 'TokenPurchase', {
          purchaser: holder1,
          value: amount,
          amount: tokenAmount
        });
        
        const balance1After = await web3.eth.getBalance(holder1);
        const token1balanceAfter = await token.balanceOf(holder1);
        
        gasUsed = await web3.utils.toBN(tx.receipt.gasUsed);
        gasSpent = web3.utils.toBN(10* gasPrice * gasUsed);
        
        const amount1WithGas = amount1.add(gasSpent);
        const balance1 = token1balanceAfter.sub(token1balanceBefore);
        const delta = balance1Before - balance1After ;

        // Add small margin for mismatch in calculation
        assert((delta - amount1WithGas < 5000000) &&  (delta - amount1WithGas > (-5000000) ));
        assert(balance1.eq(amount1.mul(web3.utils.toBN(rate))));
      });
   


      it('should buy and imburse: Investor deposit more then maxPurchase', async () => {
        const amount1 = web3.utils.toBN(web3.utils.toWei('3'));
        const amountAllowed = web3.utils.toBN(web3.utils.toWei('1'));
        
        const balance1Before = await web3.eth.getBalance(holder1);
        const token1balanceBefore = await token.balanceOf(holder1);
        
        let tx = await crowdsale.buy({from: holder1, value: amount1});
        const amount = '1000000000000000000';
        const tokenAmount = '2000000000000000000';
        
        expectEvent(tx, 'TokenPurchase', {
          purchaser: holder1,
          value: amount,
          amount: tokenAmount
        });
        
        const amountR = '2000000000000000000';
        expectEvent(tx, 'Imburse', {
          imbursePurchaser: holder1,
          amount: amountR
        });

        const balance1After = await web3.eth.getBalance(holder1);
        const token1balanceAfter = await token.balanceOf(holder1);
        
        gasUsed = await web3.utils.toBN(tx.receipt.gasUsed);
        gasSpent = web3.utils.toBN(10* gasPrice * gasUsed);
        
        const amount1WithGas = amountAllowed.add(gasSpent);
        const balance1 = token1balanceAfter.sub(token1balanceBefore);
        const delta = balance1Before - balance1After ;

        // Add small margin for mismatch in calculation
        assert((delta - amount1WithGas < 5000000) &&  (delta - amount1WithGas > (-5000000) ));
        assert(balance1.eq(amountAllowed.mul(web3.utils.toBN(rate))));        
      });  
      it('should buy and imburse (Sold all crowdsaleSupply)', async () => {
        const amount0 = web3.utils.toBN(web3.utils.toWei('2'));

        let tx = await crowdsale.buy({ from: holder0, value: amount0 });
        const amount = '2000000000000000000';
        const tokenAmount = '4000000000000000000';
        
        expectEvent(tx, 'TokenPurchase', {
          purchaser: holder0,
          value: amount,
          amount: tokenAmount
        });
        
        const amount1 = web3.utils.toBN(web3.utils.toWei('1'));
        const amountAllowed = web3.utils.toBN(web3.utils.toWei('0.5'));
        
        const balance1Before = await web3.eth.getBalance(holder1);
        const token1balanceBefore = await token.balanceOf(holder1);
        
        tx = await crowdsale.buy({from: holder1, value: amount1});
        const amountN = '500000000000000000';
        const tokenAmountN = '1000000000000000000';
        
        expectEvent(tx, 'TokenPurchase', {
          purchaser: holder1,
          value: amountN,
          amount: tokenAmountN
        });
        
        const amountR = '500000000000000000';
        expectEvent(tx, 'Imburse', {
          imbursePurchaser: holder1,
          amount: amountR
        });
        
        const balance1After = await web3.eth.getBalance(holder1);
        const token1balanceAfter = await token.balanceOf(holder1);
        
        gasUsed = await web3.utils.toBN(tx.receipt.gasUsed);
        gasSpent = web3.utils.toBN(10* gasPrice * gasUsed);
        
        const amount1WithGas = amountAllowed.add(gasSpent);
        const balance1 = token1balanceAfter.sub(token1balanceBefore);
        const delta = balance1Before - balance1After ;

        // Add small margin for mismatch in calculation
        assert((delta - amount1WithGas < 5000000) &&  (delta - amount1WithGas > (-5000000) ));
        assert(balance1.eq(amountAllowed.mul(web3.utils.toBN(rate))));
      });  
  
      it('should calculate weiRaised', async () => {
        const amount1 = web3.utils.toBN(web3.utils.toWei('0.2'));      
        await crowdsale.buy({from: holder1, value: amount1});
        
        let weiraised = await crowdsale.weiRaised();
        assert(weiraised.eq(amount1));
        
        await crowdsale.buy({from: holder1, value: amount1});
        weiraised = await crowdsale.weiRaised();
        
        const sumvalue = amount1.add(amount1); 
        assert(weiraised.eq(sumvalue));
      });
    });

    describe("assignTokens", () => {
      it('Should NOT assignTokens if not Admin', async () => {
        const amount1 = web3.utils.toBN(web3.utils.toWei('0.2'));
        await expectRevert(
          crowdsale.assignTokens(holder1, amount1, { from: owner }),
          'unauthorized'
        );
      });
      
      it('Should NOT assignTokens if sale not active', async () => {
        await crowdsale.stopSale(true, { from: adminWallet });

        const amount1 = web3.utils.toBN(web3.utils.toWei('0.2'));
        await expectRevert(
          crowdsale.assignTokens(holder1, amount1, { from: adminWallet }),
          'Sale must be active'
        );
      });

      it('Should NOT assignTokens if amount > maxPurchase', async () => {
        const amount1 = web3.utils.toBN(web3.utils.toWei('2.1'));
        await expectRevert(
          crowdsale.assignTokens(holder1, amount1, { from: adminWallet }),
          'investor already has too many tokens'
        );
      });
      
      it('Should NOT assignTokens if not enough available', async () => {
        const amount1 = web3.utils.toBN(web3.utils.toWei('1'));
        crowdsale.assignTokens(holder1, amount1, { from: adminWallet });

        const amount2 = web3.utils.toBN(web3.utils.toWei('0.5'));
        crowdsale.assignTokens(holder2, amount2, { from: adminWallet });
       
        const amount0 = web3.utils.toBN(web3.utils.toWei('1.5'));
        await expectRevert(
          crowdsale.assignTokens(holder0, amount0, { from: adminWallet }),
          'amount needs to be smaller than the number of available tokens'
        );
      });


      it('Should assignTokens', async () => {
        const amount1 = web3.utils.toBN(web3.utils.toWei('0.2'));
        const token1balanceBefore = await token.balanceOf(holder1);
        
        let tx =await crowdsale.assignTokens(holder1, amount1, { from: adminWallet });
        const amount = '200000000000000000';
        const tokenAmount = '400000000000000000';
        expectEvent(tx, 'TokenPurchase', {
          purchaser: holder1,
          value: amount,
          amount: tokenAmount
        });

        const token1balanceAfter = await token.balanceOf(holder1);
        const balance1 = token1balanceAfter.sub(token1balanceBefore);
        console.log("balance1: " + balance1);
        assert(balance1.eq(amount1.mul(web3.utils.toBN(rate))));
      });
    }); 

    describe("Stop the sale", () => {
      it('Should NOT stop the sale - only Admin', async () => {
        await expectRevert(
          crowdsale.stopSale(true, { from: owner }),
          'unauthorized'
        );
      });

      it('Should stop the sale', async () => {
        await crowdsale.stopSale(true, { from: adminWallet });

        const amount1 = web3.utils.toBN(web3.utils.toWei('0.2'));
        await expectRevert(
           crowdsale.buy({ from: holder1, value: amount1 }),
          'Sale must be active'
        );
      });  
    }); 

    describe("Withdraw", () => {
      it('Should NOT Withdraw Tokens if not admin', async () => {
          const amount1 = web3.utils.toBN(web3.utils.toWei('0.2'));
          await crowdsale.buy({ from: holder1, value: amount1 });
          
          await expectRevert(
            crowdsale.withdrawTokens({ from: holder1 }),
            'Ownable: caller is not the owner.'
          );
      });
        
      it('Should NOT Withdraw Funds if not admin', async () => {
          const amount1 = web3.utils.toBN(web3.utils.toWei('0.2'));
          await crowdsale.buy({ from: holder1, value: amount1 });
          
          await expectRevert(
            crowdsale.withdrawFunds({ from: holder1 }),
            'Ownable: caller is not the owner.'
          );
      });
      
      it('Should NOT Withdraw Funds before sale should be 0x0:sync () => {
        const amount1 = web3.utils.toBN(web3.utils.toWei('0.2'));
        await crowdsale.buy({ from: holder1, value: amount1 });
        
        await expectRevert(
          crowdsale.withdrawFunds({ from: owner }),
          'Sale has NOT ended'
        );
      });

      it('Should NOT Withdraw Tokens before sale should be 0x0:sync () => {
        const amount1 = web3.utils.toBN(web3.utils.toWei('0.2'));
        await crowdsale.buy({ from: holder1, value: amount1 });
        
        await expectRevert(
          crowdsale.withdrawTokens({ from: owner }),
          'Sale has NOT ended'
        );
    });

    it('Should Withdraw All', async () => {
      const amount1 = web3.utils.toBN(web3.utils.toWei('1'));
      await crowdsale.buy({ from: holder1, value: amount1 });
      
      const end = await crowdsale.end();
      await time.increaseTo(end);  
      
      const TokenbalanceOutBefore = await token.balanceOf(sovrynAddress);
      await crowdsale.withdrawTokens({ from: owner });
      const TokenbalanceOutAfter = await token.balanceOf(sovrynAddress);
      
      console.log(" Tokens witdhrawn to sovrynaddress: " + TokenbalanceOutAfter);
      const balance1 = TokenbalanceOutAfter -TokenbalanceOutBefore;
      const balExpected = totalSupply - (amount1 * rate);
      assert(balance1 == balExpected);

      const balanceweiOutBefore = await web3.eth.getBalance(sovrynAddress);
      await crowdsale.withdrawFunds({ from: owner });
      const balanceweiOutAfter = await web3.eth.getBalance(sovrynAddress);
      assert(balanceweiOutAfter-balanceweiOutBefore == amount1);
    });
  });
 });   
});

*/