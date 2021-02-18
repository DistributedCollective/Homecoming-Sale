const { expectEvent, expectRevert, time, BN } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const DutchAuction = artifacts.require('DutchAuction.sol');
const ESOVToken = artifacts.require('ESOVToken.sol');
const Wbtc = artifacts.require('mocks/WBTC.sol');
const Sbtc = artifacts.require('mocks/SBTC.sol');

contract('DutchAuction', (accounts) => {
  let dutch;
  let token;
  let tokenAddr;
  let gasPrice;
  let wbtc, sbtc;
  let dutchAddress;
  let wbtcAddr, sbtcAddr;
  
  const [WBTC, SBTC] = ['WBTC', 'SBTC']
        .map(ticker => web3.utils.fromAscii(ticker));

  const totalSupply = web3.utils.toWei('2000000');
  
  let blockDuration = 14;
  
  let ceiling = web3.utils.toWei('2.5');
  let priceFactorNumerator = '6';
  let priceFactorDenominator = '10000';
  let priceConst = '6';

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

    //await token.setSaleAdmin(dutchAddress, totalSupply, {from: esovAdmin});
    await token.transfer(dutchAddress, totalSupply, {from: esovAdmin});
    console.log("ESOV sc balance: " + await token.balanceOf(dutchAddress));

    ([wbtc, sbtc] = await Promise.all([
      Wbtc.new(),
      Sbtc.new()
    ]));

    //await dutch.addToken([WBTC, SBTC], [wbtc.address, sbtc.address], { from: owner });
    await dutch.addToken([wbtc.address, sbtc.address], { from: owner });

    wbtcAddr = await wbtc.address;
    sbtcAddr = await sbtc.address;
    let wbtcAddrString = wbtcAddr.toString();
    let sbtcAddrString = sbtcAddr.toString();

    let wbtcSCAddr = await dutch.tokensAddr(0);
    let sbtcSCAddr = await dutch.tokensAddr(1);
    let wbtcSCAddrString = wbtcSCAddr.toString();
    let sbtcSCAddrString = sbtcSCAddr.toString();
    
    let wbtcAddrCmp = wbtcSCAddrString.localeCompare(wbtcAddrString);
    let sbtcAddrCmp = sbtcSCAddrString.localeCompare(sbtcAddrString);
    assert(wbtcAddrCmp == 0);
    assert(sbtcAddrCmp == 0);

  // seed amount per investor per ERC20-BTC
    const amount = web3.utils.toWei('200');
  // seedTokenBalance()
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
    //await token.setSaleAdmin(dutchAddress, {from: esovAdmin});
    await token.transfer(dutchAddress, totalSupply, {from: esovAdmin});
    console.log("ESOV sc balance: " + await token.balanceOf(dutchAddress));

    ([wbtc, sbtc] = await Promise.all([
      Wbtc.new(),
      Sbtc.new()
     ]));
  // addToken(): Allowed token deposit to DutchAuction 

  //await dutch.addToken([WBTC, SBTC], [wbtc.address, sbtc.address], { from: owner });
  await dutch.addToken([wbtc.address, sbtc.address], { from: owner });
  wbtcAddr = wbtc.address;
  sbtcAddr = sbtc.address;

  // seed amount per investor per ERC20-BTC
    const amount = web3.utils.toWei('200');
  // seedTokenBalance()
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
  
      assert(ceilingSC.eq(web3.utils.toBN('1000')));
      assert(priceFactorNumeratorSC.eq(web3.utils.toBN('8')));
      assert(priceFactorDenominatorSC.eq(web3.utils.toBN('10000')));
      assert(priceConstSC.eq(web3.utils.toBN('9')));
      assert(blockDurationSC.eq(web3.utils.toBN('30')));

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
        dutch.bidEBTC(investor2, bidAmount, sbtcAddr, {from: investor2}),
        "Contract not in expected stage"
      );
    })
});

