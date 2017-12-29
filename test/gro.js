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

	it('returns the correct fundWallet address', async function(){
	    let gro = await GRO.deployed();	    
	    let address = await gro.fundWallet();

	    assert.equal(address, expectedFundingWallet);
	});
	
	it("sets the correct tokenCap", async function() {
	    let gro = await GRO.deployed();
	    let cap = await gro.tokenCap();

	    assert.equal(expectedTokenCap, cap);
	});
	

	it("updates the price", async function() {
	    let expectedPrice = 3;
	    let gro = await GRO.deployed();
	    
	    await gro.updatePrice(expectedPrice);
	    let price = await gro.currentPrice();

	    assert.equal(price.toNumber(), expectedPrice);
	});
    });
    
    // Redeploy contracts to network
    contract('allocatePresaletokens', function(accounts) {

	it("starts with 0 tokens issued", async function() {
	    let gro = await GRO.deployed();
	    let supply = await gro.totalSupply();

	    assert.equal(supply, 0);

	    await gro.setVestingContract(vestingContractAddress);

	    let address = await gro.vestingContract();
	    assert.equal(vestingContractAddress, address);

	    let status = await gro.whitelist(vestingContractAddress);
	    assert.equal(status, true);	    
	});

	it('only allows the fundwallet to allocate pre-sale tokens', async function() {
	    // redeploy to ensure 0 totalSupply
	    let gro = await GRO.deployed();

	    try {
		let amountTokens  = 100;
		await gro.allocatePresaleTokens(preSaleAllocationAddress, amountTokens, {from: randomAddress});
	    }
	    catch (error) {
		//error thrown - transaction reverted
	    }

	    let status = await gro.whitelist(randomAddress);
	    assert.equal(status, false);

	    let supply = await gro.totalSupply();
	    assert.equal(supply, 0);	    
	});
	
	// TODO: How are bonus tokens amounts determined for the pre-sale period?
	it('allocates pre-sale tokens when using the fundWallet', async function() {
	    // For a max supply of 950M - 570M pub, 380M dev allocation	    
	    let amountTokens = 285000000; // 50% the amount of public tokens
	    let expectedDevTeamAllocation = 190000000; // 50% of dev allocation expected to be allocated
	    let expectedTotalSupply = amountTokens + expectedDevTeamAllocation;

	    const gro = await GRO.deployed();
	    await gro.setVestingContract(vestingContractAddress);
	    
	    // initial balances
	    let devBalance = await gro.balanceOf(vestingContractAddress);
	    let participantBalance = await gro.balanceOf(preSaleAllocationAddress);
	    let supply = await gro.totalSupply();
	    
	    assert.equal(devBalance.toNumber(), 0);
	    assert.equal(participantBalance.toNumber(), 0);
	    assert.equal(supply, 0);

	    // called from accounts[0]
	    await gro.allocatePresaleTokens(preSaleAllocationAddress, amountTokens);
	    let status = await gro.whitelist(preSaleAllocationAddress);
	    assert.equal(status, true, "Participant should be whitelisted");

	    // post transaction balances
	    devBalance = await gro.balanceOf(vestingContractAddress);
	    participantBalance = await gro.balanceOf(preSaleAllocationAddress);
	    supply = await gro.totalSupply();
	    
	    assert.equal(participantBalance.toNumber(), amountTokens, "Participant balance should be updated");	    
	    assert.equal(devBalance.toNumber(), expectedDevTeamAllocation, "Dev team should receive allocation amount");
	    assert.equal(supply.toNumber(), expectedTotalSupply, "Total supply should be updated with both allocations");
	    
	});

    });

    contract('verifyParticipant', function() {
	it('should add a participant to the whitelist', async function() {
	    let gro = await GRO.deployed();	    
	    await gro.verifyParticipant(randomAddress);
	    let response = await gro.whitelist(randomAddress);

	    assert.equal(response, true);	    
	});
    });

    contract('buy', function() {
	it('should update the balance for the sender', async function(){
	    let wei = web3.toWei(1, "ether"); 

	    let gro = await GRO.deployed();
	    await gro.setVestingContract(vestingContractAddress);

	    // has to be whitelisted
	    await gro.verifyParticipant(randomAddress);
	    await gro.buy({from: randomAddress, value: wei});
	    
	    let price = await gro.currentPrice();
	    let balanceInWei = await gro.balanceOf(randomAddress);
	    let balanceInGro = web3.fromWei(balanceInWei.toNumber(), "ether") * 10000; // 1 ETH = 10000 GRO
	    
	    assert.equal(price.toNumber(), 1);
	    assert.equal(balanceInGro, 10000);	    
	});
    });
});
