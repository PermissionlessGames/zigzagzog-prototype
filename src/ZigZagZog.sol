// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {EIP712} from "../lib/openzeppelin-contracts/contracts/utils/cryptography/EIP712.sol";
import {IERC721} from "../lib/openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";
import {SignatureChecker} from "../lib/openzeppelin-contracts/contracts/utils/cryptography/SignatureChecker.sol";

contract ZigZagZog is EIP712 {
    string public constant ZigZagZogVersion = "0.1.0";
    uint256 public HandCost;
    uint64 public GameLength;

    struct Game {
        uint256 startTimestamp;
        uint256 roundNumber;
    }

    // Game number => player address => number of hands purchased
    mapping(uint256 => mapping(address => uint256)) handsPurchased;
    // Game number => player address => number of hands remaining
    mapping(uint256 => mapping(address => uint256)) handsSurviving;
    // Game number => round number => player address => player has committed
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) playerHasCommitted;
    // Game number => round number => player address => player has revealed
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) playerHasRevealed;
    // Game number => round number => player address => player commitment
    mapping(uint256 => mapping(uint256 => mapping(address => bytes))) playerCommittment;

    uint256 currentGameNumber = 0;

    mapping(uint256 => Game) public GameState;

    event PlayerCommitment(
        address indexed playerAddress,
        uint256 indexed gameNumber,
        uint256 indexed roundNumber
    );

    constructor(
        uint256 handCost,
        uint64 gameLength
    ) EIP712("ZigZagZog", ZigZagZogVersion) {
        HandCost = handCost;
        GameLength = gameLength;
        // Deployed event
    }

    function buyHands() external payable {
        if (
            block.timestamp >
            GameState[currentGameNumber].startTimestamp + GameLength
        ) {
            currentGameNumber++;
            GameState[currentGameNumber].startTimestamp = block.timestamp;
            GameState[currentGameNumber].roundNumber = 1;
        }

        uint256 handCount = msg.value / HandCost;
        require(
            handCount > 0,
            "ZigZagZog.buyHands(): insufficient value to buy a hand."
        );
        handsPurchased[currentGameNumber][msg.sender] = handCount;
        handsSurviving[currentGameNumber][msg.sender] = handCount;
    }

    function choicesHash(
        uint256 nonce,
        uint256 numCircles,
        uint256 numSquares,
        uint256 numTriangles
    ) public view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256(
                    "ChoicesMessage(uint256 nonce,uint256 numCircles,uint256 numSquares,uint256 numTriangles)"
                ),
                nonce,
                uint256(numCircles),
                uint256(numSquares),
                uint256(numTriangles)
            )
        );
        return _hashTypedDataV4(structHash);
    }

    function commitChoices(
        uint256 gameNumber,
        uint256 roundNumber,
        bytes memory signature
    ) external {
        // Check state
        // Game storage game = GameState[gameNumber];

        require(
            !playerHasCommitted[gameNumber][roundNumber][msg.sender],
            "ZigZagZog.commitChoices: player already committed"
        );

        playerHasCommitted[gameNumber][roundNumber][msg.sender] = true;
        playerCommittment[gameNumber][roundNumber][msg.sender] = signature;

        emit PlayerCommitment(msg.sender, gameNumber, roundNumber);
    }

    function revealChoices(
        uint256 gameNumber,
        uint256 roundNumber,
        uint256 nonce,
        uint256 numCircles,
        uint256 numSquares,
        uint256 numTriangles
    ) external {
        // Check state
        // Game storage game = GameState[gameNumber];

        require(
            !playerHasRevealed[gameNumber][roundNumber][msg.sender],
            "ZigZagZog.revealChoices: player already revealed"
        );

        bytes32 choicesMessageHash = choicesHash(
            nonce,
            numCircles,
            numSquares,
            numTriangles
        );
        require(
            SignatureChecker.isValidSignatureNow(
                msg.sender,
                choicesMessageHash,
                playerCommittment[gameNumber][roundNumber][msg.sender]
            ),
            "ZigZagZog.revealChoices: invalid signature"
        );

        // Do things
        playerHasRevealed[gameNumber][roundNumber][msg.sender] = true;
    }
}
