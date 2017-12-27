var GRO = artifacts.require("GRO");

contract('GRO', function(accounts) {

    var expectedFundingWallet = accounts[0];
    var controllWalletInput = accounts[1];
    var newVestingContractAddress = accounts[2];
    var priceNumeratorInput = 1;
    var startBlockInput = 1;
    var endBlockInput = 2;
    var expectedTokenCap = 950000000 * Math.pow(10, 18);

    it('returns the correct fundWallet address', function(){
	return GRO.deployed().then(function (instance) {
	    return instance.fundWallet()
		.then(function (address) {
		    assert.equal(expectedFundingWallet, address);
		});
	});
    });
    
    it("sets the correct tokenCap", function() {
	return  GRO.deployed().then(function(instance) {
	    return instance.tokenCap().then(function(tokenCap) {
		assert.equal(expectedTokenCap, tokenCap.toNumber());
	    });
	}); 	
    });
    
    it("updates the vesting contract address", function() {
	return GRO.deployed()
	    .then(function (instance) {
		var gro = instance;
		return gro.setVestingContract(newVestingContractAddress)
		    .then(function() {
			return gro.vestingContract()
			    .then(function(address){				
				assert.equal(newVestingContractAddress, address);
				// added to whitelist
				return gro.whitelist(newVestingContractAddress).then(function(response){
				    assert.equal(true, response);
				});
			    });
		    });
	    });
    });

    it("updates the price", function() {
	var newPrice = 3;
	return  GRO.deployed().then(function(instance) {
	    return instance.updatePrice(newPrice).then(function() {
		instance.currentPrice().then(function(price) {
		    assert.equal(newPrice, price);
		});
	    });
	});
    });

});
