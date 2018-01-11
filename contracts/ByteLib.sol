pragma solidity 0.4.18;

contract ByteLib {

  function bytesToAddress(bytes _address) pure public returns (address) {
    uint160 m = 0;
    uint160 b = 0;

    for (uint8 i = 0; i < 20; i++) {
      m *= 256;
      b = uint160(_address[i]);
      m += (b);
    }

    return address(m);
  }

  function firstDigit(string s) pure public  returns(byte){
    bytes memory strBytes = bytes(s);
    return strBytes[2];
  }
}
