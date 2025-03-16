// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {EIP712} from "../lib/openzeppelin-contracts/contracts/utils/cryptography/EIP712.sol";
import {IERC721} from "../lib/openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";
import {SignatureChecker} from "../lib/openzeppelin-contracts/contracts/utils/cryptography/SignatureChecker.sol";

contract ZigZagZog is EIP712 {
    string public constant ZigZagZogVersion = "0.1.0";
    uint256 public playCost;
    uint64 public commitDuration;
    uint64 public revealDuration;

    enum Phase {
        None,
        Commit,
        Reveal
    }

    struct Game {
        uint256 gameTimestamp;
        uint256 roundNumber;
        uint256 roundTimestamp;
    }

    // Game number => player address => number of hands purchased
    mapping(uint256 => mapping(address => uint256)) public purchasedPlays;
    // Game number => player address => number of hands remaining
    mapping(uint256 => mapping(address => uint256)) survivingPlays;
    // Game number => round number => player address => player has committed
    mapping(uint256 => mapping(uint256 => mapping(address => bool)))
        public playerHasCommitted;
    // Game number => round number => player address => player has revealed
    mapping(uint256 => mapping(uint256 => mapping(address => bool)))
        public playerHasRevealed;
    // Game number => round number => player address => player commitment
    mapping(uint256 => mapping(uint256 => mapping(address => bytes))) playerCommittment;

    uint256 public currentGameNumber = 0;

    mapping(uint256 => Game) public GameState;

    event PlayerCommitment(
        address indexed playerAddress,
        uint256 indexed gameNumber,
        uint256 indexed roundNumber
    );

    constructor(
        uint256 _playCost,
        uint64 _commitDuration,
        uint64 _revealDuration
    ) EIP712("ZigZagZog", ZigZagZogVersion) {
        playCost = _playCost;
        commitDuration = _commitDuration;
        revealDuration = _revealDuration;
        // Deployed event
    }

    function buyPlays() external payable {
        if (
            block.timestamp >
            GameState[currentGameNumber].gameTimestamp + commitDuration ||
            currentGameNumber == 0
        ) {
            currentGameNumber++;
            GameState[currentGameNumber].gameTimestamp = block.timestamp;
            GameState[currentGameNumber].roundNumber = 1;
            GameState[currentGameNumber].roundTimestamp = block.timestamp;
        }

        uint256 numPlays = msg.value / playCost;
        require(
            numPlays > 0,
            "ZigZagZog.buyPlays(): insufficient value to buy a play."
        );
        purchasedPlays[currentGameNumber][msg.sender] = numPlays;
        survivingPlays[currentGameNumber][msg.sender] = numPlays;

        uint256 excess = msg.value - numPlays * playCost;
        if (excess > 0) {
            payable(msg.sender).transfer(excess); // Refund excess native token
        }
    }

    function choicesHash(
        uint256 nonce,
        uint256 gameNumber,
        uint256 roundNumber,
        uint256 numCircles,
        uint256 numSquares,
        uint256 numTriangles
    ) public view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256(
                    "ChoicesMessage(uint256 nonce,uint256 gameNumber,uint256 roundNumber,uint256 numCircles,uint256 numSquares,uint256 numTriangles)"
                ),
                nonce,
                gameNumber,
                roundNumber,
                numCircles,
                numSquares,
                numTriangles
            )
        );
        return _hashTypedDataV4(structHash);
    }

    function commitChoices(
        uint256 gameNumber,
        uint256 roundNumber,
        bytes memory signature
    ) external {
        Game storage game = GameState[gameNumber];

        if (roundNumber > game.roundNumber) {
            require(
                (block.timestamp >
                    game.roundTimestamp + commitDuration + revealDuration) &&
                    (roundNumber - game.roundNumber == 1),
                "ZigZagZog.commitChoices: round hasn't started yet"
            );
            game.roundNumber++;
            game.roundTimestamp = block.timestamp;
        }

        require(
            block.timestamp <= game.roundTimestamp + commitDuration,
            "ZigZagZog.commitChoices: commit window has passed"
        );

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
            gameNumber,
            roundNumber,
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
