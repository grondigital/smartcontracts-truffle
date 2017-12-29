var GRO = artifacts.require("GRO");

contract('GRO', function(accounts) {
    // migrations will use ganache account 0 by default
    var expectedFundingWallet = accounts[0];
    var controllWalletInput = accounts[1];
    var vestingContractAddress = accounts[2];
    var preSaleAllocationAddress = accounts[3];
    var randomAddress = accounts[4];
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
    contract('allocatePresaletokens', function(accounts) {

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

	// FIXME: Assuming 0 totalSupply
	it('only allows the fundwallet to allocate pre-sale tokens', function() {
	    var amountTokens  = 100;
	    
	    return GRO.deployed()
		.then(function(instance) {
		    var gro = instance;

		    return gro.allocatePresaleTokens(
			preSaleAllocationAddress,
			amountTokens,
			{from: randomAddress})
			.catch(function(error){
			    // Transaction reverted
			})
		    
			.then(function() {
			    return gro.whitelist(randomAddress)
				.then(function(response){
				    assert.equal(false, response);
				});
			})
			.then(function() {
			    return gro.totalSupply()
				.then(function(response) {					    
				    assert.equal(0, response.toNumber());
				});
			});
		});
	});
	
	// TODO: How are bonus tokens amounts determined for the pre-sale period?
	it('allocates pre-sale tokens when using the fundWallet', function() {
	    var amountTokens = 100;
	    var expectedDevTeamAllocation = 66; // 40% of amountTokens is added to total supply
	    // TODO: Follow up on this expectation
	    var expectedTotalSupply = 166;
	    
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

    contract('verifyParticipant', function() {
	it('should add a participant to the whitelist', async function(){
	    // return GRO.deployed()
	    // 	.then(function(instance) {
	    // 	    return instance.verifyParticipant(randomAddress)
	    // 		.then(function() {
	    // 		    return instance.whitelist(randomAddress)
	    // 			.then(function(response){
	    // 			    assert.equal(true, response);
	    // 			});
	    // 		});
	    // 	});

	    let gro = await GRO.deployed();	    
	    await gro.verifyParticipant(randomAddress);
	    let response = await gro.whitelist(randomAddress);
	    assert.equal(response, true);	    
	});
    });

    contract('buy', function() {
	it('should update the balance for the sender\'s address', function(){
	    var wei = web3.toWei(1, "ether"); // ETH - 10,000 GRO by default
	    
	    return GRO.deployed()
		.then(function(instance) {
		    var gro = instance;
		    return  gro.verifyParticipant(randomAddress)
			.then(function() {
			    return gro.currentPrice()
				.then(function(price){
				    var expectedBalance = price.toNumber() * wei;
				    return gro.buy({from: randomAddress, value: wei})
					.then(function(){
					    return gro.balanceOf(randomAddress)
						.then(function(balance) {
						    assert.equal(expectedBalance, balance.toNumber());
						});
					});
				});
			});
		});
	});
    });
});
