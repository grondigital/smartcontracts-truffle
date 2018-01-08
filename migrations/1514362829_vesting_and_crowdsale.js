var GROVesting = artifacts.require("GROVesting");
var GRO = artifacts.require("GRO");

module.exports = function(deployer, network, accounts) {
    // Use deployer to state migration tasks.
    if (network != "live"){
	var fundingWallet = accounts[0];
	var controlWallet = accounts[1];
	var priceNumerator = 10000; // 1 ETH * priceNumerator = 10000 GRO

	// #blocks = 6*7*24*60*60/15 = 241920
	var blocksInSixWeeks = 241920;
	var startingBlockInput = web3.eth.blockNumber; // current block number
	var endBlockInput = startingBlockInput + blocksInSixWeeks; // TODO: confirm block values
	
	return deployer.deploy(GRO).then(async function (){
	    let groInstance = await GRO.deployed();
	    await groInstance.initialiseContract(controlWallet, priceNumerator, startingBlockInput, endBlockInput);
	    
	    await deployer.deploy(GROVesting);
	    let vestingInstance = await GROVesting.deployed();
	    await vestingInstance.initialiseContract(GRO.address, endBlockInput);
	    
	});
    }    
};
