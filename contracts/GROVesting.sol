pragma solidity 0.4.18;

import './Token.sol';
import './SafeMath.sol';

/**
* @title GROVesting
* @dev GROVesting is a token holder contract that allows the specified beneficiary
* to claim stored tokens after 6 & 12 month intervals
*/

contract GROVesting is SafeMath {

    address public beneficiary;
    uint256 public fundingEndBlock;

    bool private initClaim = false; // state tracking variables

    uint256 public firstRelease; // vesting times
    bool private firstDone = false;
    uint256 public secondRelease;
    bool private secondDone = false;
    uint256 public thirdRelease;

    Token public ERC20Token; // ERC20 basic token contract to hold

    enum Stages {
        initClaim,
        firstRelease,
        secondRelease,
        thirdRelease
    }

    Stages public stage = Stages.initClaim;

    modifier atStage(Stages _stage){
        if (stage == _stage) _;
    }

    modifier onlyBeneficiary {
      require(msg.sender == beneficiary);
      _;
    }

    function GROVesting() public {
        beneficiary = msg.sender;
    }

    // Not all deployment clients support constructor arguments.
    // This function is provided for maximum compatibility. 
    function initialiseContract(address _token, uint256 fundingEndBlockInput) external onlyBeneficiary {
      require(_token != address(0));
      fundingEndBlock = fundingEndBlockInput;
      ERC20Token = Token(_token);
    }
    
    function changeBeneficiary(address newBeneficiary) external {
        require(newBeneficiary != address(0));
        require(msg.sender == beneficiary);
        beneficiary = newBeneficiary;
    }

    function updateFundingEndBlock(uint256 newFundingEndBlock) public {
        require(msg.sender == beneficiary);
        require(block.number < fundingEndBlock);
        require(block.number < newFundingEndBlock);
        fundingEndBlock = newFundingEndBlock;
    }

    function checkBalance() public constant returns (uint256 tokenBalance) {
        return ERC20Token.balanceOf(this);
    }

    // in total 40% of GRO tokens will be sent to this contract
    // EXPENSE ALLOCATION: 28%          | TEAM ALLOCATION: 12% (vest over 2 years)
    //   12% - Incentives and bonuses
    //   16% - Bankroll                 
    //                                  
    //   Expenses Breakdown:
    //   50% - Software Development
    //   15% - Operations
    //   15% - Advisors
    //   10% - Marketing
    //   5% - Legal Framework & Finance
    //   5% - Contingencies
    //
    // initial claim is bankroll - 16% = 152000000
    // first release after 6 months - Incentives and bonuses - 12%
    // second release after 12 months - Founders - 6%
    // third release after 24 months - Founders - 6%

    function claim() external {
        require(msg.sender == beneficiary);
        require(block.number > fundingEndBlock);
        uint256 balance = ERC20Token.balanceOf(this);
        // in reverse order so stages changes don't carry within one claim
        third_release(balance);
        second_release(balance);
        first_release(balance);
        init_claim(balance);
    }

    function nextStage() private {
        stage = Stages(uint256(stage) + 1);
    }

    function init_claim(uint256 balance) private atStage(Stages.initClaim) {
        firstRelease = now + 26 weeks;                          // Incentives and bonuses
        secondRelease = now + 52 weeks;                         // Founders
        thirdRelease = secondRelease + 52 weeks;                // Founders
        uint256 amountToTransfer = safeMul(balance, 40) / 100;  // send 100% of Bankroll - 40% of Expense Allocation
        ERC20Token.transfer(beneficiary, amountToTransfer);     // now 60% tokens left
        nextStage();
    }
    function first_release(uint256 balance) private atStage(Stages.firstRelease) {
        require(now > firstRelease);
        uint256 amountToTransfer = safeMul(balance, 30) / 100;  // send 100% of incentives and bonuses - 30% of Expense Allocation
        ERC20Token.transfer(beneficiary, amountToTransfer);     // now 30% tokens left
        nextStage();
    }
    function second_release(uint256 balance) private atStage(Stages.secondRelease) {
        require(now > secondRelease);
        uint256 amountToTransfer = balance / 2;             // send 50% of founders release - 15% of Expense Allocation
        ERC20Token.transfer(beneficiary, amountToTransfer); // now 15% tokens left
        nextStage();
    }
    function third_release(uint256 balance) private atStage(Stages.thirdRelease) {
        require(now > thirdRelease);
        uint256 amountToTransfer = balance;                 // send 50% of founders release - 15% of Expense Allocation
        ERC20Token.transfer(beneficiary, amountToTransfer);
        nextStage();
    }

    function claimOtherTokens(address _token) external {
        require(msg.sender == beneficiary);
        require(_token != address(0));
        Token token = Token(_token);
        require(token != ERC20Token);
        uint256 balance = token.balanceOf(this);
        token.transfer(beneficiary, balance);
    }

    function currentBlock() private constant returns(uint256 _currentBlock) {
      return block.number;
    }

    function currentTime() private constant returns(uint256 _currentTime) {
      return now;
    } 
}