describe("bidEBTC onStage - deposit ceiling constraint path", () => {
    beforeEach(async () => {
      await dutch.setup(tokenAddr, esovAdmin, { from: owner });
      await dutch.startAuction({ from: esovAdmin });
      currentStage =await dutch.stage();
      assert(currentStage.toNumber() === 2);
    });  
    
    it('should NOT send bidEBTC if not allowed token deposit', async () => {
      let wbtcSCAddrBF = await dutch.tokensAddr(0);
      let sbtcSCAddrBF = await dutch.tokensAddr(1);
      let wbtcSCAddrBFString = wbtcSCAddrBF.toString();
      let sbtcSCAddrBFString = sbtcSCAddrBF.toString();
      //console.log(wbtcSCAddrBF + "  " + sbtcSCAddrBF);

      await dutch.removeToken([wbtcAddr], { from: esovAdmin });
      let allowedToken = await dutch.allowedTokens(wbtcAddr);
      assert(!allowedToken);
      //console.log("wbtc Not allowed (should be 0x0): " + allowedToken);
      
      let sbtcSCAddrAF = await dutch.tokensAddr(0);
      let wbtcSCAddrAF = await dutch.tokensAddr(1);
      let sbtcSCAddrAFString = sbtcSCAddrAF.toString();
      let wbtcSCAddrAFString = wbtcSCAddrAF.toString();
       
      let sbtcAddrCmp = sbtcSCAddrAFString.localeCompare(sbtcSCAddrBFString);
      let wbtcAddrCmp = wbtcSCAddrAFString.localeCompare('0x0000000000000000000000000000000000000000');
      
      assert(sbtcAddrCmp == 0);
      assert(wbtcAddrCmp == 0);

      //console.log(wbtcSCAddrAF + "  " + sbtcSCAddrAF);

      let bidAmount = web3.utils.toWei('1');
      await expectRevert(
        dutch.bidEBTC(investor2, bidAmount, wbtcAddr, {from: investor2}),
        "this token is not Allowed"
      );
    });

    it('Full flow send bidEBTC => end sale at ceiling => reimburse => close sale => claim ESOV', async () => {
      let totalReceivedTest = web3.utils.toBN('0');
      let blockNumber = await web3.eth.getBlockNumber();
      console.log("block#: " + blockNumber);

      let tprice = await dutch.calcTokenPrice.call();
      console.log("t0 price: " + tprice); 
      
      let bidAmount = web3.utils.toWei('1.1');
    // Deposit 1: investor1 deposit wbtc
      blockNumber = await web3.eth.getBlockNumber();
      console.log("block#: " + blockNumber);  
      tprice = await dutch.calcTokenPrice.call();
      console.log("t1 price: " + tprice); 
  
      let wbtcInvestor1BalanceBefore = await wbtc.balanceOf(investor1);
      let auctionTotalreceivedBefore = await dutch.totalReceived()
      let walletwbtcBefore = await wbtc.balanceOf(dutchAddress);
      
      let tx = await dutch.bidEBTC(investor1, bidAmount, wbtcAddr, {from: investor1});
      totalReceivedTest = totalReceivedTest.add(web3.utils.toBN(bidAmount));

      let wbtcInvestor1BalanceAfter = await wbtc.balanceOf(investor1);
      let auctionTotalreceivedAfter = await dutch.totalReceived()
      let walletwbtcAfter = await wbtc.balanceOf(dutchAddress);

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
      let walletsbtcBefore = await sbtc.balanceOf(dutchAddress);
      
      tx = await dutch.bidEBTC(investor1, bidAmount, sbtcAddr, {from: investor1});
      totalReceivedTest  = totalReceivedTest.add(web3.utils.toBN(bidAmount));

      let sbtcInvestor1BalanceAfter = await sbtc.balanceOf(investor1);
      auctionTotalreceivedAfter = await dutch.totalReceived()
      let walletsbtcAfter = await sbtc.balanceOf(dutchAddress);

      expectEvent(tx, 'BidSubmission', {
        sender: investor1,
        amount: '1100000000000000000'
      });
      
      assert((sbtcInvestor1BalanceBefore - sbtcInvestor1BalanceAfter) ==
             (auctionTotalreceivedAfter - auctionTotalreceivedBefore));
      assert((sbtcInvestor1BalanceBefore - sbtcInvestor1BalanceAfter) ==
             (walletsbtcAfter - walletsbtcBefore));         
      
      await expectRevert(
        dutch.withdrawDeposits({from: esovAdmin}),
              'cannot withdraw before the sale ends'
      );

    // Deposit 3: investor2 deposit sbtc - ceiling is reached,  0.2 reimbursed
      blockNumber = await web3.eth.getBlockNumber();
      console.log("block#: " + blockNumber);  
      tprice = await dutch.calcTokenPrice.call();
      console.log("t3 price: " + tprice);   
    
      bidAmount = web3.utils.toWei('0.5');
      let sbtcInvestor2BalanceBefore = await sbtc.balanceOf(investor2);
      auctionTotalreceivedBefore = await dutch.totalReceived()
      walletsbtcBefore = await sbtc.balanceOf(dutchAddress);
      
      tx = await dutch.bidEBTC(investor2, bidAmount, sbtcAddr, {from: investor2});
      totalReceivedTest = totalReceivedTest.add(web3.utils.toBN(web3.utils.toWei('0.3')));
      
      blockNumber = await web3.eth.getBlockNumber();
      console.log("block#: " + blockNumber);  
      
      const calcPriceEnd = await dutch.calcTokenPrice.call();
      const calcPriceFinal = await dutch.finalPrice();
      const calcStopPrice = await dutch.calcStopPrice();

      let sbtcInvestor2BalanceAfter = await sbtc.balanceOf(investor2);
      auctionTotalreceivedAfter = await dutch.totalReceived()
      walletsbtcAfter = await sbtc.balanceOf(dutchAddress);

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
        dutch.bidEBTC(investor2, bidAmount, sbtcAddr, {from: investor2}),
              'Contract not in expected stage.'
      );

    //
    /// Need to complete assert for withdrawDeposits function
    walletwbtcBefore = await wbtc.balanceOf(sovrynAddress);
    walletsbtcBefore = await sbtc.balanceOf(sovrynAddress);
    
    dutch.withdrawDeposits({from: esovAdmin});

    walletwbtcAfter = await wbtc.balanceOf(sovrynAddress);
    walletsbtcAfter = await sbtc.balanceOf(sovrynAddress);
    
    console.log("walletsbtcBefore: " +  walletsbtcBefore);
    console.log("walletwbtcBefore: " +  walletwbtcBefore);
    console.log("walletsbtcAfter: " +  walletsbtcAfter);
    console.log("walletwbtcAfter: " +  walletwbtcAfter);

    console.log("walletsbtc: " +  (walletsbtcAfter - walletsbtcBefore));
    console.log("walletwbtc: " +  (walletwbtcAfter - walletwbtcBefore));
    assert('1400000000000000000' == (walletsbtcAfter - walletsbtcBefore));         
    assert('1100000000000000000' == (walletwbtcAfter - walletwbtcBefore));         

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
      
      
      
    // Cannot claimTokens before saleClosure() 
      await expectRevert(
        dutch.claimTokens({from: investor1}),
        "Contract not in expected stage"
      );
      
      await dutch.saleClosure({ from: esovAdmin });

      console.log("investor1 ESOV SC bal: " + await dutch.bids(investor1));
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

      console.log("investor2 ESOV SC bal: "+ await dutch.bids(investor2));
      const investor2Bids = await dutch.bids(investor2);
      //const investor2ESOVAmount = web3.utils.toBN((investor2Bids * (10**18))/calcPriceFinal);
      const investor2ESOVAmount = web3.utils.toBN(web3.utils.toWei(investor2Bids).div(calcPriceFinal));
      console.log("investor2ESOVAmount: " + investor2ESOVAmount);

      await dutch.claimTokens({from: investor2});
      const investor2ESOVBal = await token.balanceOf(investor2);
      console.log( "investor2 ESOV bal: " + await token.balanceOf(investor2));
      console.log("investor2 ESOV SC bal: "+ await dutch.bids(investor2));
      
      expect(investor2ESOVBal).to.be.bignumber.equal(investor2ESOVAmount);
      //assert(investor2ESOVBal == investor2ESOVAmount);

    });
  });

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
      let totalReceivedTest = web3.utils.toBN('0');
      let blockNumber = await web3.eth.getBlockNumber();
      console.log("block#: " + blockNumber);  
      let tprice = await dutch.calcTokenPrice.call();
      console.log("t0 price: " + tprice);
    
      let bidAmount = web3.utils.toWei('1.1');
      
      // Deposit 1: investor1 deposit wbtc
      let prevBlockNumber = blockNumber;
      let prevtprice = tprice;
      let catchFloorPrice = 0;

      blockNumber = await web3.eth.getBlockNumber();
      console.log("block#: " + blockNumber);
      tprice = await dutch.calcTokenPrice.call();
      console.log("t0 price: " + tprice);
     
      if (blockNumber - prevBlockNumber == blockDuration) {
          catchFloorPrice = tprice;
      }

      let wbtcInvestor1BalanceBefore = await wbtc.balanceOf(investor1);
      let auctionTotalreceivedBefore = await dutch.totalReceived()
      let walletwbtcBefore = await wbtc.balanceOf(dutchAddress);
    
      let tx = await dutch.bidEBTC(investor1, bidAmount, wbtcAddr, { from: investor1 });
      totalReceivedTest = totalReceivedTest.add(web3.utils.toBN(bidAmount));

      let wbtcInvestor1BalanceAfter = await wbtc.balanceOf(investor1);
      let auctionTotalreceivedAfter = await dutch.totalReceived()
      let walletwbtcAfter = await wbtc.balanceOf(dutchAddress);

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
     
      if (catchFloorPrice > 0) {
        assert.isTrue(web3.utils.toBN(catchFloorPrice) - web3.utils.toBN(tprice)===0);
      }
      else if (blockNumber-prevBlockNumber == blockDuration) {
        catchFloorPrice = tprice;
      }

      await time.advanceBlock();
      blockNumber = await web3.eth.getBlockNumber();
      console.log("block#: " + blockNumber);
      tprice = await dutch.calcTokenPrice.call();
      console.log("price: " + tprice);
      
      if (catchFloorPrice > 0) {
        assert.isTrue(web3.utils.toBN(catchFloorPrice) - web3.utils.toBN(tprice)===0);
      }
      else if (blockNumber-prevBlockNumber == blockDuration) {
        catchFloorPrice = tprice;
      }

      await time.advanceBlock();
      blockNumber = await web3.eth.getBlockNumber();
      console.log("block#: " + blockNumber); 
      tprice = await dutch.calcTokenPrice.call();
      console.log("price: " + tprice);
 
      if (catchFloorPrice > 0) {
        assert.isTrue(web3.utils.toBN(catchFloorPrice) - web3.utils.toBN(tprice)===0);
      }
      else if (blockNumber-prevBlockNumber == blockDuration) {
        catchFloorPrice = tprice;
      }
      
      dutch.bidEBTC(investor2, bidAmount, sbtcAddr, { from: investor2 });

      await time.advanceBlock();
      blockNumber = await web3.eth.getBlockNumber();
      console.log("block#: " + blockNumber); 
      tprice = await dutch.calcTokenPrice.call();
      console.log("price: " + tprice);

      if (catchFloorPrice > 0) {
        assert.isTrue(web3.utils.toBN(catchFloorPrice) - web3.utils.toBN(tprice)===0);
      }
      else if (blockNumber-prevBlockNumber == blockDuration) {
        catchFloorPrice = tprice;
      }

      await time.advanceBlock(); 
      blockNumber = await web3.eth.getBlockNumber();
      console.log("block#: " + blockNumber);  
      tprice = await dutch.calcTokenPrice.call();
      console.log("price: " + tprice);

      if (catchFloorPrice > 0) {
        assert.isTrue(web3.utils.toBN(catchFloorPrice) - web3.utils.toBN(tprice)===0);
      }
      else if (blockNumber-prevBlockNumber == blockDuration) {
        catchFloorPrice = tprice;
      }
      
      await time.advanceBlock();
      blockNumber = await web3.eth.getBlockNumber();
      console.log("block#: " + blockNumber);  
      tprice = await dutch.calcTokenPrice.call();
      console.log("price: " + tprice);
      
      if (catchFloorPrice > 0) {
        assert.isTrue(web3.utils.toBN(catchFloorPrice) - web3.utils.toBN(tprice)===0);
      }
      else if (blockNumber-prevBlockNumber == blockDuration) {
        catchFloorPrice = tprice;
      }

      // Deposit 2:  investor2 gets full reimbursment of sbtc beacuse reached blockEnd ==> auction ends

      let sbtcInvestor2BalanceBefore = await sbtc.balanceOf(investor2);
      auctionTotalreceivedBefore = await dutch.totalReceived()
      walletsbtcBefore = await sbtc.balanceOf(dutchAddress);
    
      console.log("sbtcInvestor2BalanceBefore: " + sbtcInvestor2BalanceBefore);
      console.log("auctionTotalreceivedBefore: " + auctionTotalreceivedBefore);
      console.log("walletsbtcBefore: " + walletsbtcBefore);

      let currentStage = await dutch.stage();
      console.log("stage is: " + currentStage);
      dutch.bidEBTC(investor2, bidAmount, sbtcAddr, { from: investor2 })
      totalReceivedTest = totalReceivedTest.add(web3.utils.toBN(bidAmount));

      let sbtcInvestor2BalanceAfter = await sbtc.balanceOf(investor2);
      auctionTotalreceivedAfter = await dutch.totalReceived()
      let walletsbtcAfter = await sbtc.balanceOf(dutchAddress);

      console.log("sbtcInvestor2BalanceAfter: " + sbtcInvestor2BalanceAfter);
      console.log("auctionTotalreceivedAfter: " + auctionTotalreceivedAfter);
      console.log("walletsbtcAfter: " + walletsbtcAfter);

      // Auction has ended
      await expectRevert(
        dutch.bidEBTC(investor2, bidAmount, sbtcAddr, { from: investor2 }),
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
      assert(totalReceived.eq(totalReceivedTest));
      console.log("totalReceived: " + totalReceived + "  " + "totalReceivedTest: " + totalReceivedTest);

      const soldTokens = (totalReceived * (10**18))/calcPriceFinal;
      const soldTokensSC = await token.balanceOf(dutchAddress);
      console.log("soldTokens: " + soldTokens + "  " + "soldTokensSC: " + soldTokensSC);
      //assert.isTrue(soldTokensSC - soldTokens > );

      const leftTokens = await token.balanceOf(sovrynAddress);
      const totalCalculated = soldTokensSC + leftTokens;

      console.log("totalCalculated: " + totalCalculated);
      console.log("calcStopPrice: " + calcStopPrice);
      console.log("calcPriceEnd: " + calcPriceEnd);
      console.log("calcPriceFinal: " + calcPriceFinal);

      console.log("soldTokens: " + soldTokens);
      console.log("ESOV sc balance: " + soldTokensSC);
      console.log("ESOV Wallet balance: " + leftTokens);

    });
  });
