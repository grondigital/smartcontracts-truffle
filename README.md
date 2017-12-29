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


