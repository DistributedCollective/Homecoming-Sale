//const DutchAuction = artifacts.require("DutchAuction");
//const ESOVToken = artifacts.require("ESOVToken");
const Wbtc = artifacts.require('mocks/WBTC.sol');
const Sbtc = artifacts.require('mocks/SBTC.sol');

const SovrynAddr = '0x87f887d843b06ae9d7d16de8099f4ab9d5da2c62';  // account9 
const esovAdmin = '0xa9da8392e97fa8765b08bdbff6236e8be087958d'; // account8

let dutchAddress = "0x1824Fb64Ea610f681eD255703190dE828050F899";  // only debug address
let ESOVAddress;
let wbtc, sbtc;

const investor1 = '0xd8bc75a79f6d63fe6e1307139d3bfdc0bd090e35';
const investor2 = '0x5fc4d8b1f96a916683954272721cfe96ed5a3953';

module.exports = async function (deployer) {
    const [WBTC, SBTC] = ['WBTC', 'SBTC']
        .map(ticker => web3.utils.fromAscii(ticker));
    
    ([wbtc, sbtc] = await Promise.all([
            Wbtc.new(),
            Sbtc.new()
           ]));
    
    const amount = web3.utils.toWei('2');
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
        };

    