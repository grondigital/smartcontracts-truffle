// Used to test time and block number  dependent code
var GRO = artifacts.require("GROMock");

contract('GRO', function(accounts) {
    var expectedFundingWallet = accounts[0];
    var expectedControlWallet= accounts[1];    
    var randomAddress = accounts[4];
    var vestingContractAddress = accounts[2];
    var precision = Math.pow(10, 18);
    contract('initial state', function(accounts) {

	it('returns the correct fundWallet address', async function(){
	    let gro = await GRO.deployed();	    
	    let address = await gro.fundWallet();
	    assert.equal(address, expectedFundingWallet);
	});
	
	it('returns the correct control address', async function(){
	    let gro = await GRO.deployed();	    
	    let address = await gro.controlWallet();
	    assert.equal(address, expectedControlWallet);
	});
    });

    contract('requestWithdrawal', function(accounts) {
	it('refuses request before funding end block', async function(){
	    let amountTokens = 100;
	    let expectedBalance = 100;
	    let participant = randomAddress;
	    let txnHash = '0xsomerandomhash';

	    const gro = await GRO.deployed();
	    
	    // initial balances
	    let participantBalance = await gro.balanceOf(participant);	    
	    assert.equal(participantBalance.toNumber(), 0);
	    await gro.allocatePresaleTokens(participant, participant, amountTokens, txnHash);

	    let fundingEndBlock = await gro.fundingEndBlock();
	    assert.isBelow(web3.eth.blockNumber, fundingEndBlock);
	    
	    // post transaction balances
	    participantBalance = await gro.balanceOf(participant);	    
	    assert.equal(participantBalance.toNumber(), expectedBalance * precision);

	    try {
		await gro.requestWithdrawal(amountTokens);
	    }
	    catch (error) {
		//error thrown - transaction reverted
	    }

	    // should not create a withdraw request
	    let withDrawRequest = await gro.withdrawals(participant);

	    assert.equal(withDrawRequest[0].toNumber(), 0);
	    assert.equal(withDrawRequest[1].toNumber(), 0);
	    assert.equal(participantBalance.toNumber(), expectedBalance * precision);
	});


	it('allows request after funding end block', async function(){
	    let amountTokens = 100;
	    let expectedBalance = 100;
	    let participant = expectedFundingWallet;
	    let txnHash = '0xsomerandomhash';
	    
	    const gro = await GRO.deployed();
	    
	    const vestingContract = await gro.vestingContract();

	    // initial balances
	    await gro.allocatePresaleTokens(participant, participant, amountTokens, txnHash);
	    let participantBalance = await gro.balanceOf(participant);	    
	    assert.equal(participantBalance.toNumber(), expectedBalance * precision);
	    
	    // post transaction balances
	    participantBalance = await gro.balanceOf(participant);	    
	    assert.equal(participantBalance.toNumber(), expectedBalance * precision);

	    let fundingEndBlock = await gro.fundingEndBlock();
	    assert.isBelow(web3.eth.blockNumber, fundingEndBlock);

	    // mock current block value in contract
	    await gro.changeBlock(fundingEndBlock + 1);
	    let currentBlock = await gro._block();
	    assert(currentBlock, fundingEndBlock + 1);
	    await gro.requestWithdrawal(100, {from: participant});

	    // should now  create a withdraw request
	    let withDrawRequest = await gro.withdrawals(participant);

	    assert.equal(withDrawRequest[0].toNumber(), 100); // amount of tokens
	    assert.isAbove(withDrawRequest[1].toNumber(), 0); //timestamp

	    
	});
    });

   contract('withDraw', function(accounts) {
	
	it("it should withdraw a specified number of tokens", async function() {
	    let amountTokens = 10000;
	    let expectedBalance = 10000 * precision;
	    let participant = randomAddress;
	    let txnHash = '0xsomerandomhash';
	    let wei = web3.toWei(5, "ether");
	    
	    const gro = await GRO.deployed();
	    await gro.setVestingContract(vestingContractAddress);

	    await gro.verifyParticipant(randomAddress);
	    // initial balances
	    let participantBalance = await gro.balanceOf(randomAddress);	    
	    assert.equal(participantBalance.toNumber(), 0);
	    let fundingWalletBalance = await gro.balanceOf(expectedFundingWallet);
	    assert.equal(fundingWalletBalance.toNumber(), 0);
	    
	    await gro.allocatePresaleTokens(randomAddress, randomAddress, amountTokens, txnHash);
	    // post transaction balances
	    participantBalance = await gro.balanceOf(randomAddress);	    
	    assert.equal(participantBalance.toNumber(), expectedBalance);
	    
	    assert.equal((await web3.eth.getBalance(gro.address)).toNumber(), 0, "Contract's ether balance");
	    await gro.addLiquidity({value: wei});
	    assert.equal((await web3.eth.getBalance(gro.address)).toNumber(), 5 * precision, "Contract's ether balance");

	    let startBalance = (await web3.eth.getBalance(randomAddress)).toNumber();
	    
	    let fundingEndBlock = await gro.fundingEndBlock();
	    assert.isBelow(web3.eth.blockNumber, fundingEndBlock);

	    await gro.updatePrice(10000);

	    // mock current block value in contract
	    await gro.changeBlock(fundingEndBlock + 1);
	    let currentBlock = await gro._block();
	    await gro.enableTrading();
	    assert(currentBlock, fundingEndBlock + 1);

	    await gro.requestWithdrawal(3000 * precision, {from: randomAddress});
	    await gro.withdraw({from: randomAddress});

	    // balance reduced by 3000 tokens
	    participantBalance = await gro.balanceOf(randomAddress);
	    fundingWalletBalance = await gro.balanceOf(expectedFundingWallet);
	    assert.equal(participantBalance.toNumber(), 7000 * precision);
	    assert.equal(fundingWalletBalance.toNumber(), 3000 * precision);
	    
	});
   });

       contract('checkWithDrawValue', function(accounts) {
	
	it("it should return the ether value of a specified token amount", async function() {
	    let amountTokens = 10000;
	    let expectedBalance = 1 * precision;
	    let participant = randomAddress;
	    let txnHash = "0x-"; // no bonus	    
	    let wei = web3.toWei(5, "ether");
	    
	    const gro = await GRO.deployed();
	    await gro.setVestingContract(vestingContractAddress);

	    await gro.verifyParticipant(participant);
	    await gro.allocatePresaleTokens(participant, participant, amountTokens, txnHash);
	    // initial balances
	    await gro.addLiquidity({value: wei});
	    let withDrawValue = await gro.checkWithdrawValue(10000 * precision, {from: participant});
	    
	    assert.equal(withDrawValue.toNumber(), 1 * precision); // ether amount	    
	});
    });
    
    contract('buy', function() {
	it('allocate lottery bonus', async function(){
	    let wei = web3.toWei(1, "ether"); 

	    let gro = await GRO.deployed();
	    await gro.setVestingContract(vestingContractAddress);

	    // update the funding start and end blocks with convenient numbers
	    await gro.changeBlock(1);
	    await gro.updateFundingStartBlock(100);
	    await gro.updateFundingEndBlock(301920); // ICO Numerator
	    await gro.changeBlock(251110); // last funding round least significant digit is 0
	    // has to be whitelisted
	    await gro.verifyParticipant(randomAddress);
	    await gro.buy({from: randomAddress, value: wei});
	    
	    let price = await gro.icoNumeratorPrice();
	    // GRO contract stores balances in GRO
	    let balanceInGro = (await gro.balanceOf(randomAddress)).toNumber() / precision;
	    let balanceInEther = balanceInGro / 10000; // 1 ETH = 10000 GRO
	    
	    assert.equal(price.toNumber(), 10000, "Price should be GRO numerator value");
	    assert.equal(balanceInEther, 1.1, "Ether  should match amount sent in buy command");
	    assert.equal(balanceInGro, 11000, "Ether to GRO conversion");
	});
    });

    contract('buy', function() {
	it("won't allocate lottery bonus", async function(){
	    let wei = web3.toWei(1, "ether"); 

	    let gro = await GRO.deployed();
	    await gro.setVestingContract(vestingContractAddress);

	    //await gro.changeMinAmount(wei);

	    // update the funding start and end blocks with convenient numbers
	    await gro.changeBlock(1);
	    await gro.updateFundingStartBlock(100);
	    await gro.updateFundingEndBlock(301920); // ICO Numerator
	    await gro.changeBlock(251111); // last funding round least significant digit is 0
	    // has to be whitelisted
	    await gro.verifyParticipant(randomAddress);
	    await gro.buy({from: randomAddress, value: wei});
	    
	    let price = await gro.icoNumeratorPrice();
	    // GRO contract stores balances in GRO
	    let balanceInGro = (await gro.balanceOf(randomAddress)).toNumber() / precision;
	    let balanceInEther = balanceInGro / 10000; // 1 ETH = 10000 GRO
	    
	    assert.equal(price.toNumber(), 10000, "Price should be GRO numerator value");
	    assert.equal(balanceInEther, 1, "Ether  should match amount sent in buy command");
	    assert.equal(balanceInGro, 10000, "Ether to GRO conversion");
	});

    });
    
    contract('buy', function() {

	it("allocate 30% bonus + lottery", async function(){
	    let wei = web3.toWei(1, "ether"); 

	    let gro = await GRO.deployed();
	    await gro.setVestingContract(vestingContractAddress);

	    // update the funding start and end blocks with convenient numbers
	    await gro.changeBlock(1);
	    await gro.updateFundingStartBlock(100);
	    await gro.updateFundingEndBlock(301920); // ICO Numerator
	    await gro.changeBlock(80640 - 10); // first round - ends in 30
	    // has to be whitelisted
	    await gro.verifyParticipant(randomAddress);
	    await gro.buy({from: randomAddress, value: wei});
	    
	    let price = await gro.icoNumeratorPrice();
	    // GRO contract stores balances in GRO
	    let balanceInGro = (await gro.balanceOf(randomAddress)).toNumber() / precision;
	    
	    assert.equal(price.toNumber(), 13000, "Price should be GRO numerator value");
	    assert.equal(balanceInGro, 14000, "Base + Bonus + Lottery");
	});
    });

    contract('ico rounds', function() {

	contract('round 1', function() {
	    it("allocate 30% bonus", async function(){
		let wei = web3.toWei(1, "ether"); 

		let gro = await GRO.deployed();
		await gro.setVestingContract(vestingContractAddress);

		// update the funding start and end blocks with convenient numbers
		await gro.changeBlock(1);
		await gro.updateFundingStartBlock(100);
		await gro.updateFundingEndBlock(301920); // ICO Numerator
		await gro.changeBlock(80640 - 1); // first round
		// has to be whitelisted
		await gro.verifyParticipant(randomAddress);
		await gro.buy({from: randomAddress, value: wei});
		
		let price = await gro.icoNumeratorPrice();
		// GRO contract stores balances in GRO
		let balanceInGro = (await gro.balanceOf(randomAddress)).toNumber() / precision;
		
		assert.equal(price.toNumber(), 13000, "Price should be GRO numerator value");
		assert.equal(balanceInGro, 13000, "Ether to GRO conversion");
	    });
	});


	contract('round 2', function() {
	    it("allocate 20% bonus", async function(){
		let wei = web3.toWei(1, "ether"); 

		let gro = await GRO.deployed();
		await gro.setVestingContract(vestingContractAddress);

		// update the funding start and end blocks with convenient numbers
		await gro.changeBlock(1);
		await gro.updateFundingStartBlock(100);
		await gro.updateFundingEndBlock(501920); // ICO Numerator
		await gro.changeBlock(161280 - 1); // second round
		// has to be whitelisted
		await gro.verifyParticipant(randomAddress);
		await gro.buy({from: randomAddress, value: wei});
		
		let price = await gro.icoNumeratorPrice();
		// GRO contract stores balances in GRO
		let balanceInGro = (await gro.balanceOf(randomAddress)).toNumber() / precision;
		
		assert.equal(price.toNumber(), 12000, "Price should be GRO numerator value");
		assert.equal(balanceInGro, 12000, "Ether to GRO conversion");
	    });
	});


	contract('round 3', function() {
	    it("allocate 10% bonus", async function(){
		let wei = web3.toWei(1, "ether"); 

		let gro = await GRO.deployed();
		await gro.setVestingContract(vestingContractAddress);

		// update the funding start and end blocks with convenient numbers
		await gro.changeBlock(1);
		await gro.updateFundingStartBlock(100);
		await gro.updateFundingEndBlock(501920); // ICO Numerator
		await gro.changeBlock(241920 - 1); // third round
		// has to be whitelisted
		await gro.verifyParticipant(randomAddress);
		await gro.buy({from: randomAddress, value: wei});
		
		let price = await gro.icoNumeratorPrice();
		// GRO contract stores balances in GRO
		let balanceInGro = (await gro.balanceOf(randomAddress)).toNumber() / precision;
		
		assert.equal(price.toNumber(), 11000, "Price should be GRO numerator value");
		assert.equal(balanceInGro, 11000, "Ether to GRO conversion");
	    });
	});

	contract('round 4', function() {
	    it("allocate no bonus", async function(){
		let wei = web3.toWei(1, "ether"); 

		let gro = await GRO.deployed();
		await gro.setVestingContract(vestingContractAddress);

		// update the funding start and end blocks with convenient numbers
		await gro.changeBlock(1);
		await gro.updateFundingStartBlock(100);
		await gro.updateFundingEndBlock(501920); // ICO Numerator
		await gro.changeBlock(241920 + 101); // 4th round
		// has to be whitelisted
		await gro.verifyParticipant(randomAddress);
		await gro.buy({from: randomAddress, value: wei});
		
		let price = await gro.icoNumeratorPrice();
		// GRO contract stores balances in GRO
		let balanceInGro = (await gro.balanceOf(randomAddress)).toNumber() / precision;
		
		assert.equal(price.toNumber(), 10000, "Price should be GRO numerator value");
		assert.equal(balanceInGro, 10000, "Ether to GRO conversion");
	    });	    
	});
    });

});
