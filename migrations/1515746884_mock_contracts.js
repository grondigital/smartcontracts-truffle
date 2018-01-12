// This only used in development to test Mock contracts
var GROVestingMock = artifacts.require("GROVestingMock");
var GROMock = artifacts.require("GROMock");

module.exports = function(deployer, network, accounts) {
    // Use deployer to state migration tasks.
    if (network == "development"){
	// current timestamp
	var _now = Math.round(+new Date()/1000);
	var _currentBlock = web3.eth.blockNumber; // current block number
	var fundingWallet = accounts[0];
	var controlWallet = accounts[1];
	var priceNumerator = 10000; // 1 ETH * priceNumerator = 10000 GRO

	// #blocks = 6*7*24*60*60/15 = 241920
	var blocksInSixWeeks = 241920;
	var startingBlockInput = web3.eth.blockNumber; // current block number
	var endBlockInput = startingBlockInput + blocksInSixWeeks; // TODO: confirm block values
	
	return deployer.deploy(GROMock, _now, _currentBlock).then(async function (){
	    let groInstance = await GROMock.deployed();
	    await groInstance.initialiseContract(controlWallet, priceNumerator, startingBlockInput, endBlockInput);
	    
	    await deployer.deploy(GROVestingMock, _now, _currentBlock);
	    let vestingInstance = await GROVestingMock.deployed();
	    await vestingInstance.initialiseContract(GROMock.address, endBlockInput);

	    await groInstance.setVestingContract(GROVestingMock.address);	    
	    
	});
    }    
};
