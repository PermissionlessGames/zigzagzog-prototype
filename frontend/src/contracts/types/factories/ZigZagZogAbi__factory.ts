/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Interface, type ContractRunner } from "ethers";
import type { ZigZagZogAbi, ZigZagZogAbiInterface } from "../ZigZagZogAbi";

const _abi = [
  {
    type: "constructor",
    inputs: [
      {
        name: "_playCost",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_commitDuration",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "_revealDuration",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "GameState",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "gameTimestamp",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "roundNumber",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "roundTimestamp",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "ZigZagZogVersion",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "string",
        internalType: "string",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "buyPlays",
    inputs: [],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "choicesHash",
    inputs: [
      {
        name: "nonce",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "gameNumber",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "roundNumber",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "numCircles",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "numSquares",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "numTriangles",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "commitChoices",
    inputs: [
      {
        name: "gameNumber",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "roundNumber",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "signature",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "commitDuration",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "currentGameNumber",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "eip712Domain",
    inputs: [],
    outputs: [
      {
        name: "fields",
        type: "bytes1",
        internalType: "bytes1",
      },
      {
        name: "name",
        type: "string",
        internalType: "string",
      },
      {
        name: "version",
        type: "string",
        internalType: "string",
      },
      {
        name: "chainId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "verifyingContract",
        type: "address",
        internalType: "address",
      },
      {
        name: "salt",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "extensions",
        type: "uint256[]",
        internalType: "uint256[]",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "gameBalance",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "playCost",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "playerHasCommitted",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "playerHasRevealed",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "purchasedPlays",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "revealChoices",
    inputs: [
      {
        name: "gameNumber",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "roundNumber",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "nonce",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "numCircles",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "numSquares",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "numTriangles",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "revealDuration",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "EIP712DomainChanged",
    inputs: [],
    anonymous: false,
  },
  {
    type: "event",
    name: "PlayerCommitment",
    inputs: [
      {
        name: "playerAddress",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "gameNumber",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "roundNumber",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "error",
    name: "InvalidShortString",
    inputs: [],
  },
  {
    type: "error",
    name: "StringTooLong",
    inputs: [
      {
        name: "str",
        type: "string",
        internalType: "string",
      },
    ],
  },
] as const;

export class ZigZagZogAbi__factory {
  static readonly abi = _abi;
  static createInterface(): ZigZagZogAbiInterface {
    return new Interface(_abi) as ZigZagZogAbiInterface;
  }
  static connect(
    address: string,
    runner?: ContractRunner | null
  ): ZigZagZogAbi {
    return new Contract(address, _abi, runner) as unknown as ZigZagZogAbi;
  }
}
