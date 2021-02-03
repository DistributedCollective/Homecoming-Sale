const DutchAuction = artifacts.require("DutchAuction");
const ESOVToken = artifacts.require("ESOVToken");

const esovAdmin = '0x763e73385c790f2fe2354d877ff98431ee586e4e';  // account9 
const SovrynAddr = '0xfa201a6fccbd9332a49ac71b646be88503dc6696'; // account8

let dutchAddr;
let ESOVAddress;

module.exports = async function (deployer) {
    ESOVTokenInstance = await deployToken(deployer);
    dutch = await deployDutch(deployer);
    await ESOVTokenInstance.setSaleAdmin(dutch.address, {from: esovAdmin});
    console.log(
        "Token Balance of crowdsale smart contract: " +
         await ESOVTokenInstance.balanceOf(dutch.address));
    await dutch.setup(ESOVAddress, esovAdmin);
    console.log("dutch owner: " + await dutch.owner());
    console.log("ESOV owner: " + await ESOVTokenInstance.owner());
}

async function deployToken(deployer){
    const totaltoken = web3.utils.toWei('2000000');
    await deployer.deploy(ESOVToken, totaltoken, esovAdmin);
    let ESOVTokenInstance = await ESOVToken.deployed();
    ESOVAddress = await ESOVTokenInstance.address;
    console.log("ESOVAddress address: " + ESOVAddress);
    return ESOVTokenInstance;
}

async function deployDutch(deployer){

/// Mainnet setup: Starts at 10000sats, reaches 3000sats at 20K blocks (~week)
// const ceiling = web3.utils.toWei('200');
// const priceFactorNumerator = '8572';
// const priceFactorDenominator = '10000';
// const priceConst = '8572';
// const blockDuration = 20000;
// const maxBid = web3.utils.toWei('1');

/// Price param setup adjusted to start price @10000 sats per ESOV token,
/// and reach floor price @3000 sats after 14 blocks
    const ceiling = web3.utils.toWei('200');
    const priceFactorNumerator = '6';
    const priceFactorDenominator = '10000';
    const priceConst = '6';
    const blockDuration = 14;
    const maxBid = web3.utils.toWei('1');

    console.log(
     "SovrynAddr: " + SovrynAddr + "  " +
     "ceiling: " + ceiling + "   " + 
     "priceFactorNumerator: " + priceFactorNumerator + "   " +
     "priceFactorDenominator: " + priceFactorDenominator + "   " +
     "priceConst: " + priceConst + "   " +
     "blockDuration: " + blockDuration + "   " +
     "maxBid: " + maxBid);

    await deployer.deploy(
        DutchAuction,
        SovrynAddr,
        ceiling,
        priceFactorNumerator,
        priceFactorDenominator,
        priceConst,
        blockDuration,
        maxBid);
    let dutch = await DutchAuction.deployed();
    dutchAddr = await dutch.address;
    console.log("DutchAuction address: " + dutchAddr);
    return dutch;
}