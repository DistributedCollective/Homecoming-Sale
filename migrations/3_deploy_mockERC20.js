//const DutchAuction = artifacts.require("DutchAuction");
//const ESOVToken = artifacts.require("ESOVToken");
const Wbtc = artifacts.require('mocks/WBTC.sol');
const Sbtc = artifacts.require('mocks/SBTC.sol');

const esovAdmin = '0x763e73385c790f2fe2354d877ff98431ee586e4e';  // account9 
const SovrynAddr = '0xfa201a6fccbd9332a49ac71b646be88503dc6696'; // account8

let dutchAddress = "0x1824Fb64Ea610f681eD255703190dE828050F899";  // only debug address
let ESOVAddress;
let wbtc, sbtc;

const investor1 = '0xe04c7301eb08b4cba478a2eaee48dbea7a9138dd';
const investor2 = '0xd428b98b65f1f607ccffd5428de0b2b5fb7d0219';

module.exports = async function (deployer) {
    const [WBTC, SBTC] = ['WBTC', 'SBTC']
        .map(ticker => web3.utils.fromAscii(ticker));
    
    ([wbtc, sbtc] = await Promise.all([
            Wbtc.new(),
            Sbtc.new()
           ]));
    
    const amount = web3.utils.toWei('2');
  // Declare a function that:
  // 1. Faucet the trader account
  const seedTokenBalance = async (token, investor) => {
    await token.faucet(investor, amount, { from: esovAdmin });
    //    let bal = 
     //   console.log("investor1 SBTC balance: " + await token.balanceOf(investor1));
     //   console.log(token + investor + )
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

    