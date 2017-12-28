pragma solidity 0.4.18;

/**
 * Overflow aware uint math functions.
 *
 * Inspired by https://github.com/makerdao/maker-otc/blob/master/src/simple_market.sol
 */

contract SafeMath {

  function safeMul(uint a, uint b) internal returns (uint) {
    uint c = a * b;
    assert(a == 0 || c / a == b);
    return c;
  }
  function safeSub(uint a, uint b) internal returns (uint) {
    assert(b <= a);
    return a - b;
  }
  function safeAdd(uint a, uint b) internal returns (uint) {
    uint c = a + b;
    assert(c>=a && c>=b);
    return c;
  }
  function safeNumDigits(uint number) internal returns (uint8) {
    uint8 digits = 0;
    while (number != 0) {
        number /= 10;
        digits++;
    }
    return digits;
}

  // mitigate short address attack
  // thanks to https://github.com/numerai/contract/blob/c182465f82e50ced8dacb3977ec374a892f5fa8c/contracts/Safe.sol#L30-L34.
  // TODO: doublecheck implication of >= compared to ==
  modifier onlyPayloadSize(uint numWords) {
     assert(msg.data.length >= numWords * 32 + 4);
     _;
  }

}