/////////////////////////////////////////////

describe("bidEBTC onStage - price equilibrium path", () => {
  beforeEach(async () => {
    
    ceiling = web3.utils.toWei('200');
    blockDuration = 20;
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
    let totalReceivedTest = web3.utils.toBN('0');
    let blockNumber = await web3.eth.getBlockNumber();
    console.log("block#: " + blockNumber);  
    let tprice = await dutch.calcTokenPrice.call();
    console.log("t0 price: " + tprice);
    
    let bidAmount = web3.utils.toWei('140');
    
    // Deposit 1: investor1 deposit wbtc
    let prevBlockNumber = blockNumber;
    let prevtprice = tprice;
    let catchFloorPrice = 0;

    blockNumber = await web3.eth.getBlockNumber();
    console.log("block#: " + blockNumber);
    tprice = await dutch.calcTokenPrice.call();
    console.log("t0 price: " + tprice);
   
    if (blockNumber - prevBlockNumber == blockDuration) {
        catchFloorPrice = tprice;
    }

    let wbtcInvestor1BalanceBefore = await wbtc.balanceOf(investor1);
    let auctionTotalreceivedBefore = await dutch.totalReceived()
    let walletwbtcBefore = await wbtc.balanceOf(dutchAddress);
  
    let tx = await dutch.bidEBTC(investor1, bidAmount, wbtcAddr, { from: investor1 });
    totalReceivedTest = totalReceivedTest.add(web3.utils.toBN(bidAmount));

    let wbtcInvestor1BalanceAfter = await wbtc.balanceOf(investor1);
    let auctionTotalreceivedAfter = await dutch.totalReceived()
    let walletwbtcAfter = await wbtc.balanceOf(dutchAddress);

    expectEvent(tx, 'BidSubmission', {
      sender: investor1,
      amount: '140000000000000000000'
    });
  
    assert((wbtcInvestor1BalanceBefore - wbtcInvestor1BalanceAfter) ==
      (auctionTotalreceivedAfter - auctionTotalreceivedBefore));
    assert((wbtcInvestor1BalanceBefore - wbtcInvestor1BalanceAfter) ==
      (walletwbtcAfter - walletwbtcBefore));
      
    let calcStopPrice = await dutch.calcStopPrice();
    console.log("calcStopPrice: " + calcStopPrice);

    // Deposit 2:  investor2 deposit sbtc 
    bidAmount = web3.utils.toWei('20');
    
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
    
    currentStage = await dutch.stage();
    console.log("currentStage: "+ currentStage);
    
    let calcPriceFinal = await dutch.finalPrice();
    console.log("calcPriceFinal: " + calcPriceFinal);

    dutch.bidEBTC(investor2, bidAmount, sbtcAddr, { from: investor2 });

    calcPriceFinal = await dutch.finalPrice();
    console.log("calcPriceFinal: " + calcPriceFinal);

    console.log("totalReceived: " + await dutch.totalReceived());
    calcStopPrice = await dutch.calcStopPrice();
    console.log("calcStopPrice: " + calcStopPrice);
    
    currentStage = await dutch.stage();
    console.log("currentStage: "+ currentStage);

    const investor1Bids = await dutch.bids(investor1);
    const investor2Bids = await dutch.bids(investor2);

    console.log("bids1: "+ investor1Bids + "  " + "bids2: "+ investor2Bids  );

    assert(investor1Bids.eq(web3.utils.toBN(web3.utils.toWei('140'))));
    assert(investor2Bids.eq(web3.utils.toBN(web3.utils.toWei('0'))));
    // Auction has ended
    await expectRevert(
      dutch.bidEBTC(investor2, bidAmount, sbtcAddr, { from: investor2 }),
      'Contract not in expected stage.'
    );

  /*  
    dutch.bidEBTC(investor2, bidAmount, sbtcAddr, { from: investor2 });

    await time.advanceBlock();
    blockNumber = await web3.eth.getBlockNumber();
    console.log("block#: " + blockNumber); 
    tprice = await dutch.calcTokenPrice.call();
    console.log("price: " + tprice);

    if (catchFloorPrice > 0) {
      assert.isTrue(web3.utils.toBN(catchFloorPrice) - web3.utils.toBN(tprice)===0);
    }
    else if (blockNumber-prevBlockNumber == blockDuration) {
      catchFloorPrice = tprice;
    }

    await time.advanceBlock(); 
    blockNumber = await web3.eth.getBlockNumber();
    console.log("block#: " + blockNumber);  
    tprice = await dutch.calcTokenPrice.call();
    console.log("price: " + tprice);

    if (catchFloorPrice > 0) {
      assert.isTrue(web3.utils.toBN(catchFloorPrice) - web3.utils.toBN(tprice)===0);
    }
    else if (blockNumber-prevBlockNumber == blockDuration) {
      catchFloorPrice = tprice;
    }
    
    await time.advanceBlock();
    blockNumber = await web3.eth.getBlockNumber();
    console.log("block#: " + blockNumber);  
    tprice = await dutch.calcTokenPrice.call();
    console.log("price: " + tprice);
    
    if (catchFloorPrice > 0) {
      assert.isTrue(web3.utils.toBN(catchFloorPrice) - web3.utils.toBN(tprice)===0);
    }
    else if (blockNumber-prevBlockNumber == blockDuration) {
      catchFloorPrice = tprice;
    }

    // Deposit 2:  investor2 gets full reimbursment of sbtc beacuse reached blockEnd ==> auction ends

    let sbtcInvestor2BalanceBefore = await sbtc.balanceOf(investor2);
    auctionTotalreceivedBefore = await dutch.totalReceived()
    walletsbtcBefore = await sbtc.balanceOf(sovrynAddress);
  
    console.log("sbtcInvestor2BalanceBefore: " + sbtcInvestor2BalanceBefore);
    console.log("auctionTotalreceivedBefore: " + auctionTotalreceivedBefore);
    console.log("walletsbtcBefore: " + walletsbtcBefore);

    let currentStage = await dutch.stage();
    console.log("stage is: " + currentStage);
    dutch.bidEBTC(investor2, bidAmount, sbtcAddr, { from: investor2 })

    let sbtcInvestor2BalanceAfter = await sbtc.balanceOf(investor2);
    auctionTotalreceivedAfter = await dutch.totalReceived()
    let walletsbtcAfter = await sbtc.balanceOf(sovrynAddress);

    console.log("sbtcInvestor2BalanceAfter: " + sbtcInvestor2BalanceAfter);
    console.log("auctionTotalreceivedAfter: " + auctionTotalreceivedAfter);
    console.log("walletsbtcAfter: " + walletsbtcAfter);

    // Auction has ended
    await expectRevert(
      dutch.bidEBTC(investor2, bidAmount, sbtcAddr, { from: investor2 }),
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
    assert(totalReceived.eq(totalReceivedTest));
    
    const soldTokens = (totalReceived * (10**18))/calcPriceFinal;
    const soldTokensSC = await token.balanceOf(dutchAddress);
    assert.isTrue(soldTokensSC - soldTokens === 0);

    const leftTokens = await token.balanceOf(sovrynAddress);
    const totalCalculated = soldTokensSC + leftTokens;

    console.log("totalCalculated: " + totalCalculated);
    console.log("calcStopPrice: " + calcStopPrice);
    console.log("calcPriceEnd: " + calcPriceEnd);
    console.log("calcPriceFinal: " + calcPriceFinal);

    console.log("soldTokens: " + soldTokens);
    console.log("ESOV sc balance: " + soldTokensSC);
    console.log("ESOV Wallet balance: " + leftTokens);
*/
  });
});
});