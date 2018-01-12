# GRON Digital Smart Contracts

## Introduction

This repo contains a truffle framework project and GRON digital smart contracts. 

## Setup / pre-requisites

1. Install/build [Ganache](https://github.com/trufflesuite/ganache/releases)
2. Install [Truffle](http://truffleframework.com) - be sure version `4.0.4` or above is installed.
3. Install [Node](https://nodejs.org/en/) version `8` and above.

```shell
brew install node # mac os only 
npm install -g truffle
npm install -g ethereumjs-testrpc

#
testrpc # start ganache / test-rpc

# in a seprate terminal
truffle compile # compiles smart contracts
truffle migrate # deploys smart contracts to test-rpc
truffle test # run unit tests

```

## Deployment via MyEtherWallet


MyEtherWallet deployment enables deployment without the need for running and syncrhonising a network node. Instead, contract deployments are handled by submitting a REST API call to a community node such as EtherScan.io. 

The following steps describe the manual deployment steps:

1. Preparation: 
   1. Create a funding wallet and make sure it has sufficient ether for contract  deployments
   2. Create a control wallet
   3. Run `truffle compile` to build the GRO and GROVesting contracts. This
      will generate files json files that contain ABI and byteCode data for each
      contract.
   4. Calculate the priceNumerator (10000)
   5. Calculate the starting block for the funding rounds
   6. Calculate the end block for the funding rounds
2. Deployment steps (using the funding wallet):
   1. Select the appropriate network in the top right of the MyEtherWallet app
   2. Deploy the GRO contract using the GRO contract bytecode, found in the `GRO.json` build file.
   3. Copy the GRO deployed contract address
   4. Use the GRO contract ABI, found in `GRO.json`, to call the GRO initialiseContract method
   5. Deploy the Vesting contract using the Vesting contract bytecode found in the `GROVesting.json` build file.
   6. Copy the Vesting deployed contract address
   7. Use the Vesting contract ABI, found ing `GROVesting.json`, to call the initialiseContract method
   8. Call the `setVestingContract` method in the GRO contract using the new Vesting contract address

