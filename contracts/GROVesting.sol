pragma solidity 0.4.18;

import './Token.sol';
import './SafeMath.sol';

/**
* @title GROVesting
* @dev GROVesting is a token holder contract that allows the specified beneficiary
* to claim stored tokens after 6 month intervals
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
    bool private thirdDone = false;
    uint256 public fourthRelease;

    Token public ERC20Token; // ERC20 basic token contract to hold

    enum Stages {
        initClaim,
        firstRelease,
        secondRelease,
        thirdRelease,
        fourthRelease
    }

    Stages public stage = Stages.initClaim;

    modifier atStage(Stages _stage){
        if (stage == _stage) _;
    }

    function GROVesting(address _token, uint256 fundingEndBlockInput) {
        require(_token != address(0));
        beneficiary = msg.sender;
        fundingEndBlock = fundingEndBlockInput;
        ERC20Token = Token(_token);
    }

    function changeBeneficiary(address newBeneficiary) external {
        require(newBeneficiary != address(0));
        require(msg.sender == beneficiary);
        beneficiary = newBeneficiary;
    }

    function updateFundingEndBlock(uint256 newFundingEndBlock) {
        require(msg.sender == beneficiary);
        require(block.number < fundingEndBlock);
        require(block.number < newFundingEndBlock);
        fundingEndBlock = newFundingEndBlock;
    }

    function checkBalance() constant returns (uint256 tokenBalance) {
        return ERC20Token.balanceOf(this);
    }

    // in total 40% of GRO tokens will be sent to this contract
    // EXPENSE ALLOCATION: 28%          | TEAM ALLOCATION: 12% (vest over 2 years)
    //   12% - Incentives and bonuses   | initalPayment: 4%
    //   16% - Bankroll                 | firstRelease: 2%
    //                                  | secondRelease: 2%
    //   Expenses Breakdown:            | thirdRelease: 2%
    //   50% - Software Development     | fourthRelease: 2%
    //   15% - Operations
    //   15% - Advisors
    //   10% - Marketing
    //   5% - Legal Framework & Finance
    //   5% - Contingencies
    // initial claim is tot expenses + initial team payment
    // initial claim is thus (28 + 4)/380 = 84.2105263% of GRO tokens sent here
    // each other release (for team) is 3.947368425% of tokens sent here

    function claim() external
    {
        require(msg.sender == beneficiary);
        require(block.number > fundingEndBlock);
        uint256 balance = ERC20Token.balanceOf(this);
        // in reverse order so stages changes don't carry within one claim
        fourth_release(balance);
        third_release(balance);
        second_release(balance);
        first_release(balance);
        init_claim(balance);
    }

    function nextStage() private {
        stage = Stages(uint256(stage) + 1);
    }

    function init_claim(uint256 balance) private atStage(Stages.initClaim) {
        firstRelease = now + 26 weeks; // assign 4 claiming times
        secondRelease = firstRelease + 26 weeks;
        thirdRelease = secondRelease + 26 weeks;
        fourthRelease = thirdRelease + 26 weeks;
        uint256 amountToTransfer = safeMul(balance, 31999999994) / 100000000000;
        ERC20Token.transfer(beneficiary, amountToTransfer); // now 15.7894737% tokens left
        nextStage();
    }
    function first_release(uint256 balance) private atStage(Stages.firstRelease) {
        require(now > firstRelease);
        uint256 amountToTransfer = balance / 4;
        ERC20Token.transfer(beneficiary, amountToTransfer); // send 25 % of team releases
        nextStage();
    }
    function second_release(uint256 balance) private atStage(Stages.secondRelease) {
        require(now > secondRelease);
        uint256 amountToTransfer = balance / 3;
        ERC20Token.transfer(beneficiary, amountToTransfer); // send 25 % of team releases
        nextStage();
    }
    function third_release(uint256 balance) private atStage(Stages.thirdRelease) {
        require(now > thirdRelease);
        uint256 amountToTransfer = balance / 2;
        ERC20Token.transfer(beneficiary, amountToTransfer); // send 25 % of team releases
        nextStage();
    }
    function fourth_release(uint256 balance) private atStage(Stages.fourthRelease) {
        require(now > fourthRelease);
        ERC20Token.transfer(beneficiary, balance); // send remaining 25 % of team releases
    }

    function claimOtherTokens(address _token) external {
        require(msg.sender == beneficiary);
        require(_token != address(0));
        Token token = Token(_token);
        require(token != ERC20Token);
        uint256 balance = token.balanceOf(this);
        token.transfer(beneficiary, balance);
    }

}
