pragma solidity 0.4.18;

import './StandardToken.sol';

contract GRO is StandardToken {
    // FIELDS
    string public name = "Gron Digital";
    string public symbol = "GRO";
    uint256 public decimals = 18;
    string public version = "9.0";

    uint256 public tokenCap = 950000000 * 10**18;

    // crowdsale parameters
    uint256 public fundingStartBlock;
    uint256 public fundingEndBlock;

    // vesting fields
    address public vestingContract;
    bool private vestingSet = false;

    // root control
    address public fundWallet;
    // control of liquidity and limited control of updatePrice
    address public controlWallet;
    // time to wait between controlWallet price updates
    uint256 public waitTime = 5 hours;

    // fundWallet controlled state variables
    // halted: halt buying due to emergency, tradeable: signal that assets have been acquired
    bool public halted = false;
    bool public tradeable = false;

    // -- totalSupply defined in StandardToken
    // -- mapping to token balances done in StandardToken

    uint256 public previousUpdateTime = 0;
    Price public currentPrice;
    uint256 public minAmount = 0.04 ether;

    // map participant address to a withdrawal request
    mapping (address => Withdrawal) public withdrawals;
    // maps previousUpdateTime to the next price
    mapping (uint256 => Price) public prices;
    // maps addresses
    mapping (address => bool) public whitelist;

    // TYPES

    struct Price { // tokensPerEth
        uint256 numerator;
    }

    struct Withdrawal {
        uint256 tokens;
        uint256 time; // time for each withdrawal is set to the previousUpdateTime
    }

    // EVENTS

    event Buy(address indexed participant, address indexed beneficiary, uint256 ethValue, uint256 amountTokens);
    event AllocatePresale(address indexed participant, uint256 amountTokens);
    event Whitelist(address indexed participant);
    event PriceUpdate(uint256 numerator);
    event AddLiquidity(uint256 ethAmount);
    event RemoveLiquidity(uint256 ethAmount);
    event WithdrawRequest(address indexed participant, uint256 amountTokens);
    event Withdraw(address indexed participant, uint256 amountTokens, uint256 etherAmount);

    // MODIFIERS

    modifier isTradeable { // exempt vestingContract and fundWallet to allow dev allocations
        require(tradeable || msg.sender == fundWallet || msg.sender == vestingContract);
        _;
    }

    modifier onlyWhitelist {
        require(whitelist[msg.sender]);
        _;
    }

    modifier onlyFundWallet {
        require(msg.sender == fundWallet);
        _;
    }

    modifier onlyManagingWallets {
        require(msg.sender == controlWallet || msg.sender == fundWallet);
        _;
    }

    modifier only_if_controlWallet {
        if (msg.sender == controlWallet) _;
    }
    modifier require_waited {
        require(safeSub(now, waitTime) >= previousUpdateTime);
        _;
    }
    modifier only_if_increase (uint256 newNumerator) {
        if (newNumerator > currentPrice.numerator) _;
    }

    // CONSTRUCTOR
    // Setup funding wallet and controlwallet
    // Setup price numerator
    // Setup start and end funding blocks
    // Add funing and control wallet to the whitelist
    
    function GRO(address controlWalletInput, uint256 priceNumeratorInput, uint256 startBlockInput, uint256 endBlockInput) public {
        require(controlWalletInput != address(0));
        require(priceNumeratorInput > 0);
        require(endBlockInput > startBlockInput);
        fundWallet = msg.sender;
        controlWallet = controlWalletInput;
        whitelist[fundWallet] = true;
        whitelist[controlWallet] = true;
        currentPrice = Price(priceNumeratorInput);
        fundingStartBlock = startBlockInput;
        fundingEndBlock = endBlockInput;
        previousUpdateTime = now;
    }

    // METHODS
    // Funding wallet sends the vesting contract address
    // Adds vestingcontract to thew whitelist
    
    function setVestingContract(address vestingContractInput) external onlyFundWallet {
        require(vestingContractInput != address(0));
        vestingContract = vestingContractInput;
        whitelist[vestingContract] = true;
        vestingSet = true;
    }

    // allows controlWallet to update the price within a time contstraint, allows fundWallet complete control
    // can only increase by by 20 percent within waitTime
    // default is 5 hours
    function updatePrice(uint256 newNumerator) external onlyManagingWallets {
        require(newNumerator > 0);
        require_limited_change(newNumerator);
        // either controlWallet command is compliant or transaction came from fundWallet
        currentPrice.numerator = newNumerator;
        // maps time to new Price (if not during ICO)
        prices[previousUpdateTime] = currentPrice;
        previousUpdateTime = now;
        PriceUpdate(newNumerator);
    }

    function require_limited_change (uint256 newNumerator)
        private
        only_if_controlWallet
        require_waited
        only_if_increase(newNumerator)
    {
        uint256 percentage_diff = 0;
        percentage_diff = safeMul(newNumerator, 100) / currentPrice.numerator;
        percentage_diff = safeSub(percentage_diff, 100);
        // controlWallet can only increase price by max 20% and only every waitTime
        require(percentage_diff <= 20);
    }
    // Vesting contract has to be set
    // allocate an additional 40% of amountTokens to team
    // the new total supply has to be less then the tokenCap
    // allocate amountTokens to the participant address
    // allocate developmentAllocation to vesting contract
    
    function allocateTokens(address participant, uint256 amountTokens) private {
        require(vestingSet);
        // 40% of total allocated for Founders, Team incentives & Bonuses
        uint256 developmentAllocation = safeMul(amountTokens, 380000000000000000) / 100000000000000000;
        // check that token cap is not exceeded
        uint256 newTokens = safeAdd(amountTokens, developmentAllocation);
        require(safeAdd(totalSupply, newTokens) <= tokenCap);
        // increase token supply, assign tokens to participant
        totalSupply = safeAdd(totalSupply, newTokens);
        balances[participant] = safeAdd(balances[participant], amountTokens);
        balances[vestingContract] = safeAdd(balances[vestingContract], developmentAllocation);
    }

    // Add the participant to the whitelist
    // calls allocateTokens
    
    function allocatePresaleTokens(address participant, uint amountTokens) external onlyFundWallet {
        require(block.number < fundingEndBlock);
        require(participant != address(0));
        whitelist[participant] = true; // automatically whitelist accepted presale
        allocateTokens(participant, amountTokens);
        Whitelist(participant);
        AllocatePresale(participant, amountTokens);
    }

    // Add participant to the white list
    
    function verifyParticipant(address participant) external onlyManagingWallets {
        whitelist[participant] = true;
        Whitelist(participant);
    }

    function buy() external payable {
        buyTo(msg.sender);
    }

    // alloacte tokens to the participant amount allocated is
    // determined by the current price and the value specified in the
    // message
    // add msg value ether to the fund wallet 
    function buyTo(address participant) public payable onlyWhitelist {
        require(!halted);
        require(participant != address(0));
        require(msg.value >= minAmount);
        require(block.number >= fundingStartBlock && block.number < fundingEndBlock);
        uint256 tokensToBuy = safeMul(msg.value, currentPrice.numerator);
        allocateTokens(participant, tokensToBuy);
        // send ether to fundWallet
        fundWallet.transfer(msg.value);
        Buy(msg.sender, participant, msg.value, tokensToBuy);
    }

    // time based on blocknumbers, assuming a blocktime of 15s
    function icoNumeratorPrice() public constant returns (uint256) {
        uint256 icoDuration = safeSub(block.number, fundingStartBlock);
        uint256 numerator;
        if (icoDuration < 80640 ) { // #blocks = 2*7*24*60*60/15 = 80640
            numerator = safeMul(currentPrice.numerator, 13000);
            return numerator;
        } else if (icoDuration < 161280 ) { // #blocks = 4*7*24*60*60/15 = 161280
            numerator = safeMul(currentPrice.numerator, 12000);
            return numerator;
        } else if (icoDuration < 241920 ) { // #blocks = 6*7*24*60*60/15 = 241920
            numerator = safeMul(currentPrice.numerator, 11000);
            return numerator;
        } else {
            numerator = safeMul(currentPrice.numerator, 10000);
            return numerator;
        }
    }
    // Withdraw tokens from the current token balance of the participant (message sender)
    function requestWithdrawal(uint256 amountTokensToWithdraw) external isTradeable onlyWhitelist {
        require(block.number > fundingEndBlock);
        require(amountTokensToWithdraw > 0);
        address participant = msg.sender;
        require(balanceOf(participant) >= amountTokensToWithdraw);
        require(withdrawals[participant].tokens == 0); // participant cannot have outstanding withdrawals
        balances[participant] = safeSub(balances[participant], amountTokensToWithdraw);
        withdrawals[participant] = Withdrawal({tokens: amountTokensToWithdraw, time: previousUpdateTime});
        WithdrawRequest(participant, amountTokensToWithdraw);
    }
    
    // Transfer all tokens to participant's wallet
    
    function withdraw() external {
        address participant = msg.sender;
        uint256 tokens = withdrawals[participant].tokens;
        require(tokens > 0); // participant must have requested a withdrawal
        uint256 requestTime = withdrawals[participant].time;
        // obtain the next price that was set after the request
        Price price = prices[requestTime];
        require(price.numerator > 0); // price must have been set
        uint256 withdrawValue = safeMul(tokens, price.numerator);
        // if contract ethbal > then send + transfer tokens to fundWallet, otherwise give tokens back
        withdrawals[participant].tokens = 0;
        if (this.balance >= withdrawValue)
            enact_withdrawal_greater_equal(participant, withdrawValue, tokens);
        else
            enact_withdrawal_less(participant, withdrawValue, tokens);
    }

    function enact_withdrawal_greater_equal(address participant, uint256 withdrawValue, uint256 tokens)
        private
    {
        assert(this.balance >= withdrawValue);
        balances[fundWallet] = safeAdd(balances[fundWallet], tokens);
        participant.transfer(withdrawValue);
        Withdraw(participant, tokens, withdrawValue);
    }
    function enact_withdrawal_less(address participant, uint256 withdrawValue, uint256 tokens)
        private
    {
        assert(this.balance < withdrawValue);
        balances[participant] = safeAdd(balances[participant], tokens);
        Withdraw(participant, tokens, 0); // indicate a failed withdrawal
    }

    // get the withDraw value (in either) based on the price of the tokens
    function checkWithdrawValue(uint256 amountTokensToWithdraw) constant returns (uint256 etherValue) {
        require(amountTokensToWithdraw > 0);
        require(balanceOf(msg.sender) >= amountTokensToWithdraw);
        uint256 withdrawValue = safeMul(amountTokensToWithdraw, currentPrice.numerator);
        require(this.balance >= withdrawValue);
        return withdrawValue;
    }

    // allow fundWallet or controlWallet to add ether to contract
    function addLiquidity() external onlyManagingWallets payable {
        require(msg.value > 0);
        AddLiquidity(msg.value);
    }

    // allow fundWallet to remove ether from contract
    function removeLiquidity(uint256 amount) external onlyManagingWallets {
        require(amount <= this.balance);
        fundWallet.transfer(amount);
        RemoveLiquidity(amount);
    }

    function changeFundWallet(address newFundWallet) external onlyFundWallet {
        require(newFundWallet != address(0));
        fundWallet = newFundWallet;
    }

    function changeControlWallet(address newControlWallet) external onlyFundWallet {
        require(newControlWallet != address(0));
        controlWallet = newControlWallet;
    }

    function changeWaitTime(uint256 newWaitTime) external onlyFundWallet {
        waitTime = newWaitTime;
    }

    function updateFundingStartBlock(uint256 newFundingStartBlock) external onlyFundWallet {
        require(block.number < fundingStartBlock);
        require(block.number < newFundingStartBlock);
        fundingStartBlock = newFundingStartBlock;
    }

    function updateFundingEndBlock(uint256 newFundingEndBlock) external onlyFundWallet {
        require(block.number < fundingEndBlock);
        require(block.number < newFundingEndBlock);
        fundingEndBlock = newFundingEndBlock;
    }

    function halt() external onlyFundWallet {
        halted = true;
    }
    function unhalt() external onlyFundWallet {
        halted = false;
    }

    function enableTrading() external onlyFundWallet {
        require(block.number > fundingEndBlock);
        tradeable = true;
    }

    // fallback function

    function() payable public {
        require(tx.origin == msg.sender);
        buyTo(msg.sender);
    }

    function claimTokens(address _token) external onlyFundWallet {
        require(_token != address(0));
        Token token = Token(_token);
        uint256 balance = token.balanceOf(this);
        token.transfer(fundWallet, balance);
     }

    // prevent transfers until trading allowed
    function transfer(address _to, uint256 _value) public isTradeable returns (bool success) {
        return super.transfer(_to, _value);
    }
    function transferFrom(address _from, address _to, uint256 _value) public isTradeable returns (bool success) {
        return super.transferFrom(_from, _to, _value);
    }
}
