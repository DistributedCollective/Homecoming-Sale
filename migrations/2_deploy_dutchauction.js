const DutchAuction = artifacts.require("DutchAuction");
const ESOVToken = artifacts.require("ESOVToken");

const SovrynAddr = '0x87f887d843b06ae9d7d16de8099f4ab9d5da2c62';  // account9 
const esovAdmin = '0xa9da8392e97fa8765b08bdbff6236e8be087958d'; // account8

let dutchAddr;
let ESOVAddress;

module.exports = async function (deployer) {
    ESOVTokenInstance = await deployToken(deployer);
    dutch = await deployDutch(deployer);
    //await ESOVTokenInstance.setSaleAdmin(dutch.address, {from: esovAdmin});
    let totalBal = await ESOVTokenInstance.balanceOf(ESOVTokenInstance.address);
    await ESOVTokenInstance.transfer(dutch.address, totalBal, {from: esovAdmin});

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
/// Price param setup adjusted to start price @10000 sats per ESOV token,
/// and reach floor price @3000 sats after 14 blocks
    const ceiling = web3.utils.toWei('200');
    const priceFactorNumerator = '6';
    const priceFactorDenominator = '10000';
    const priceConst = '6';
    const blockDuration = 14;

    console.log(
     "SovrynAddr: " + SovrynAddr + "  " +
     "ceiling: " + ceiling + "   " + 
     "priceFactorNumerator: " + priceFactorNumerator + "   " +
     "priceFactorDenominator: " + priceFactorDenominator + "   " +
     "priceConst: " + priceConst + "   " +
     "blockDuration: " + blockDuration);
    await deployer.deploy(
        DutchAuction,
        SovrynAddr,
        ceiling,
        priceFactorNumerator,
        priceFactorDenominator,
        priceConst,
        blockDuration);
    let dutch = await DutchAuction.deployed();
    dutchAddr = await dutch.address;
    console.log("DutchAuction address: " + dutchAddr);
    return dutch;
}