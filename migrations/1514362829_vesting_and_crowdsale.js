var GROVesting = artifacts.require("GROVesting");
var GRO = artifacts.require("GRO");

module.exports = function(deployer, network, accounts) {
    // Use deployer to state migration tasks.
    if (network != "live"){
	var fundingWallet = accounts[0];
	var controlWallet = accounts[1];
	var priceNumerator = 1;
	var startingBlockInput = 1;
	var endBlockInput = 2;
	
	deployer.deploy(GRO, controlWallet, priceNumerator, startingBlockInput, endBlockInput).then(function (){
	    return deployer.deploy(GROVesting, GRO.address, endBlockInput);
	});
    }    
};
