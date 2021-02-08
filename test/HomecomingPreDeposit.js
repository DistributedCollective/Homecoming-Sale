const {balance, BN, constants, ether, expectEvent, expectRevert, send, time} = require('@openzeppelin/test-helpers');
const { assert } = require('console');


const DutchAuction = artifacts.require('DutchAuction.sol');
const ESOVToken = artifacts.require('ESOVToken.sol');
const Wbtc = artifacts.require('mocks/WBTC.sol');
const Sbtc = artifacts.require('mocks/SBTC.sol');
const HomecomingPreDeposit = artifacts.require("HomecomingPreDeposit");


contract("HomecomingPreDeposit", async (accounts) => {
    let dutch, preDeposit, token, tokenAddr, gasPrice, wbtc, sbtc, dutchAddress, wbtcAddr, sbtcAddr, userLength, tx;

    const [WBTC, SBTC] = ['WBTC', 'SBTC']
        .map(ticker => web3.utils.fromAscii(ticker));

    const totalSupply = web3.utils.toWei('2000000');

    const blockDuration = 14;

    const ceiling = web3.utils.toWei('200');  // 2.5
    const priceFactorNumerator = '6';
    const priceFactorDenominator = '10000';
    const priceConst = '6';
    const maxBid = web3.utils.toWei('100');

    const investor1 = accounts[1];
    const investor2 = accounts[2];
    const investor3 = accounts[3];

    let owner = accounts[0]; 
    console.log("Owner: " + owner);

    let sovrynAddress = accounts[8];
    let esovAdmin = accounts[9];

    beforeEach(async () => {
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
            maxBid,
            { from: owner });
        dutchAddress = await dutch.address;

        await token.setSaleAdmin(dutchAddress, {from: esovAdmin});

        ([wbtc, sbtc] = await Promise.all([
            Wbtc.new(),
            Sbtc.new()
        ]));

        //await dutch.addToken([WBTC, SBTC], [wbtc.address, sbtc.address], { from: owner });
        await dutch.addToken([wbtc.address, sbtc.address], { from: owner });
        await dutch.setup(tokenAddr, esovAdmin, { from: owner });

        wbtcAddr = wbtc.address;
        sbtcAddr = sbtc.address;

        preDeposit = await HomecomingPreDeposit.new(dutchAddress);
        
        // seed amount per investor per ERC20-BTC
        const amount = web3.utils.toWei('200');
        // seedTokenBalance()
        // 1. Faucet the trader account
        // 2. Approve DutchAuction SC for token transfer.
        const seedTokenBalance = async (token, investor) => {
            await token.faucet(investor, amount, { from: esovAdmin });
        
            await token.approve(
                preDeposit.address,
                amount,
                {from: investor}
                );
        };
        // Call the seedTokenBalance function
        userLength = 6;
        for (i = 1; i <= userLength; i++) {
            await Promise.all(
                [wbtc, sbtc].map(
                    token => seedTokenBalance(token, accounts[i])
                )
            );

        }
    });
 
    it("Should succeed to set auction contract", async () => {
        tx = await preDeposit.setAuctionContract(accounts[10], {from:owner});
        expectEvent(tx, "SetAuctionContract", {newAuctionContract:accounts[10]});
        assert(await preDeposit.auctionContract() === accounts[10]);
    });
  
    it("Should succeed to deposit", async () => {
        tx = await preDeposit.deposit(wbtc.address, web3.utils.toWei('1'), {from:investor1});
        expectEvent(tx, "Deposit", {token:wbtc.address, user:investor1, amount:web3.utils.toWei('1')});
        assert((await preDeposit.investments(wbtc.address, investor1)).toString() === web3.utils.toWei('1'));

        tx = await preDeposit.deposit(wbtc.address, web3.utils.toWei('0.5'), {from:investor2});
        expectEvent(tx, "Deposit", {token:wbtc.address, user:investor2, amount:web3.utils.toWei('0.5')});
        assert((await preDeposit.investments(wbtc.address, investor2)).toString() === web3.utils.toWei('0.5'));

        tx = await preDeposit.deposit(wbtc.address, web3.utils.toWei('0.5'), {from:investor1});
        expectEvent(tx, "Deposit", {token:wbtc.address, user:investor1, amount:web3.utils.toWei('0.5')});
        assert((await preDeposit.investments(wbtc.address, investor1)).toString() === web3.utils.toWei('1.5'));
    });
 
    it("Should succeed to withdraw", async () => {
        await preDeposit.deposit(wbtc.address, web3.utils.toWei('1'), {from:investor1});
        await preDeposit.deposit(wbtc.address, web3.utils.toWei('0.5'), {from:investor2});
        await preDeposit.deposit(wbtc.address, web3.utils.toWei('0.5'), {from:investor1});

        tx = await preDeposit.withdraw(wbtc.address, web3.utils.toWei('1'), {from:investor1});
        expectEvent(tx, "Withdraw", {token:wbtc.address, user:investor1, amount:web3.utils.toWei('1')});
        assert((await preDeposit.investments(wbtc.address, investor1)).toString() === web3.utils.toWei('0.5'));

        tx = await preDeposit.withdraw(wbtc.address, web3.utils.toWei('0.5'), {from:investor2});
        expectEvent(tx, "Withdraw", {token:wbtc.address, user:investor2, amount:web3.utils.toWei('0.5')});
        assert((await preDeposit.investments(wbtc.address, investor2)).toString() === web3.utils.toWei('0'));

        tx = await preDeposit.withdraw(wbtc.address, web3.utils.toWei('0.5'), {from:investor1});
        expectEvent(tx, "Withdraw", {token:wbtc.address, user:investor1, amount:web3.utils.toWei('0.5')});
        assert((await preDeposit.investments(wbtc.address, investor1)).toString() === web3.utils.toWei('0'));
    });
  
    it("Should succeed to move to auction", async () => {
        for (i = 1; i < userLength; i++) {
            await preDeposit.deposit(wbtc.address, web3.utils.toWei(i.toString()), {from:accounts[i]});
            await preDeposit.deposit(sbtc.address, web3.utils.toWei((i * 2).toString()), {from:accounts[i]});
        }

        await dutch.startAuction({ from: esovAdmin });
        console.log(" DutchAuction owner: " + await dutch.owner());
        currentStage =await dutch.stage();
        assert(currentStage.toNumber() === 2);
        console.log(currentStage.toNumber());

        console.log('amountOfGas', await preDeposit.moveToAuction.estimateGas(wbtc.address));
        tx = await preDeposit.moveToAuction(wbtc.address);
        expectEvent(tx, "MoveToAuction", {token:wbtc.address, lastProcessed:await preDeposit.lastProcessed(wbtc.address)});
        console.log("lastProcessed:", (await preDeposit.lastProcessed(wbtc.address)).toString());

        for (i = 1; i < userLength; i++) {
            console.log(`account ${i} WBTC balance:` + await wbtc.balanceOf(accounts[i]));
        }

        console.log("total received: "+ await dutch.totalReceived());      
        console.log("total WBTC sent to wallet: " + await wbtc.balanceOf(sovrynAddress));
    });

});