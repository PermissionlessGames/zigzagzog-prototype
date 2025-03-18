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

    enum EliminationResult {
        CircleEliminated,
        SquareEliminated,
        TriangleEliminated,
        NothingEliminated
    }

    struct Game {
        //game number
        uint256 gameNumber;
        //game timestamp
        uint256 gameTimestamp;
        //round number
        uint256 roundNumber;
        //round timestamp
        uint256 roundTimestamp;
        //game balance
        uint256 gameBalance;
        //surviving plays
        uint256 survivingPlays;
        //player address => # of plays purchased
        mapping(address => uint256) purchasedPlays;
        //player address => # of surviving plays
        mapping(address => uint256) playerSurvivingPlays;
        //round number => player address => player has committed
        mapping(uint256 => mapping(address => bool)) playerHasCommitted; //Might be redundant
        //round number => player address => player commitment
        mapping(uint256 => mapping(address => bytes)) playerCommittment;
        //round number => player address => player has revealed
        mapping(uint256 => mapping(address => bool)) playerHasRevealed;
        //round number => # of circles revealed
        mapping(uint256 => uint256) circlesRevealed;
        //round number => # of squares revealed
        mapping(uint256 => uint256) squaredRevealed;
        //round number => # of triangles revealed
        mapping(uint256 => uint256) trianglesRevealed;
        //round number => player address => # of circles revealed by player
        mapping(uint256 => mapping(address => uint256)) playerCirclesRevealed;
        //round number => player address => # of squares revealed by player
        mapping(uint256 => mapping(address => uint256)) playerSquaresRevealed;
        //round number => player address => # of triangles revealed by player
        mapping(uint256 => mapping(address => uint256)) playerTrianglesRevealed;
    }

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
        GameState[currentGameNumber].purchasedPlays[msg.sender] += numPlays;
        GameState[currentGameNumber].playerSurvivingPlays[
            msg.sender
        ] = numPlays;
        GameState[currentGameNumber].survivingPlays += numPlays;

        uint256 stakedAmount = numPlays * playCost;
        GameState[currentGameNumber].gameBalance += stakedAmount;
        uint256 excess = msg.value - stakedAmount;
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
            !game.playerHasCommitted[roundNumber][msg.sender],
            "ZigZagZog.commitChoices: player already committed"
        );

        if (roundNumber > 1) {
            uint256 previousRound = roundNumber - 1;
            EliminationResult elimResult = _calculateEliminationResult(
                game.circlesRevealed[previousRound],
                game.squaredRevealed[previousRound],
                game.trianglesRevealed[previousRound]
            );

            if (elimResult == EliminationResult.CircleEliminated) {
                game.playerSurvivingPlays[msg.sender] =
                    game.playerSquaresRevealed[previousRound][msg.sender] +
                    game.playerTrianglesRevealed[previousRound][msg.sender];
                game.survivingPlays =
                    game.squaredRevealed[previousRound] +
                    game.trianglesRevealed[previousRound];
            } else if (elimResult == EliminationResult.SquareEliminated) {
                game.playerSurvivingPlays[msg.sender] =
                    game.playerCirclesRevealed[previousRound][msg.sender] +
                    game.playerTrianglesRevealed[previousRound][msg.sender];
                game.survivingPlays =
                    game.circlesRevealed[previousRound] +
                    game.trianglesRevealed[previousRound];
            } else if (elimResult == EliminationResult.TriangleEliminated) {
                game.playerSurvivingPlays[msg.sender] =
                    game.playerCirclesRevealed[previousRound][msg.sender] +
                    game.playerSquaresRevealed[previousRound][msg.sender];
                game.survivingPlays =
                    game.circlesRevealed[previousRound] +
                    game.squaredRevealed[previousRound];
            } else {
                revert("ZigZagZog.commitChoices: game has ended");
            }

            require(
                game.playerSurvivingPlays[msg.sender] > 0,
                "ZigZagZog.commitChoices: player has no remaining plays"
            );

            if (
                game.survivingPlays <= 2 ||
                game.survivingPlays == game.playerSurvivingPlays[msg.sender]
            ) {
                revert("ZigZagZog.commitChoices: game has ended");
            }
        }

        game.playerHasCommitted[roundNumber][msg.sender] = true;
        game.playerCommittment[roundNumber][msg.sender] = signature;

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
        Game storage game = GameState[gameNumber];
        require(
            !game.playerHasRevealed[roundNumber][msg.sender],
            "ZigZagZog.revealChoices: player already revealed"
        );

        require(
            block.timestamp > game.roundTimestamp + commitDuration,
            "ZigZagZog.revealChoices: reveal phase has not yet begun"
        );
        require(
            block.timestamp <=
                game.roundTimestamp + commitDuration + revealDuration,
            "ZigZagZog.revealChoices: reveal phase has ended"
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
                game.playerCommittment[roundNumber][msg.sender]
            ),
            "ZigZagZog.revealChoices: invalid signature"
        );

        require(
            numCircles + numSquares + numTriangles ==
                game.playerSurvivingPlays[msg.sender],
            "ZigZagZog.revealChoices: insufficient remaining plays"
        );

        game.circlesRevealed[roundNumber] += numCircles;
        game.squaredRevealed[roundNumber] += numSquares;
        game.trianglesRevealed[roundNumber] += numTriangles;
        game.playerCirclesRevealed[roundNumber][msg.sender] = numCircles;
        game.playerSquaresRevealed[roundNumber][msg.sender] = numSquares;
        game.playerTrianglesRevealed[roundNumber][msg.sender] = numTriangles;

        game.playerHasRevealed[roundNumber][msg.sender] = true;
    }

    function _calculateEliminationResult(
        uint256 _circlesRevealed,
        uint256 _squaresRevealed,
        uint256 _trianglesRevealed
    ) internal pure returns (EliminationResult) {
        // I'm assuming trump order is Circle > Square > Triangle (can change later)
        if (_circlesRevealed > _squaresRevealed) {
            if (_circlesRevealed >= _trianglesRevealed) {
                return EliminationResult.CircleEliminated;
            } else {
                return EliminationResult.TriangleEliminated;
            }
        } else if (_circlesRevealed == _squaresRevealed) {
            if (_circlesRevealed < _trianglesRevealed) {
                return EliminationResult.TriangleEliminated;
            } else if (_circlesRevealed == _trianglesRevealed) {
                return EliminationResult.NothingEliminated;
            } else return EliminationResult.CircleEliminated;
        } else {
            if (_squaresRevealed >= _trianglesRevealed) {
                return EliminationResult.SquareEliminated;
            } else {
                return EliminationResult.TriangleEliminated;
            }
        }
    }
}
