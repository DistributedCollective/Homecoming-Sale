const { expectEvent, expectRevert, time, expect } = require('@openzeppelin/test-helpers');
const DutchAuction = artifacts.require('DutchAuction.sol');
const ESOVToken = artifacts.require('ESOVToken.sol');

contract('DutchAuction', (accounts) => {
  let dutch;
  let token;
  let tokenAddr;
  let gasPrice;
  let dutchAddress;

  const totalSupply = web3.utils.toWei('2000000');
  
  let blockDuration = 14;
  
  let ceiling = web3.utils.toWei('2.5');
  let priceFactorNumerator = '6';
  let priceFactorDenominator = '10000';
  let priceConst = '6';

  let owner = accounts[0];
  const investor1 = accounts[1];
  const investor2 = accounts[2];
  const investor3 = accounts[3];
  const investor4 = accounts[4];
  const admin1 = accounts[5];
  const admin2 = accounts[6];
  let sovrynAddress = accounts[8];
  let esovAdmin = accounts[9];
  
  console.log("Owner: " + owner);
  
  const Stages = {
    AuctionDeployed: 0,
    AuctionSetUp: 1,
    AuctionStarted: 2,
    AuctionEnded: 3,
    TradingStarted: 4
  };
  
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

      await dutch.addAdmins([admin1, admin2], {from: owner});
      const isAdmin1 = await dutch.isAdmin(admin1);
      const isAdmin2 = await dutch.isAdmin(admin2);
      assert(isAdmin1);
      assert(isAdmin2);
      console.log("admin1: " + admin1 + "  " + await dutch.isAdmin(admin1));
      console.log("admin2: " + admin2 + "  " + await dutch.isAdmin(admin2));
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
      await token.setSaleAdmin(dutchAddress, {from: esovAdmin});
      await dutch.addAdmins([admin1, admin2], {from: owner});
      gasPrice = await web3.eth.getGasPrice();

  });

  describe("setup", () => {
    it('should NOT setup if not owner', async () => {
      await expectRevert(
        dutch.setup(tokenAddr, esovAdmin,{ from: investor2 }),
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
        dutch.changeSettings(1000 ,8 ,10000, 9, 30, { from: investor2 }),
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

///////////////////////////////////
// bid - BTC Deposit by multisig
describe("BTC bid NOT on correct Stage", () => {
  it('should NOT send bid if not on AuctionStarted stage', async () => {
    await dutch.setup(tokenAddr, esovAdmin, { from: owner });
    let bidAmount = web3.utils.toWei('1');
    await expectRevert(
      dutch.bidBTC(investor1, bidAmount, {from: admin1}),
      "Contract not in expected stage"
    );
  })
});

describe("BTC bid onStage - deposit ceiling constraint path", () => {
  beforeEach(async () => {
    await dutch.setup(tokenAddr, esovAdmin, { from: owner });
    await dutch.startAuction({ from: esovAdmin });
    currentStage =await dutch.stage();
    assert(currentStage.toNumber() === 2);
  });  
  
  it('BTC Full flow send bid => end sale at ceiling => reimburse => close sale => claim ESOV', async () => {
    let totalReceivedTest = web3.utils.toBN('0');
    let blockNumber = await web3.eth.getBlockNumber();
    console.log("block#: " + blockNumber);

    let tprice = await dutch.calcTokenPrice.call();
    console.log("t0 price: " + tprice); 
            
    let bidAmount = web3.utils.toBN(web3.utils.toWei('1.1'));
  // Deposit 1: investor1 deposit Rbtc
    let tx = await dutch.bidBTC(investor1, bidAmount, {from: admin2});
    totalReceivedTest = totalReceivedTest.add(web3.utils.toBN(bidAmount));

    expectEvent(tx, 'BidSubmission', {
      sender: investor1,
      amount: '1100000000000000000'
    });

  // call tokenAllocation() failed, since auction has not ended
    await expectRevert(
      dutch.tokenAllocation(investor1),
      "cannot call tokenAllocation at current stage"
    );

  // Deposit 2: investor2 deposit Rbtc
    tx = await dutch.bidBTC(investor2, bidAmount, {from: admin1});
    totalReceivedTest = totalReceivedTest.add(web3.utils.toBN(bidAmount));

    expectEvent(tx, 'BidSubmission', {
      sender: investor2,
      amount: '1100000000000000000'
    });

  // Deposit 3: investor2 deposit Rbtc again - ceiling is reached,  0.2 reimbursed
    blockNumber = await web3.eth.getBlockNumber();
    //console.log("block#: " + blockNumber);  
    tprice = await dutch.calcTokenPrice.call();
    //console.log("t3 price: " + tprice);   
  
    bidAmount = web3.utils.toWei('0.5');

    let reimburseBTCAddr = await dutch.reimburseBTCAddr();
    let reimburseBTCAmount = web3.utils.toBN(await dutch.reimburseBTCAmount());
    let reimburseBTCAddrString = reimburseBTCAddr.toString();
    console.log("reimburse before btc case: " + reimburseBTCAddrString + "   " + reimburseBTCAmount);

    tx = await dutch.bidBTC(investor2, bidAmount, {from: admin2});
    totalReceivedTest = totalReceivedTest.add(web3.utils.toBN(web3.utils.toWei('0.3')));
    
    reimburseBTCAddr = await dutch.reimburseBTCAddr();
    reimburseBTCAmount = web3.utils.toBN(await dutch.reimburseBTCAmount());
    reimburseBTCAddrString = reimburseBTCAddr.toString();
    console.log("reimburse after btc case: " + reimburseBTCAddrString + "   " + reimburseBTCAmount);
    let reimburseAddrCmp = investor2.localeCompare(reimburseBTCAddrString);
    assert(reimburseAddrCmp == 0);
    assert(reimburseBTCAmount == '200000000000000000');
  
    const calcPriceEnd = await dutch.calcTokenPrice.call();
    const calcPriceFinal = await dutch.finalPrice();
    const calcStopPrice = await dutch.calcStopPrice();

    expectEvent(tx, 'BidSubmission', {
      sender: investor2,
      amount: '300000000000000000'
    });
 
  // Deposit 4: Deposit not allowed, since stage has changed to AuctionEnded
    let currentStage =await dutch.stage();
    assert(currentStage.toNumber() === 3);

    await expectRevert(
      dutch.bidBTC(investor1, bidAmount, {from: admin1}),
            'Contract not in expected stage'
    );

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
    
    
  // Cannot saleClosure() before removeBTCAdr() 
    await expectRevert(
      dutch.saleClosure(true, { from: esovAdmin }),
      "Must remove Failed BTC TX Before Sale closure"
    );    
  
  // call removeBTCAdr() before saleClosure()
    let bidAmountRemove = web3.utils.toBN(web3.utils.toWei('0.6'));

    let investor1Bids = web3.utils.toBN(await dutch.bids(investor1));
    let investor2Bids = web3.utils.toBN(await dutch.bids(investor2));
    console.log("investor1 bids: " + investor1Bids);
    console.log("investor2 bids: " + investor2Bids);

    console.log("IsRemovedFailedTx: " + await dutch.IsRemovedFailedTx());
    await dutch.removeBTCAdr([investor1],[bidAmountRemove], { from: esovAdmin });
    console.log("IsRemovedFailedTx: " + await dutch.IsRemovedFailedTx());
   
    let investor1BidsAfter = await dutch.bids(investor1);
    let investor2BidsAfter = await dutch.bids(investor2);
    console.log("investor1 bids: " + investor1BidsAfter);
    console.log("investor2 bids: " + investor2BidsAfter);
    assert(investor1Bids - investor1BidsAfter == '600000000000000000'); 
    assert(investor2BidsAfter - investor2Bids == 0); 
    
    // check tokenAllocation
    const investor1SOV = web3.utils.toBN(await dutch.tokenAllocation(investor1));  
    const investor2SOV = web3.utils.toBN(await dutch.tokenAllocation(investor2));  
    //console.log("investor1 SOV: " + investor1SOV);  
    //console.log("investor2 SOV: " + investor2SOV);  
    
    let investor1ESOVAmount = web3.utils.toBN('1000000000000000000');
    investor1ESOVAmount = investor1BidsAfter.mul(investor1ESOVAmount);
    investor1ESOVAmount = investor1ESOVAmount.div(calcPriceFinal);
    let investor2ESOVAmount = web3.utils.toBN('1000000000000000000');
    investor2ESOVAmount = investor2BidsAfter.mul(investor2ESOVAmount);
    investor2ESOVAmount = investor2ESOVAmount.div(calcPriceFinal);
    
    console.log("investor1ESOVAmount: " + investor1ESOVAmount);
    console.log("investor2ESOVAmount: " + investor2ESOVAmount);

    let tempAdr; 
    let tempBal;

    const SovAddressesZise = await dutch.SovAddrSize();
    console.log("SovAddressesZise: " + SovAddressesZise);
    
    for(i=0; i < SovAddressesZise; i++) {
      tempAdr = await dutch.SovAddresses(i);
      tempBal = web3.utils.toBN(await dutch.tokenAllocation(tempAdr));
      if(i==0) {
        assert(investor1ESOVAmount -tempBal == 0);
      } else if (i==1) {
        assert(investor2ESOVAmount - tempBal == 0);
      }
      console.log(tempAdr + "  " + tempBal);
    }
  });
  
});

describe("BTC bid onStage - blockDuration constraint path", () => {
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

  it('Full flow send bid => end sale at blockEnd => reimburse => close sale => claim ESOV', async () => {
    let totalReceivedTest = web3.utils.toBN('0');
    let blockNumber = await web3.eth.getBlockNumber();
    console.log("block#: " + blockNumber);  
    let tprice = await dutch.calcTokenPrice.call();
    console.log("t0 price: " + tprice);
      
    let bidAmount = web3.utils.toBN(web3.utils.toWei('1.1'));
    
    // Deposit 1: investor1 deposit btc
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
    console.log("catchFloorPrice: " + catchFloorPrice);

    let tx = await dutch.bidBTC(investor1, bidAmount, {from: admin2});
    totalReceivedTest = totalReceivedTest.add(web3.utils.toBN(bidAmount));

    expectEvent(tx, 'BidSubmission', {
      sender: investor1,
      amount: '1100000000000000000'
    });

    // Deposit 2:  investor2 deposit btc 
    bidAmount = web3.utils.toBN(web3.utils.toWei('0.1'));
    
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
    console.log("catchFloorPrice: " + catchFloorPrice);
    
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
    console.log("catchFloorPrice: " + catchFloorPrice);

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
    console.log("catchFloorPrice: " + catchFloorPrice);
    
    tx = await dutch.bidBTC(investor1, bidAmount, {from: admin2});
    totalReceivedTest = totalReceivedTest.add(web3.utils.toBN(bidAmount));

    expectEvent(tx, 'BidSubmission', {
      sender: investor1,
      amount: '100000000000000000'
    });

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
console.log("catchFloorPrice: " + catchFloorPrice);

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
    console.log("catchFloorPrice: " + catchFloorPrice);

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
console.log("catchFloorPrice: " + catchFloorPrice);

    // Deposit 3:  Full reimburse (update: reimburseBTCAddr=investor2, reimburseBTCAmount=bidAmount) beacuse reached blockEnd ==> auction ends
    let currentStage = await dutch.stage();
    console.log("stage is: " + currentStage);

    let reimburseBTCAddr = await dutch.reimburseBTCAddr();
    let reimburseBTCAmount = web3.utils.toBN(await dutch.reimburseBTCAmount());
    let reimburseBTCAddrString = reimburseBTCAddr.toString();
    console.log("reimburse before btc case: " + reimburseBTCAddrString + "   " + reimburseBTCAmount);

    tx = await dutch.bidBTC(investor2, bidAmount, {from: admin2});
    //totalReceivedTest = totalReceivedTest.add(web3.utils.toBN(web3.utils.toWei('0.3')));
    
    reimburseBTCAddr = await dutch.reimburseBTCAddr();
    reimburseBTCAmount = web3.utils.toBN(await dutch.reimburseBTCAmount());
    reimburseBTCAddrString = reimburseBTCAddr.toString();
    console.log("reimburse after btc case: " + reimburseBTCAddrString + "   " + reimburseBTCAmount);
    let reimburseAddrCmp = investor2.localeCompare(reimburseBTCAddrString);
    assert(reimburseAddrCmp == 0);
    assert(reimburseBTCAmount == '100000000000000000');

    // Auction has ended
    await expectRevert(
      dutch.bidBTC(investor2, bidAmount, {from: admin2}),
      'Contract not in expected stage'
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
/////////////////////////////
describe("BTC bid onStage with preDeposit- price equilibrium path", () => {
  beforeEach(async () => {
    
    ceiling = web3.utils.toWei('20');
    blockDuration = 20;
    priceFactorDenominator = '100000';
    await dutch.setup(tokenAddr, esovAdmin, { from: owner });
    await dutch.changeSettings(
      ceiling,
      priceFactorNumerator,
      priceFactorDenominator,
      priceConst,
      blockDuration,
       { from: esovAdmin });
    
    const preAmount0 = web3.utils.toWei('0.1');
    const preAmount1 = web3.utils.toWei('0.2');
    await dutch.preDeposit([investor1, investor4], [preAmount0, preAmount1], { from: esovAdmin });
    
    const preTotalReceived = web3.utils.toBN(web3.utils.toWei('0.3'));
    const totalReceived = await dutch.totalReceived();
    console.log("totalReceived: " + await dutch.totalReceived());
    assert(totalReceived.eq(preTotalReceived));

    const preinvestor1Bids = await dutch.bids(investor1);
    const preinvestor4Bids = await dutch.bids(investor4);
    

    console.log("bids1: "+ preinvestor1Bids + "  " + "bids4: "+ preinvestor4Bids );
  
    assert(preinvestor1Bids.eq(web3.utils.toBN(web3.utils.toWei('0.1'))));
    assert(preinvestor4Bids.eq(web3.utils.toBN(web3.utils.toWei('0.2'))));
    
    await dutch.startAuction({ from: esovAdmin });
    currentStage = await dutch.stage();
    assert(currentStage.toNumber() === 2);
  });
  it('Full flow send BTC bid with preDeposit => end sale at price equilibrium before the block => Full reimburse => close sale => claim ESOV', async () => {
    let totalReceivedTest = web3.utils.toBN(web3.utils.toWei('0.3'));
    let blockNumber = await web3.eth.getBlockNumber();
    console.log("block#: " + blockNumber);  
    let tprice = await dutch.calcTokenPrice.call();
    console.log("t0 price: " + tprice);
  
    let bidAmount = web3.utils.toWei('5');
    
    // Deposit 1: investor3 deposit btc
    let prevBlockNumber = blockNumber;
    let prevtprice = tprice;
    let catchFloorPrice = 0;
  
    blockNumber = await web3.eth.getBlockNumber();
    console.log("block#: " + blockNumber);
    tprice = await dutch.calcTokenPrice.call();
    console.log("t0 price: " + tprice);
   
    let tx = await dutch.bidBTC(investor3, bidAmount, {from: admin1});
    totalReceivedTest = totalReceivedTest.add(web3.utils.toBN(bidAmount));
  
    expectEvent(tx, 'BidSubmission', {
      sender: investor3,
      amount: '5000000000000000000'
    });
      
    let calcStopPrice = await dutch.calcStopPrice();
    console.log("calcStopPrice: " + calcStopPrice);
  
    // Deposit 2: investor2 deposit BTC
    bidAmount = web3.utils.toWei('2');
    
    blockNumber = await web3.eth.getBlockNumber();
    console.log("block#: " + blockNumber);
    tprice = await dutch.calcTokenPrice.call();
    console.log("t0 price: " + tprice);
   
    tx = await dutch.bidBTC(investor2, bidAmount, {from: admin1});
    totalReceivedTest = totalReceivedTest.add(web3.utils.toBN(bidAmount));
  
    expectEvent(tx, 'BidSubmission', {
      sender: investor2,
      amount: '2000000000000000000'
    });
      
    calcStopPrice = await dutch.calcStopPrice();
    console.log("calcStopPrice: " + calcStopPrice);
  
    // Deposit 3:  investor2 deposit btc - full reimburse    
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
  
    let reimburseBTCAddr = await dutch.reimburseBTCAddr();
    let reimburseBTCAmount = web3.utils.toBN(await dutch.reimburseBTCAmount());
    let reimburseBTCAddrString = reimburseBTCAddr.toString();
    console.log("reimburse before btc case: " + reimburseBTCAddrString + "   " + reimburseBTCAmount);
  
    await dutch.bidBTC(investor2, bidAmount, {from: admin1});
    //totalReceivedTest = totalReceivedTest.add(web3.utils.toBN(web3.utils.toWei('0.1')));
  
    reimburseBTCAddr = await dutch.reimburseBTCAddr();
    reimburseBTCAmount = web3.utils.toBN(await dutch.reimburseBTCAmount());
    reimburseBTCAddrString = reimburseBTCAddr.toString();
    console.log("reimburse after btc case: " + reimburseBTCAddrString + "   " + reimburseBTCAmount);
    let reimburseAddrCmp = investor2.localeCompare(reimburseBTCAddrString);
    assert(reimburseAddrCmp == 0);
    assert(reimburseBTCAmount == '2000000000000000000');
  
    calcPriceFinal = await dutch.finalPrice();
    console.log("calcPriceFinal: " + calcPriceFinal);
  
    calcStopPrice = await dutch.calcStopPrice();
    console.log("calcStopPrice: " + calcStopPrice);
    
    currentStage = await dutch.stage();
    console.log("currentStage: "+ currentStage);
  
    const investor1Bids = await dutch.bids(investor1);
    const investor2Bids = await dutch.bids(investor2);
    const investor3Bids = await dutch.bids(investor3);
    const investor4Bids = await dutch.bids(investor4);

    console.log("bids1: "+ investor1Bids + "  " + "bids2: "+ investor2Bids + "  " + "bids3: "+ investor3Bids );
  
    assert(investor2Bids.eq(web3.utils.toBN(web3.utils.toWei('2'))));
    assert(investor3Bids.eq(web3.utils.toBN(web3.utils.toWei('5'))));
    assert(investor1Bids.eq(web3.utils.toBN(web3.utils.toWei('0.1'))));
    assert(investor4Bids.eq(web3.utils.toBN(web3.utils.toWei('0.2'))));

    const totalReceived = await dutch.totalReceived();
    console.log("totalReceived: " + await dutch.totalReceived());
    assert(totalReceived.eq(totalReceivedTest));
  
    // Auction has ended
    await expectRevert(
      dutch.bidRBTC({from: investor1, value: bidAmount}),
      'Contract not in expected stage'
    );
  });
});
///////////////////////////

describe("BTC bid onStage - price equilibrium path", () => {
  beforeEach(async () => {
    
    ceiling = web3.utils.toWei('20');
    blockDuration = 20;
    priceFactorDenominator = '100000';
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
/////////////




//////
  it('Full flow send BTC bid => end sale at price equilibrium before the block => Full reimburse => close sale => claim ESOV', async () => {
    let totalReceivedTest = web3.utils.toBN('0');
    let blockNumber = await web3.eth.getBlockNumber();
    console.log("block#: " + blockNumber);  
    let tprice = await dutch.calcTokenPrice.call();
    console.log("t0 price: " + tprice);
  
    let bidAmount = web3.utils.toWei('5');
    
    // Deposit 1: investor3 deposit btc
    let prevBlockNumber = blockNumber;
    let prevtprice = tprice;
    let catchFloorPrice = 0;

    blockNumber = await web3.eth.getBlockNumber();
    console.log("block#: " + blockNumber);
    tprice = await dutch.calcTokenPrice.call();
    console.log("t0 price: " + tprice);
   
    let tx = await dutch.bidBTC(investor3, bidAmount, {from: admin1});
    totalReceivedTest = totalReceivedTest.add(web3.utils.toBN(bidAmount));

    expectEvent(tx, 'BidSubmission', {
      sender: investor3,
      amount: '5000000000000000000'
    });
      
    let calcStopPrice = await dutch.calcStopPrice();
    console.log("calcStopPrice: " + calcStopPrice);

    // Deposit 2: investor2 deposit BTC
    bidAmount = web3.utils.toWei('2');
    
    blockNumber = await web3.eth.getBlockNumber();
    console.log("block#: " + blockNumber);
    tprice = await dutch.calcTokenPrice.call();
    console.log("t0 price: " + tprice);
   
    tx = await dutch.bidBTC(investor2, bidAmount, {from: admin1});
    totalReceivedTest = totalReceivedTest.add(web3.utils.toBN(bidAmount));

    expectEvent(tx, 'BidSubmission', {
      sender: investor2,
      amount: '2000000000000000000'
    });
      
    calcStopPrice = await dutch.calcStopPrice();
    console.log("calcStopPrice: " + calcStopPrice);

    // Deposit 3:  investor2 deposit btc - full reimburse    
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

    let reimburseBTCAddr = await dutch.reimburseBTCAddr();
    let reimburseBTCAmount = web3.utils.toBN(await dutch.reimburseBTCAmount());
    let reimburseBTCAddrString = reimburseBTCAddr.toString();
    console.log("reimburse before btc case: " + reimburseBTCAddrString + "   " + reimburseBTCAmount);

    await dutch.bidBTC(investor2, bidAmount, {from: admin1});
    //totalReceivedTest = totalReceivedTest.add(web3.utils.toBN(web3.utils.toWei('0.1')));

    reimburseBTCAddr = await dutch.reimburseBTCAddr();
    reimburseBTCAmount = web3.utils.toBN(await dutch.reimburseBTCAmount());
    reimburseBTCAddrString = reimburseBTCAddr.toString();
    console.log("reimburse after btc case: " + reimburseBTCAddrString + "   " + reimburseBTCAmount);
    let reimburseAddrCmp = investor2.localeCompare(reimburseBTCAddrString);
    assert(reimburseAddrCmp == 0);
    assert(reimburseBTCAmount == '2000000000000000000');

    calcPriceFinal = await dutch.finalPrice();
    console.log("calcPriceFinal: " + calcPriceFinal);

    calcStopPrice = await dutch.calcStopPrice();
    console.log("calcStopPrice: " + calcStopPrice);
    
    currentStage = await dutch.stage();
    console.log("currentStage: "+ currentStage);

    const investor1Bids = await dutch.bids(investor1);
    const investor2Bids = await dutch.bids(investor2);
    const investor3Bids = await dutch.bids(investor3);

    console.log("bids1: "+ investor1Bids + "  " + "bids2: "+ investor2Bids + "  " + "bids3: "+ investor3Bids );

    assert(investor2Bids.eq(web3.utils.toBN(web3.utils.toWei('2'))));
    assert(investor3Bids.eq(web3.utils.toBN(web3.utils.toWei('5'))));
    assert(investor1Bids.eq(web3.utils.toBN(web3.utils.toWei('0'))));
    
    const totalReceived = await dutch.totalReceived();
    console.log("totalReceived: " + await dutch.totalReceived());
    assert(totalReceived.eq(totalReceivedTest));

    // Auction has ended
    await expectRevert(
      dutch.bidRBTC({from: investor1, value: bidAmount}),
      'Contract not in expected stage'
    );
  });

    it('Full flow send BTC bid => end sale at price equilibrium during the block => Partial reimburse => close sale => claim ESOV', async () => {
      let totalReceivedTest = web3.utils.toBN('0');
      let blockNumber = await web3.eth.getBlockNumber();
      console.log("block#: " + blockNumber);  
      let tprice = await dutch.calcTokenPrice.call();
      console.log("t0 price: " + tprice);
    
      let bidAmount = web3.utils.toWei('5');
      
      // Deposit 1: investor3 deposit btc
      let prevBlockNumber = blockNumber;
      let prevtprice = tprice;
      let catchFloorPrice = 0;
  
      blockNumber = await web3.eth.getBlockNumber();
      console.log("block#: " + blockNumber);
      tprice = await dutch.calcTokenPrice.call();
      console.log("t0 price: " + tprice);
     
      let tx = await dutch.bidBTC(investor3, bidAmount, {from: admin1});
    totalReceivedTest = totalReceivedTest.add(web3.utils.toBN(bidAmount));

    expectEvent(tx, 'BidSubmission', {
      sender: investor3,
      amount: '5000000000000000000'
    });
      
    let calcStopPrice = await dutch.calcStopPrice();
    console.log("calcStopPrice: " + calcStopPrice);

      // Deposit 2: investor2 deposit BTC
      bidAmount = web3.utils.toWei('2');
    
    blockNumber = await web3.eth.getBlockNumber();
    console.log("block#: " + blockNumber);
    tprice = await dutch.calcTokenPrice.call();
    console.log("t0 price: " + tprice);
   
    tx = await dutch.bidBTC(investor2, bidAmount, {from: admin1});
    totalReceivedTest = totalReceivedTest.add(web3.utils.toBN(bidAmount));

    expectEvent(tx, 'BidSubmission', {
      sender: investor2,
      amount: '2000000000000000000'
    });
      
    calcStopPrice = await dutch.calcStopPrice();
    console.log("calcStopPrice: " + calcStopPrice);
  
      // Deposit 3:  investor2 deposit btc - Partial reimburse
      
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
  
      await time.advanceBlock();
      blockNumber = await web3.eth.getBlockNumber();
      console.log("block#: " + blockNumber); 
      tprice = await dutch.calcTokenPrice.call();
      console.log("price: " + tprice);
      
      currentStage = await dutch.stage();
      console.log("currentStage: "+ currentStage);
      
      let calcPriceFinal = await dutch.finalPrice();
      console.log("calcPriceFinal: " + calcPriceFinal);
  
      let reimburseBTCAddr = await dutch.reimburseBTCAddr();
      let reimburseBTCAmount = web3.utils.toBN(await dutch.reimburseBTCAmount());
      let reimburseBTCAddrString = reimburseBTCAddr.toString();
      console.log("reimburse before btc case: " + reimburseBTCAddrString + "   " + reimburseBTCAmount);
  
      await dutch.bidBTC(investor2, bidAmount, {from: admin1});
      
      reimburseBTCAddr = await dutch.reimburseBTCAddr();
      reimburseBTCAmount = web3.utils.toBN(await dutch.reimburseBTCAmount());
      reimburseBTCAddrString = reimburseBTCAddr.toString();
      console.log("reimburse after btc case: " + reimburseBTCAddrString + "   " + reimburseBTCAmount);
      let reimburseAddrCmp = investor2.localeCompare(reimburseBTCAddrString);
      assert(reimburseAddrCmp == 0);
      assert(reimburseBTCAmount == '999999999998000000');
  
      calcPriceFinal = await dutch.finalPrice();
      console.log("calcPriceFinal: " + calcPriceFinal);
  
      console.log("totalReceived: " + await dutch.totalReceived());
      calcStopPrice = await dutch.calcStopPrice();
      console.log("calcStopPrice: " + calcStopPrice);
      
      currentStage = await dutch.stage();
      console.log("currentStage: "+ currentStage);
  
      const investor1Bids = await dutch.bids(investor1);
      const investor2Bids = await dutch.bids(investor2);
      const investor3Bids = await dutch.bids(investor3);
  
      console.log("bids1: "+ investor1Bids + "  " + "bids2: "+ investor2Bids + "  " + "bids3: "+ investor3Bids );
  
      assert(investor2Bids.eq(web3.utils.toBN('3000000000002000000')));
      assert(investor3Bids.eq(web3.utils.toBN(web3.utils.toWei('5'))));
      assert(investor1Bids.eq(web3.utils.toBN(web3.utils.toWei('0'))));
  
      // Auction has ended
      await expectRevert(
        dutch.bidRBTC({from: investor1, value: bidAmount}),
        'Contract not in expected stage'
      );
    });
  });




///////////////////////////
// bid - RBTC Deposit
///////////////////////////

  describe("RBTC bid NOT on correct Stage", () => {
    it('should NOT send bid if not on AuctionStarted stage', async () => {
      await dutch.setup(tokenAddr, esovAdmin, { from: owner });
      let bidAmount = web3.utils.toWei('1');
      await expectRevert(
        dutch.bidRBTC({from: investor1, value: bidAmount}),
        "Contract not in expected stage"
      );
    })
  });

  describe("RBTC bid onStage - deposit ceiling constraint path", () => {
    beforeEach(async () => {
      ceiling = web3.utils.toWei('2.5');
      blockDuration = 14;
      priceFactorDenominator = '10000';
      
      await dutch.setup(tokenAddr, esovAdmin, { from: owner });
      await dutch.changeSettings(ceiling ,priceFactorNumerator ,priceFactorDenominator, priceConst, blockDuration, { from: esovAdmin });
      await dutch.startAuction({ from: esovAdmin });
      currentStage =await dutch.stage();
      assert(currentStage.toNumber() === 2);
    });  
  
    it('Full flow send RBTC bid => end sale at ceiling => reimburse => close sale => claim ESOV', async () => {
      let totalReceivedTest = web3.utils.toBN('0');
      let blockNumber = await web3.eth.getBlockNumber();
      console.log("block#: " + blockNumber);

      let tprice = await dutch.calcTokenPrice.call();
      console.log("t0 price: " + tprice); 
                
      let bidAmount = web3.utils.toBN(web3.utils.toWei('1.1'));
    // Deposit 1: investor1 deposit Rbtc
      blockNumber = await web3.eth.getBlockNumber();
      //console.log("block#: " + blockNumber);  
      tprice = await dutch.calcTokenPrice.call();
      //console.log("t1 price: " + tprice); 
  
      let investor1BalanceBefore = await web3.eth.getBalance(investor1);
      let auctionTotalreceivedBefore = await dutch.totalReceived()
      let walletbtcBefore = await web3.eth.getBalance(sovrynAddress);
      
      let tx = await dutch.bidRBTC({from: investor1, value: bidAmount});
      totalReceivedTest = totalReceivedTest.add(web3.utils.toBN(bidAmount));

      let investor1BalanceAfter = await web3.eth.getBalance(investor1);
      let auctionTotalreceivedAfter = await dutch.totalReceived()
      let walletbtcAfter = await web3.eth.getBalance(sovrynAddress);

      expectEvent(tx, 'BidSubmission', {
        sender: investor1,
        amount: '1100000000000000000'
      });

      let gasUsed = await web3.utils.toBN(tx.receipt.gasUsed);
      let gasSpent = web3.utils.toBN(10* gasPrice * gasUsed);

      let bid1WithGas = bidAmount.add(gasSpent);
      let delta = investor1BalanceBefore -investor1BalanceAfter;
      //console.log("bid1WithGas: " + bid1WithGas + "  "+ "delta: "+ delta );

      // Add small margin for mismatch in calculation
      assert((delta - bid1WithGas < 5000000) &&  (delta - bid1WithGas > (-5000000) ));
      assert((auctionTotalreceivedAfter - auctionTotalreceivedBefore) ==
        (walletbtcAfter - walletbtcBefore));
  

      // call tokenAllocation() failed, since auction has not ended
      await expectRevert(
        dutch.tokenAllocation(investor1),
        "cannot call tokenAllocation at current stage"
      );

    // Deposit 2: investor2 deposit Rbtc
      blockNumber = await web3.eth.getBlockNumber();
      //console.log("block#: " + blockNumber);  
      tprice = await dutch.calcTokenPrice.call();
      //console.log("t1 price: " + tprice); 

      let investor2BalanceBefore = await web3.eth.getBalance(investor2);
      auctionTotalreceivedBefore = await dutch.totalReceived()
      walletbtcBefore = await web3.eth.getBalance(sovrynAddress);
      
      tx = await dutch.bidRBTC({from: investor2, value: bidAmount});
      totalReceivedTest = totalReceivedTest.add(web3.utils.toBN(bidAmount));

      let investor2BalanceAfter = await web3.eth.getBalance(investor2);
      auctionTotalreceivedAfter = await dutch.totalReceived()
      walletbtcAfter = await web3.eth.getBalance(sovrynAddress);

      expectEvent(tx, 'BidSubmission', {
        sender: investor2,
        amount: '1100000000000000000'
      });
      
      gasUsed = await web3.utils.toBN(tx.receipt.gasUsed);
      gasSpent = web3.utils.toBN(10* gasPrice * gasUsed);

      let bid2WithGas = bidAmount.add(gasSpent);
      delta = investor2BalanceBefore -investor2BalanceAfter;

      // Add small margin for mismatch in calculation
      assert((delta - bid2WithGas < 5000000) &&  (delta - bid2WithGas > (-5000000) ));
      assert((auctionTotalreceivedAfter - auctionTotalreceivedBefore) ==
        (walletbtcAfter - walletbtcBefore))   
             
    // Deposit 3: investor2 deposit Rbtc again - ceiling is reached,  0.2 reimbursed
      blockNumber = await web3.eth.getBlockNumber();
      //console.log("block#: " + blockNumber);  
      tprice = await dutch.calcTokenPrice.call();
      //console.log("t3 price: " + tprice);   
    
      bidAmount = web3.utils.toWei('0.5');
      
      investor2BalanceBefore = await web3.eth.getBalance(investor2);
      auctionTotalreceivedBefore = await dutch.totalReceived()
      walletbtcBefore = await web3.eth.getBalance(sovrynAddress);
      
      tx = await dutch.bidRBTC({from: investor2, value: bidAmount});
      totalReceivedTest = totalReceivedTest.add(web3.utils.toBN(web3.utils.toWei('0.3')));
      
      blockNumber = await web3.eth.getBlockNumber();
      //console.log("block#: " + blockNumber);  
      
      const calcPriceEnd = await dutch.calcTokenPrice.call();
      const calcPriceFinal = await dutch.finalPrice();
      const calcStopPrice = await dutch.calcStopPrice();

      investor2BalanceAfter = await web3.eth.getBalance(investor2);
      auctionTotalreceivedAfter = await dutch.totalReceived()
      walletbtcAfter = await web3.eth.getBalance(sovrynAddress);

      expectEvent(tx, 'BidSubmission', {
        sender: investor2,
        amount: '300000000000000000'
      });
      
      gasUsed = await web3.utils.toBN(tx.receipt.gasUsed);
      gasSpent = web3.utils.toBN(10* gasPrice * gasUsed);

      const bidAmountReal = web3.utils.toBN(web3.utils.toWei('0.3'));
      bid2WithGas = bidAmountReal.add(gasSpent);
      delta = investor2BalanceBefore -investor2BalanceAfter;
      //console.log("bid2WithGas: " + bid2WithGas + "  "+ "delta: "+ delta );

      // Add small margin for mismatch in calculation
      assert((delta - bid2WithGas < 5000000) &&  (delta - bid2WithGas > (-5000000) ));
      assert((auctionTotalreceivedAfter - auctionTotalreceivedBefore) ==
        (walletbtcAfter - walletbtcBefore))   
        
    // Deposit 4: Deposit not allowed, since stage has changed to AuctionEnded
      let currentStage =await dutch.stage();
      assert(currentStage.toNumber() === 3);

      await expectRevert(
        dutch.bidRBTC({from: investor1, value: bidAmount}),
              'Contract not in expected stage'
      );

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
      
    /*// Cannot claimTokens before saleClosure() 
      await expectRevert(
        dutch.claimTokens({from: investor1}),
        "Contract not in expected stage"
      );
      */
    // Cannot saleClosure() before removeBTCAdr() 
      await expectRevert(
        dutch.saleClosure(true, { from: esovAdmin }),
        "Must remove Failed BTC TX Before Sale closure"
      );    
    
    // call removeBTCAdr() before saleClosure()
      let bidAmountRemove = web3.utils.toBN(web3.utils.toWei('0.6'));

      let investor1Bids = await dutch.bids(investor1);
      let investor2Bids = await dutch.bids(investor2);
      console.log("investor1 bids: " + investor1Bids);
      console.log("investor2 bids: " + investor2Bids);

      console.log("IsRemovedFailedTx: " + await dutch.IsRemovedFailedTx());
      await dutch.removeBTCAdr([investor1],[bidAmountRemove], { from: esovAdmin });
      console.log("IsRemovedFailedTx: " + await dutch.IsRemovedFailedTx());
     ///////////
     let investor1BidsAfter = await dutch.bids(investor1);
    let investor2BidsAfter = await dutch.bids(investor2);
    console.log("investor1 bids: " + investor1BidsAfter);
    console.log("investor2 bids: " + investor2BidsAfter);
    assert(investor1Bids - investor1BidsAfter == '600000000000000000'); 
    assert(investor2BidsAfter - investor2Bids == 0); 
    
    // check tokenAllocation
    const investor1SOV = web3.utils.toBN(await dutch.tokenAllocation(investor1));  
    const investor2SOV = web3.utils.toBN(await dutch.tokenAllocation(investor2));  
    //console.log("investor1 SOV: " + investor1SOV);  
    //console.log("investor2 SOV: " + investor2SOV);  
    
    let investor1ESOVAmount = web3.utils.toBN('1000000000000000000');
    investor1ESOVAmount = investor1BidsAfter.mul(investor1ESOVAmount);
    investor1ESOVAmount = investor1ESOVAmount.div(calcPriceFinal);
    let investor2ESOVAmount = web3.utils.toBN('1000000000000000000');
    investor2ESOVAmount = investor2BidsAfter.mul(investor2ESOVAmount);
    investor2ESOVAmount = investor2ESOVAmount.div(calcPriceFinal);
    
    console.log("investor1ESOVAmount: " + investor1ESOVAmount);
    console.log("investor2ESOVAmount: " + investor2ESOVAmount);

    let tempAdr; 
    let tempBal;

    const SovAddressesZise = await dutch.SovAddrSize();
    console.log("SovAddressesZise: " + SovAddressesZise);
    
    for(i=0; i < SovAddressesZise; i++) {
      tempAdr = await dutch.SovAddresses(i);
      tempBal = web3.utils.toBN(await dutch.tokenAllocation(tempAdr));
      if(i==0) {
        assert(investor1ESOVAmount -tempBal == 0);
      } else if (i==1) {
        assert(investor2ESOVAmount - tempBal == 0);
      }
      console.log(tempAdr + "  " + tempBal);
    }
    });
    
  });
////////////////////////////////


/////////////////////////////

  describe("RBTC bid onStage - blockDuration constraint path", () => {
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

    it('Full flow send bid => end sale at blockEnd => reimburse => close sale => claim ESOV', async () => {
      let totalReceivedTest = web3.utils.toBN('0');
      let blockNumber = await web3.eth.getBlockNumber();
      console.log("block#: " + blockNumber);  
      let tprice = await dutch.calcTokenPrice.call();
      console.log("t0 price: " + tprice);
        
      let bidAmount = web3.utils.toBN(web3.utils.toWei('1.1'));
      
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
      console.log("catchFloorPrice: " + catchFloorPrice);

      let investor1BalanceBefore = await web3.eth.getBalance(investor1);
      let auctionTotalreceivedBefore = await dutch.totalReceived()
      let walletbtcBefore = await web3.eth.getBalance(sovrynAddress);
    
      console.log("RBTC bid 0f 1.1 investor1")
      let tx = await dutch.bidRBTC({from: investor1, value: bidAmount});
      totalReceivedTest = totalReceivedTest.add(web3.utils.toBN(bidAmount));

      let investor1BalanceAfter = await web3.eth.getBalance(investor1);
      let auctionTotalreceivedAfter = await dutch.totalReceived()
      let walletbtcAfter = await web3.eth.getBalance(sovrynAddress);

      expectEvent(tx, 'BidSubmission', {
        sender: investor1,
        amount: '1100000000000000000'
      });

      let gasUsed = await web3.utils.toBN(tx.receipt.gasUsed);
      let gasSpent = web3.utils.toBN(10* gasPrice * gasUsed);
      let bid1WithGas = bidAmount.add(gasSpent);
      let delta = investor1BalanceBefore -investor1BalanceAfter;

      // Add small margin for mismatch in calculation
      assert((delta - bid1WithGas < 5000000) &&  (delta - bid1WithGas > (-5000000) ));
      assert((auctionTotalreceivedAfter - auctionTotalreceivedBefore) ==
        (walletbtcAfter - walletbtcBefore));
 
      // Deposit 2:  investor2 deposit sbtc 
      bidAmount = web3.utils.toBN(web3.utils.toWei('0.1'));
      
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
      console.log("catchFloorPrice: " + catchFloorPrice);
      
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
      console.log("catchFloorPrice: " + catchFloorPrice);

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
      console.log("catchFloorPrice: " + catchFloorPrice);

      await dutch.bidRBTC({from: investor2, value: bidAmount});

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
console.log("catchFloorPrice: " + catchFloorPrice);

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
      console.log("catchFloorPrice: " + catchFloorPrice);

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
console.log("catchFloorPrice: " + catchFloorPrice);

      // Deposit 2:  investor2 gets full reimbursment of rbtc beacuse reached blockEnd ==> auction ends
      let currentStage = await dutch.stage();
      console.log("stage is: " + currentStage);

      let investor2BalanceBefore = await web3.eth.getBalance(investor2);
      auctionTotalreceivedBefore = await dutch.totalReceived()
      walletbtcBefore = await web3.eth.getBalance(sovrynAddress);
      
      tx = await dutch.bidRBTC({from: investor2, value: bidAmount});
      totalReceivedTest = totalReceivedTest.add(web3.utils.toBN(bidAmount));

      let investor2BalanceAfter = await web3.eth.getBalance(investor2);
      auctionTotalreceivedAfter = await dutch.totalReceived()
      walletbtcAfter = await web3.eth.getBalance(sovrynAddress);

      
      gasUsed = await web3.utils.toBN(tx.receipt.gasUsed);
      gasSpent = web3.utils.toBN(10* gasPrice * gasUsed);

      /// Full reimburse
      let bid2WithGas = gasSpent;
      delta = investor2BalanceBefore -investor2BalanceAfter;
      console.log("bid2WithGas: " + bid2WithGas + "  "+ "delta: "+ delta );

      // Add small margin for mismatch in calculation
      assert((delta - bid2WithGas < 5000000) &&  (delta - bid2WithGas > (-5000000) ));
      assert((auctionTotalreceivedAfter - auctionTotalreceivedBefore) ==
        (walletbtcAfter - walletbtcBefore))  ;
      // Auction has ended
      await expectRevert(
        dutch.bidRBTC({from: investor2, value: bidAmount}),
        'Contract not in expected stage'
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

describe("RBTC bid onStage - price equilibrium path", () => {
  beforeEach(async () => {
    
    ceiling = web3.utils.toWei('20');
    blockDuration = 20;
    priceFactorDenominator = '100000';
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

  it('Full flow send bid => end sale at price equilibrium before the block => Full reimburse => close sale => claim ESOV', async () => {
    let totalReceivedTest = web3.utils.toBN('0');
    let blockNumber = await web3.eth.getBlockNumber();
    console.log("block#: " + blockNumber);  
    let tprice = await dutch.calcTokenPrice.call();
    console.log("t0 price: " + tprice);
  
    let bidAmount = web3.utils.toWei('5');
    
    // Deposit 1: investor3 deposit Rbtc, investor2 deposit RBTC
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

    let investor3BalanceBefore = await web3.eth.getBalance(investor3);
    let auctionTotalreceivedBefore = await dutch.totalReceived()
    let walletbtcBefore = await web3.eth.getBalance(sovrynAddress);
  
    console.log("RBTC bid of 5 investor3")
    let tx = await dutch.bidRBTC({from: investor3, value: bidAmount});
    totalReceivedTest = totalReceivedTest.add(web3.utils.toBN(bidAmount));

    let investor3BalanceAfter = await web3.eth.getBalance(investor3);
    let auctionTotalreceivedAfter = await dutch.totalReceived()
    let walletbtcAfter = await web3.eth.getBalance(sovrynAddress);

    expectEvent(tx, 'BidSubmission', {
      sender: investor3,
      amount: '5000000000000000000'
    });

    let gasUsed = await web3.utils.toBN(tx.receipt.gasUsed);
    let gasSpent = web3.utils.toBN(10* gasPrice * gasUsed);
    let bid3WithGas = web3.utils.toBN(bidAmount).add(gasSpent);
    let delta = investor3BalanceBefore -investor3BalanceAfter;

    // Add small margin for mismatch in calculation
    assert((delta - bid3WithGas < 5000000) &&  (delta - bid3WithGas > (-5000000) ));
    assert((auctionTotalreceivedAfter - auctionTotalreceivedBefore) ==
      (walletbtcAfter - walletbtcBefore));
      
    let calcStopPrice = await dutch.calcStopPrice();
    console.log("calcStopPrice: " + calcStopPrice);

    // Deposit 2: investor2 deposit RBTC
    bidAmount = web3.utils.toWei('2');
    
    blockNumber = await web3.eth.getBlockNumber();
    console.log("block#: " + blockNumber);
    tprice = await dutch.calcTokenPrice.call();
    console.log("t0 price: " + tprice);
   
    if (blockNumber - prevBlockNumber == blockDuration) {
        catchFloorPrice = tprice;
    }

    let investor2BalanceBefore = await web3.eth.getBalance(investor2);
     auctionTotalreceivedBefore = await dutch.totalReceived()
     walletbtcBefore = await web3.eth.getBalance(sovrynAddress);
  
    console.log("RBTC bid 0f 2 investor2")
     tx = await dutch.bidRBTC({from: investor2, value: bidAmount});
    totalReceivedTest = totalReceivedTest.add(web3.utils.toBN(bidAmount));

    let investor2BalanceAfter = await web3.eth.getBalance(investor2);
     auctionTotalreceivedAfter = await dutch.totalReceived()
     walletbtcAfter = await web3.eth.getBalance(sovrynAddress);

    expectEvent(tx, 'BidSubmission', {
      sender: investor2,
      amount: '2000000000000000000'
    });

     gasUsed = await web3.utils.toBN(tx.receipt.gasUsed);
     gasSpent = web3.utils.toBN(10* gasPrice * gasUsed);
     let bid2WithGas = web3.utils.toBN(bidAmount).add(gasSpent);
     delta = investor2BalanceBefore -investor2BalanceAfter;

    // Add small margin for mismatch in calculation
    assert((delta - bid2WithGas < 5000000) &&  (delta - bid2WithGas > (-5000000) ));
    assert((auctionTotalreceivedAfter - auctionTotalreceivedBefore) ==
      (walletbtcAfter - walletbtcBefore));
      
     calcStopPrice = await dutch.calcStopPrice();
    console.log("calcStopPrice: " + calcStopPrice);

    // Deposit 3:  investor2 deposit Rbtc - full reimburse    
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

    await dutch.bidRBTC({from: investor2, value: bidAmount})

    calcPriceFinal = await dutch.finalPrice();
    console.log("calcPriceFinal: " + calcPriceFinal);

    console.log("totalReceived: " + await dutch.totalReceived());
    calcStopPrice = await dutch.calcStopPrice();
    console.log("calcStopPrice: " + calcStopPrice);
    
    currentStage = await dutch.stage();
    console.log("currentStage: "+ currentStage);

    const investor1Bids = await dutch.bids(investor1);
    const investor2Bids = await dutch.bids(investor2);
    const investor3Bids = await dutch.bids(investor3);

    console.log("bids1: "+ investor1Bids + "  " + "bids2: "+ investor2Bids + "  " + "bids3: "+ investor3Bids );

    assert(investor2Bids.eq(web3.utils.toBN(web3.utils.toWei('2'))));
    assert(investor3Bids.eq(web3.utils.toBN(web3.utils.toWei('5'))));
    assert(investor1Bids.eq(web3.utils.toBN(web3.utils.toWei('0'))));

    // Auction has ended
    await expectRevert(
      dutch.bidRBTC({from: investor1, value: bidAmount}),
      'Contract not in expected stage'
    );
  });

    it('Full flow send bid => end sale at price equilibrium during the block => Partial reimburse => close sale => claim ESOV', async () => {
      let totalReceivedTest = web3.utils.toBN('0');
      let blockNumber = await web3.eth.getBlockNumber();
      console.log("block#: " + blockNumber);  
      let tprice = await dutch.calcTokenPrice.call();
      console.log("t0 price: " + tprice);
    
      let bidAmount = web3.utils.toWei('5');
      
      // Deposit 1: investor3 deposit Rbtc, investor2 deposit RBTC
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
  
      let investor3BalanceBefore = await web3.eth.getBalance(investor3);
      let auctionTotalreceivedBefore = await dutch.totalReceived()
      let walletbtcBefore = await web3.eth.getBalance(sovrynAddress);
    
      console.log("RBTC bid of 5 investor3")
      let tx = await dutch.bidRBTC({from: investor3, value: bidAmount});
      totalReceivedTest = totalReceivedTest.add(web3.utils.toBN(bidAmount));
  
      let investor3BalanceAfter = await web3.eth.getBalance(investor3);
      let auctionTotalreceivedAfter = await dutch.totalReceived()
      let walletbtcAfter = await web3.eth.getBalance(sovrynAddress);
  
      expectEvent(tx, 'BidSubmission', {
        sender: investor3,
        amount: '5000000000000000000'
      });
  
      let gasUsed = await web3.utils.toBN(tx.receipt.gasUsed);
      let gasSpent = web3.utils.toBN(10* gasPrice * gasUsed);
      let bid3WithGas = web3.utils.toBN(bidAmount).add(gasSpent);
      let delta = investor3BalanceBefore -investor3BalanceAfter;
  
      // Add small margin for mismatch in calculation
      assert((delta - bid3WithGas < 5000000) &&  (delta - bid3WithGas > (-5000000) ));
      assert((auctionTotalreceivedAfter - auctionTotalreceivedBefore) ==
        (walletbtcAfter - walletbtcBefore));
        
      let calcStopPrice = await dutch.calcStopPrice();
      console.log("calcStopPrice: " + calcStopPrice);
  
      // Deposit 2: investor2 deposit RBTC
      bidAmount = web3.utils.toWei('2');
      
      blockNumber = await web3.eth.getBlockNumber();
      console.log("block#: " + blockNumber);
      tprice = await dutch.calcTokenPrice.call();
      console.log("t0 price: " + tprice);
     
      if (blockNumber - prevBlockNumber == blockDuration) {
          catchFloorPrice = tprice;
      }
  
      let investor2BalanceBefore = await web3.eth.getBalance(investor2);
       auctionTotalreceivedBefore = await dutch.totalReceived()
       walletbtcBefore = await web3.eth.getBalance(sovrynAddress);
    
      console.log("RBTC bid 0f 2 investor2")
       tx = await dutch.bidRBTC({from: investor2, value: bidAmount});
      totalReceivedTest = totalReceivedTest.add(web3.utils.toBN(bidAmount));
  
      let investor2BalanceAfter = await web3.eth.getBalance(investor2);
       auctionTotalreceivedAfter = await dutch.totalReceived()
       walletbtcAfter = await web3.eth.getBalance(sovrynAddress);
  
      expectEvent(tx, 'BidSubmission', {
        sender: investor2,
        amount: '2000000000000000000'
      });
  
       gasUsed = await web3.utils.toBN(tx.receipt.gasUsed);
       gasSpent = web3.utils.toBN(10* gasPrice * gasUsed);
       let bid2WithGas = web3.utils.toBN(bidAmount).add(gasSpent);
       delta = investor2BalanceBefore -investor2BalanceAfter;
  
      // Add small margin for mismatch in calculation
      assert((delta - bid2WithGas < 5000000) &&  (delta - bid2WithGas > (-5000000) ));
      assert((auctionTotalreceivedAfter - auctionTotalreceivedBefore) ==
        (walletbtcAfter - walletbtcBefore));
        
       calcStopPrice = await dutch.calcStopPrice();
      console.log("calcStopPrice: " + calcStopPrice);
  
      // Deposit 3:  investor2 deposit Rbtc - Partial reimburse
      
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
  
      await time.advanceBlock();
      blockNumber = await web3.eth.getBlockNumber();
      console.log("block#: " + blockNumber); 
      tprice = await dutch.calcTokenPrice.call();
      console.log("price: " + tprice);
      
      currentStage = await dutch.stage();
      console.log("currentStage: "+ currentStage);
      
      let calcPriceFinal = await dutch.finalPrice();
      console.log("calcPriceFinal: " + calcPriceFinal);
  
      await dutch.bidRBTC({from: investor2, value: bidAmount})
  
      calcPriceFinal = await dutch.finalPrice();
      console.log("calcPriceFinal: " + calcPriceFinal);
  
      console.log("totalReceived: " + await dutch.totalReceived());
      calcStopPrice = await dutch.calcStopPrice();
      console.log("calcStopPrice: " + calcStopPrice);
      
      currentStage = await dutch.stage();
      console.log("currentStage: "+ currentStage);
  
      const investor1Bids = await dutch.bids(investor1);
      const investor2Bids = await dutch.bids(investor2);
      const investor3Bids = await dutch.bids(investor3);
  
      console.log("bids1: "+ investor1Bids + "  " + "bids2: "+ investor2Bids + "  " + "bids3: "+ investor3Bids );
  
      assert(investor2Bids.eq(web3.utils.toBN('3000000000002000000')));
      assert(investor3Bids.eq(web3.utils.toBN(web3.utils.toWei('5'))));
      assert(investor1Bids.eq(web3.utils.toBN(web3.utils.toWei('0'))));
  
      // Auction has ended
      await expectRevert(
        dutch.bidRBTC({from: investor1, value: bidAmount}),
        'Contract not in expected stage'
      );
    });
  });
});