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
        //round number => round
        mapping(uint256 => Round) rounds;
    }

    struct Round {
        //player address => player
        mapping(address => Player) players;
        //# of circles revealed
        uint256 circlesRevealed;
        //# of squares revealed
        uint256 squaredRevealed;
        //# of triangles revealed
        uint256 trianglesRevealed;
    }

    struct Player {
        //# of plays purchased
        uint256 purchasedPlays;
        //# of surviving plays
        uint256 playerSurvivingPlays;
        //player has committed
        bool playerHasCommitted; //Might be redundant
        //player commitment
        bytes playerCommittment;
        //player has revealed
        bool playerHasRevealed;
        //# of circles revealed by player
        uint256 playerCirclesRevealed;
        //# of squares revealed by player
        uint256 playerSquaresRevealed;
        //# of triangles revealed by player
        uint256 playerTrianglesRevealed;
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
        GameState[currentGameNumber]
            .rounds[currentGameNumber]
            .players[msg.sender]
            .purchasedPlays += numPlays;
        GameState[currentGameNumber]
            .rounds[currentGameNumber]
            .players[msg.sender]
            .playerSurvivingPlays += numPlays;

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
        Player storage player = game.rounds[roundNumber].players[msg.sender];
        Player storage previousPlayer = game.rounds[roundNumber - 1].players[
            msg.sender
        ];
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
            !player.playerHasCommitted,
            "ZigZagZog.commitChoices: player already committed"
        );

        if (roundNumber > 1) {
            uint256 previousRound = roundNumber - 1;
            EliminationResult elimResult = _calculateEliminationResult(
                game.rounds[previousRound].circlesRevealed,
                game.rounds[previousRound].squaredRevealed,
                game.rounds[previousRound].trianglesRevealed
            );

            if (elimResult == EliminationResult.CircleEliminated) {
                player.playerSurvivingPlays =
                    previousPlayer.playerSquaresRevealed +
                    previousPlayer.playerTrianglesRevealed;
                game.survivingPlays =
                    game.rounds[previousRound].squaredRevealed +
                    game.rounds[previousRound].trianglesRevealed;
            } else if (elimResult == EliminationResult.SquareEliminated) {
                player.playerSurvivingPlays =
                    previousPlayer.playerCirclesRevealed +
                    previousPlayer.playerTrianglesRevealed;
                game.survivingPlays =
                    game.rounds[previousRound].circlesRevealed +
                    game.rounds[previousRound].trianglesRevealed;
            } else if (elimResult == EliminationResult.TriangleEliminated) {
                player.playerSurvivingPlays =
                    previousPlayer.playerCirclesRevealed +
                    previousPlayer.playerSquaresRevealed;
                game.survivingPlays =
                    game.rounds[previousRound].circlesRevealed +
                    game.rounds[previousRound].squaredRevealed;
            } else {
                revert("ZigZagZog.commitChoices: game has ended");
            }

            require(
                player.playerSurvivingPlays > 0,
                "ZigZagZog.commitChoices: player has no remaining plays"
            );

            if (
                game.survivingPlays <= 2 ||
                game.survivingPlays == player.playerSurvivingPlays
            ) {
                revert("ZigZagZog.commitChoices: game has ended");
            }
        }

        player.playerHasCommitted = true;
        player.playerCommittment = signature;

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
        Player storage player = game.rounds[roundNumber].players[msg.sender];
        require(
            !player.playerHasRevealed,
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
                player.playerCommittment
            ),
            "ZigZagZog.revealChoices: invalid signature"
        );

        require(
            numCircles + numSquares + numTriangles ==
                player.playerSurvivingPlays,
            "ZigZagZog.revealChoices: insufficient remaining plays"
        );

        game.rounds[roundNumber].circlesRevealed += numCircles;
        game.rounds[roundNumber].squaredRevealed += numSquares;
        game.rounds[roundNumber].trianglesRevealed += numTriangles;
        player.playerCirclesRevealed += numCircles;
        player.playerSquaresRevealed += numSquares;
        player.playerTrianglesRevealed += numTriangles;

        player.playerHasRevealed = true;
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

    //view functions
    function getGameBalance(uint256 gameNumber) public view returns (uint256) {
        return GameState[gameNumber].gameBalance;
    }

    function getPurchasedPlays(
        uint256 gameNumber,
        uint256 roundNumber,
        address player
    ) public view returns (uint256) {
        return
            GameState[gameNumber]
                .rounds[roundNumber]
                .players[player]
                .purchasedPlays;
    }

    function getPlayerSurvivingPlays(
        uint256 gameNumber,
        uint256 roundNumber,
        address player
    ) public view returns (uint256) {
        return
            GameState[gameNumber]
                .rounds[roundNumber]
                .players[player]
                .playerSurvivingPlays;
    }

    function getPlayerHasCommitted(
        uint256 gameNumber,
        uint256 roundNumber,
        address player
    ) public view returns (bool) {
        return
            GameState[gameNumber]
                .rounds[roundNumber]
                .players[player]
                .playerHasCommitted;
    }

    function getPlayerCommittment(
        uint256 gameNumber,
        uint256 roundNumber,
        address player
    ) public view returns (bytes memory) {
        return
            GameState[gameNumber]
                .rounds[roundNumber]
                .players[player]
                .playerCommittment;
    }

    function getPlayerHasRevealed(
        uint256 gameNumber,
        uint256 roundNumber,
        address player
    ) public view returns (bool) {
        return
            GameState[gameNumber]
                .rounds[roundNumber]
                .players[player]
                .playerHasRevealed;
    }

    function getCirclesRevealed(
        uint256 gameNumber,
        uint256 roundNumber
    ) public view returns (uint256) {
        return GameState[gameNumber].rounds[roundNumber].circlesRevealed;
    }

    function getSquaresRevealed(
        uint256 gameNumber,
        uint256 roundNumber
    ) public view returns (uint256) {
        return GameState[gameNumber].rounds[roundNumber].squaredRevealed;
    }

    function getTrianglesRevealed(
        uint256 gameNumber,
        uint256 roundNumber
    ) public view returns (uint256) {
        return GameState[gameNumber].rounds[roundNumber].trianglesRevealed;
    }

    function getPlayerCirclesRevealed(
        uint256 gameNumber,
        uint256 roundNumber,
        address player
    ) public view returns (uint256) {
        return
            GameState[gameNumber]
                .rounds[roundNumber]
                .players[player]
                .playerCirclesRevealed;
    }

    function getPlayerSquaresRevealed(
        uint256 gameNumber,
        uint256 roundNumber,
        address player
    ) public view returns (uint256) {
        return
            GameState[gameNumber]
                .rounds[roundNumber]
                .players[player]
                .playerSquaresRevealed;
    }

    function getPlayerTrianglesRevealed(
        uint256 gameNumber,
        uint256 roundNumber,
        address player
    ) public view returns (uint256) {
        return
            GameState[gameNumber]
                .rounds[roundNumber]
                .players[player]
                .playerTrianglesRevealed;
    }

    function currentRoundNumber() public view returns (uint256) {
        return GameState[currentGameNumber].roundNumber;
    }

    function currentGameTimestamp() public view returns (uint256) {
        return GameState[currentGameNumber].gameTimestamp;
    }

    function currentRoundTimestamp() public view returns (uint256) {
        return GameState[currentGameNumber].roundTimestamp;
    }
}
