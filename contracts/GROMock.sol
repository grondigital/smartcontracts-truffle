pragma solidity 0.4.18;

import './GRO.sol';

// Used purely for time dependent tests and is not deployed to live network
contract GROMock is GRO () {

  uint256 public _now;
  uint256 public _block;

  function GROMock (uint256 defaultTime, uint256 defaultBlock) GRO () public {
    _now = defaultTime;
    _block = defaultBlock;
  }

  function changeBlock(uint256 _newBlock) public {
    _block = _newBlock;
  }

  function currentBlock() private constant returns(uint256 _currentBlock) {
    return _block;
  }

  function changeTime(uint256 _newTime) public {
    _now = _newTime;
  }

  function currentTime() private constant returns(uint256 _currentTime) {
    return _now;
  }
}
