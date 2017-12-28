var GRO = artifacts.require("GRO");

contract('GRO', function(accounts) {
    // migrations will use ganache account 0 by default
    var expectedFundingWallet = accounts[0];
    var controllWalletInput = accounts[1];
    var vestingContractAddress = accounts[2];
    var preSaleAllocationAddress = accounts[3];
    var priceNumeratorInput = 1;
    var expectedTokenCap = 950000000 * Math.pow(10, 18);
    
    contract('Construction, getters, setters', function(accounts) {

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
    
    // Redeploy contracts to network
    contract('Pre-sale interactions', function(accounts) {

	it("starts with 0 tokens issued", function() {
	    return GRO.deployed()
		.then(function(instance) {
		    var gro = instance;

		    return gro.totalSupply()
			.then(function(supply) {
			    assert.equal(0, supply.toNumber());
			});
		});
	});
	
	it("sets the vesting contract address", function() {
	    return GRO.deployed()
		.then(function (instance) {
		    var gro = instance;
		    return gro.setVestingContract(vestingContractAddress)
			.then(function() {
			    return gro.vestingContract()
				.then(function(address){				
				    assert.equal(vestingContractAddress, address);
				    // added to whitelist
				    return gro.whitelist(vestingContractAddress)
					.then(function(response){
					    assert.equal(true, response);
					});
				});
			});
		});
	});
	
	// TODO: How are bonus tokens amounts determined for the pre-sale period?
	it('allocates pre-sale tokens when using the fundWallet', function() {
	    var amountTokens = 100;
	    var expectedDevTeamAllocation = 380; // 40% of amountTokens is added to total supply
	    // TODO: Follow up on this expectation
	    var expectedTotalSupply = 480;
	    
	    return GRO.deployed()
		.then(function(instance) {
		    var gro = instance;
		    
		    return gro.balanceOf(vestingContractAddress)
			.then(function(balance) {
			    assert.equal(0, balance.toNumber());
			})
			.then(function(balance) {
			    return gro.allocatePresaleTokens(
				preSaleAllocationAddress,
				amountTokens)			    
				.then(function() {
				    return gro.whitelist(preSaleAllocationAddress)
					.then(function(response){
					    assert.equal(true, response);
					});
				})
				.then(function() {
				    return gro.totalSupply()
					.then(function(response) {					    
					    assert.equal(expectedTotalSupply, response.toNumber());
					});
				});	
			});		   		    
		});
	});
    });
});
