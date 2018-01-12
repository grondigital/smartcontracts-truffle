// Used to test time and block number  dependent code
var GRO = artifacts.require("GROMock");

contract('GRO', function(accounts) {
    var expectedFundingWallet = accounts[0];
    var expectedControlWallet= accounts[1];    
    var randomAddress = accounts[4];

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
	    assert.equal(participantBalance.toNumber(), expectedBalance);

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
	    assert.equal(participantBalance.toNumber(), expectedBalance);
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
	    assert.equal(participantBalance.toNumber(), expectedBalance);
	    
	    // post transaction balances
	    participantBalance = await gro.balanceOf(participant);	    
	    assert.equal(participantBalance.toNumber(), expectedBalance);

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
});
