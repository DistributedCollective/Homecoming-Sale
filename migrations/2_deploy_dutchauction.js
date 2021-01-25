const DutchAuction = artifacts.require("DutchAuction");
const ESOVToken = artifacts.require("ESOVToken");

const esovAdmin = '0x763e73385c790f2fe2354d877ff98431ee586e4e';  // account9 
const SovrynAddr = '0xfa201a6fccbd9332a49ac71b646be88503dc6696'; // account8

/*const adminWallet = '0xE8276A1680CB970c2334B3201044Ddf7c492F52A';
const NFTs = ['0x78c0D49d003bf0A88EA6dF729B7a2AD133B9Ae25','0x420fECFda0975c49Fd0026f076B302064ED9C6Ff','0xC5452Dbb2E3956C1161cB9C2d6DB53C2b60E7805'];
*/
module.exports = async function (deployer) {
    ESOVTokenInstance = await deployToken(deployer);
    dutch = await deployDutch(deployer);
   // await CSOVTokenInstance.setSaleAdmin(crowdsale.address);
   // console.log(
   //     "Token Balance of crowdsale smart contract: " +
   //      await CSOVTokenInstance.balanceOf(crowdsale.address));
   // crowdsale.start(86400*3, 50000, web3.utils.toWei('0.001', 'ether'), web3.utils.toWei('2000000', 'ether'));
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
    const ceiling = 1000;
    const priceFactor = 2;
    
    console.log("SovrynAddr: " + SovrynAddr + "  " + "ceiling: " + ceiling + "   " + "priceFactor: " + priceFactor)
    await deployer.deploy(DutchAuction,SovrynAddr, ceiling, priceFactor);
    let dutch = await DutchAuction.deployed();
    let dutchAddr = await dutch.address;
    console.log("DutchAuction address: " + dutchAddr);
    return dutch;
}