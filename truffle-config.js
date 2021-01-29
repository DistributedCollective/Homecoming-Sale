const HDWalletProvider = require("@truffle/hdwallet-provider");

const fs = require("fs");
const secrets = JSON.parse(
    fs.readFileSync(".secrets").toString().trim()
  );
const testnetSeedPhrase = secrets.seed;
const ProjectId =  secrets.projectId;
/* eslint-disable import/no-extraneous-dependencies */
//require('chai')
//    .use(require('chai-as-promised'))
//    .use(require('chai-bn')(require('bn.js')))
//    .use(require('chai-string'))
 //   .use(require('dirty-chai'))
 //   .expect();

//const Decimal = require('decimal.js');
//Decimal.set({precision: 100, rounding: Decimal.ROUND_DOWN, toExpPos: 40});

//const ganache = require('ganache-core');
/* eslint-enable import/no-extraneous-dependencies */

module.exports = {
    contracts_directory: './contracts',
    contracts_build_directory: './build/contracts',
    test_directory: './test',
    networks: {
        development: {
            host: 'localhost',
            port: 7545,
            network_id: '*',
            gasPrice: 20000000000,
            gas: 6800000
            //provider: ganache.provider({
            //    gasLimit: 6800000,
            //    gasPrice: 20000000000,
            //    default_balance_ether: 10000000000000000000
            //})
        },
        mainnet: {
            //provider: () => new HDWalletProvider(secrets.seed, 'https://public-node.testnet.rsk.co/2.0.1/'),
            //provider: () => new HDWalletProvider(secrets.seed, "https://testnet.sovryn.app/rpc"),
            provider: () => new HDWalletProvider(secrets.seed, "wss://mainnet.sovryn.app/ws"),
            network_id: 30,
              gasPrice: 65000010,
              gas: 3000000,
              networkCheckTimeout: 1e9,
              timeoutBlocks: 500000
        },
        testnet: {
          //provider: () => new HDWalletProvider(secrets.seed, 'https://public-node.testnet.rsk.co/2.0.1/'),
          //provider: () => new HDWalletProvider(secrets.seed, "https://testnet.sovryn.app/rpc"),
          provider: () => new HDWalletProvider(secrets.seedtestnet, "wss://testnet.sovryn.app/ws"),
          network_id: 31,
            //gasPrice: 70000000,
            gasPrice: 65000010,
            //gas: 5900000,
            gas: 3000000,
            networkCheckTimeout: 1e9,
            timeoutBlocks: 500000

        /*    provider: () => new HDWalletProvider({
                mnemonic: {
                    phrase: testnetSeedPhrase,
                  },
                providerOrUrl: 'https://public-node.testnet.rsk.co/2.0.1/',
                // Higher polling interval to check for blocks less frequently
                pollingInterval: 15e3,
              }),
              // Ref: http://developers.rsk.co/rsk/architecture/account-based/#chainid
              network_id: 31,
              gasPrice: 60000000,
              networkCheckTimeout: 1e9,
              timeoutBlocks: 50000,
              // Higher polling interval to check for blocks less frequently
              // during deployment
              deploymentPollingInterval: 15e3,
       */
        },
       // ropsten: {
       //        // provider: () => new HDWalletProvider(testnetSeedPhrase, `https://ropsten.infura.io/v3/${ProjectId}`),
       //        provider: () => new HDWalletProvider(testnetSeedPhrase, `https://ropsten.infura.io/v3/${ProjectId}`),
       //         network_id: 3,       // Ropsten's id
       //         gas: 5500000,        // Ropsten has a lower block limit than mainnet
       //         confirmations: 2,    // # of confs to wait between deployments. (default: 0)
       //         timeoutBlocks: 200,  // # of blocks before a deployment times out  (minimum/default: 50)
    
       // },
        
    },
    plugins: ['solidity-coverage'],
    compilers: {
        solc: {
            version: '0.6.2',
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 200
                }
            }
        }
    },
    mocha: {
        before_timeout: 600000,
        timeout: 600000,
        useColors: true,
        reporter: 'list'
    }
};
