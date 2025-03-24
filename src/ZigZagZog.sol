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
        uint256 gameTimestamp;
        uint256 roundNumber;
        uint256 roundTimestamp;
    }

    // Game number => value staked into game
    mapping(uint256 => uint256) public gameBalance;
    // Game number => player address => number of hands purchased
    mapping(uint256 => mapping(address => uint256)) public purchasedPlays;
    // Game number => number of plays remaining
    mapping(uint256 => uint256) public survivingPlays;
    // Game number => player address => number of plays remaining
    mapping(uint256 => mapping(address => uint256)) public playerSurvivingPlays;
    // Game number => round number => player address => player has committed
    mapping(uint256 => mapping(uint256 => mapping(address => bool)))
        public playerHasCommitted;
    // Game number => round number => player address => player has revealed
    mapping(uint256 => mapping(uint256 => mapping(address => bool)))
        public playerHasRevealed;
    // Game number => round number => player address => player commitment
    mapping(uint256 => mapping(uint256 => mapping(address => bytes)))
        public playerCommitment;
    // Game number => round number => # of circles revealed
    mapping(uint256 => mapping(uint256 => uint256)) public circlesRevealed;
    // Game number => round number => # of squares revealed
    mapping(uint256 => mapping(uint256 => uint256)) public squaredRevealed;
    // Game number => round number => # of triangles revealed
    mapping(uint256 => mapping(uint256 => uint256)) public trianglesRevealed;
    // Game number => round number => player address => # of circles revealed by player
    mapping(uint256 => mapping(uint256 => mapping(address => uint256)))
        public playerCirclesRevealed;
    // Game number => round number => player address => # of squares revealed by player
    mapping(uint256 => mapping(uint256 => mapping(address => uint256)))
        public playerSquaresRevealed;
    // Game number => round number => player address => # of triangles revealed by player
    mapping(uint256 => mapping(uint256 => mapping(address => uint256)))
        public playerTrianglesRevealed;
    // Game number => round number => # of accounts revealing a circle
    mapping(uint256 => mapping(uint256 => uint256)) public circlePlayerCount;
    // Game number => round number => # of accounts revealing a square
    mapping(uint256 => mapping(uint256 => uint256)) public squarePlayerCount;
    // Game number => round number => # of accounts revealing a triangle
    mapping(uint256 => mapping(uint256 => uint256)) public trianglePlayerCount;
    // Game number => round number => account revealing last circle
    mapping(uint256 => mapping(uint256 => address)) public lastCircleRevealed;
    // Game number => round number => account revealing last square
    mapping(uint256 => mapping(uint256 => address)) public lastSquareRevealed;
    // Game number => round number => account revealing last triangle
    mapping(uint256 => mapping(uint256 => address)) public lastTriangleRevealed;

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

    function buyPlays(uint256 gameNumber) external payable {
        if (currentGameNumber == 0) {
            currentGameNumber++;
            GameState[currentGameNumber].gameTimestamp = block.timestamp;
            GameState[currentGameNumber].roundNumber = 1;
            GameState[currentGameNumber].roundTimestamp = block.timestamp;
        }

        if (gameNumber == currentGameNumber) {
            require(
                block.timestamp <=
                    GameState[currentGameNumber].gameTimestamp + commitDuration,
                "ZigZagZog.buyPlays: game is not in the first commit phase"
            );
        } else if (gameNumber == currentGameNumber + 1) {
            Game storage currentGame = GameState[currentGameNumber];
            require(
                block.timestamp >
                    currentGame.roundTimestamp +
                        commitDuration +
                        revealDuration &&
                    _willGameEnd(currentGameNumber, currentGame.roundNumber),
                "ZigZagZog.buyPlays: previous game has not yet ended"
            );
            currentGameNumber++;
            GameState[currentGameNumber].gameTimestamp = block.timestamp;
            GameState[currentGameNumber].roundNumber = 1;
            GameState[currentGameNumber].roundTimestamp = block.timestamp;
        } else {
            revert("ZigZagZog.buyPlays: game number is invalid");
        }

        uint256 numPlays = msg.value / playCost;
        require(
            numPlays > 0,
            "ZigZagZog.buyPlays(): insufficient value to buy a play."
        );
        purchasedPlays[currentGameNumber][msg.sender] = numPlays;
        playerSurvivingPlays[currentGameNumber][msg.sender] = numPlays;
        survivingPlays[currentGameNumber] += numPlays;

        uint256 stakedAmount = numPlays * playCost;
        gameBalance[currentGameNumber] = stakedAmount;
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
            signature != bytes(""),
            "ZigZagZog.commitChoices: signature is empty"
        );

        require(
            block.timestamp <= game.roundTimestamp + commitDuration,
            "ZigZagZog.commitChoices: commit window has passed"
        );

        require(
            !playerHasCommitted[gameNumber][roundNumber][msg.sender],
            "ZigZagZog.commitChoices: player already committed"
        );

        if (roundNumber > 1) {
            uint256 previousRound = roundNumber - 1;
            EliminationResult elimResult = _calculateEliminationResult(
                circlesRevealed[gameNumber][previousRound],
                squaredRevealed[gameNumber][previousRound],
                trianglesRevealed[gameNumber][previousRound]
            );

            _updateSurvivingPlays(gameNumber, roundNumber, elimResult);

            if (elimResult == EliminationResult.CircleEliminated) {
                playerSurvivingPlays[gameNumber][msg.sender] =
                    playerSquaresRevealed[gameNumber][previousRound][
                        msg.sender
                    ] +
                    playerTrianglesRevealed[gameNumber][previousRound][
                        msg.sender
                    ];
            } else if (elimResult == EliminationResult.SquareEliminated) {
                playerSurvivingPlays[gameNumber][msg.sender] =
                    playerCirclesRevealed[gameNumber][previousRound][
                        msg.sender
                    ] +
                    playerTrianglesRevealed[gameNumber][previousRound][
                        msg.sender
                    ];
            } else if (elimResult == EliminationResult.TriangleEliminated) {
                playerSurvivingPlays[gameNumber][msg.sender] =
                    playerCirclesRevealed[gameNumber][previousRound][
                        msg.sender
                    ] +
                    playerSquaresRevealed[gameNumber][previousRound][
                        msg.sender
                    ];
            } else {
                revert("ZigZagZog.commitChoices: game has ended");
            }

            require(
                playerSurvivingPlays[gameNumber][msg.sender] > 0,
                "ZigZagZog.commitChoices: player has no remaining plays"
            );

            if (
                survivingPlays[gameNumber] <= 2 ||
                survivingPlays[gameNumber] ==
                playerSurvivingPlays[gameNumber][msg.sender]
            ) {
                revert("ZigZagZog.commitChoices: game has ended");
            }
        }

        playerHasCommitted[gameNumber][roundNumber][msg.sender] = true;
        playerCommitment[gameNumber][roundNumber][msg.sender] = signature;

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
        require(
            !playerHasRevealed[gameNumber][roundNumber][msg.sender],
            "ZigZagZog.revealChoices: player already revealed"
        );

        Game memory game = GameState[gameNumber];
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
                playerCommitment[gameNumber][roundNumber][msg.sender]
            ),
            "ZigZagZog.revealChoices: invalid signature"
        );

        require(
            numCircles + numSquares + numTriangles ==
                playerSurvivingPlays[gameNumber][msg.sender],
            "ZigZagZog.revealChoices: insufficient remaining plays"
        );

        if (numCircles > 0) {
            circlePlayerCount[gameNumber][roundNumber] += 1;
            circlesRevealed[gameNumber][roundNumber] += numCircles;
            playerCirclesRevealed[gameNumber][roundNumber][
                msg.sender
            ] = numCircles;
            lastCircleRevealed[gameNumber][roundNumber] = msg.sender;
        }

        if (numSquares > 0) {
            squarePlayerCount[gameNumber][roundNumber] += 1;
            squaredRevealed[gameNumber][roundNumber] += numSquares;
            playerSquaresRevealed[gameNumber][roundNumber][
                msg.sender
            ] = numSquares;
            lastSquareRevealed[gameNumber][roundNumber] = msg.sender;
        }

        if (numTriangles > 0) {
            trianglePlayerCount[gameNumber][roundNumber] += 1;
            trianglesRevealed[gameNumber][roundNumber] += numTriangles;
            playerTrianglesRevealed[gameNumber][roundNumber][
                msg.sender
            ] = numTriangles;
            lastTriangleRevealed[gameNumber][roundNumber] = msg.sender;
        }

        playerHasRevealed[gameNumber][roundNumber][msg.sender] = true;

        if (_willGameEnd(gameNumber, roundNumber)) {
            GameState[gameNumber + 1].gameTimestamp = block.timestamp;
        } else {
            GameState[gameNumber + 1].gameTimestamp = 0;
        }
    }

    function claimWinnings(uint256 gameNumber) external {
        Game memory game = GameState[gameNumber];

        EliminationResult elimResult = _calculateEliminationResult(
            circlesRevealed[gameNumber][game.roundNumber],
            squaredRevealed[gameNumber][game.roundNumber],
            trianglesRevealed[gameNumber][game.roundNumber]
        );

        _updateSurvivingPlays(gameNumber, game.roundNumber, elimResult);

        // Payout msg.sender proportional to equity
    }

    function hasGameEnded(uint256 gameNumber) external view returns (bool) {
        // Check timers.
        Game memory game = GameState[gameNumber];

        return _willGameEnd(gameNumber, game.roundNumber);
    }

    function _willGameEnd(
        uint256 gameNumber,
        uint256 roundNumber
    ) internal view returns (bool) {
        uint256 circles = circlesRevealed[gameNumber][roundNumber];
        uint256 squares = squaredRevealed[gameNumber][roundNumber];
        uint256 triangles = trianglesRevealed[gameNumber][roundNumber];
        if (circles + squares + triangles == 0) {
            return true;
        }

        EliminationResult elimResult = _calculateEliminationResult(
            circles,
            squares,
            triangles
        );

        uint256 rawCountRemaining;
        if (elimResult == EliminationResult.CircleEliminated) {
            rawCountRemaining =
                squarePlayerCount[gameNumber][roundNumber] +
                trianglePlayerCount[gameNumber][roundNumber];
            if (rawCountRemaining == 1) {
                return true;
            } else if (rawCountRemaining == 2) {
                return
                    lastSquareRevealed[gameNumber][roundNumber] ==
                    lastTriangleRevealed[gameNumber][roundNumber];
            } else {
                return false;
            }
        } else if (elimResult == EliminationResult.SquareEliminated) {
            rawCountRemaining =
                circlePlayerCount[gameNumber][roundNumber] +
                trianglePlayerCount[gameNumber][roundNumber];
            if (rawCountRemaining == 1) {
                return true;
            } else if (rawCountRemaining == 2) {
                return
                    lastCircleRevealed[gameNumber][roundNumber] ==
                    lastTriangleRevealed[gameNumber][roundNumber];
            } else {
                return false;
            }
        } else if (elimResult == EliminationResult.TriangleEliminated) {
            rawCountRemaining =
                circlePlayerCount[gameNumber][roundNumber] +
                squarePlayerCount[gameNumber][roundNumber];
            if (rawCountRemaining == 1) {
                return true;
            } else if (rawCountRemaining == 2) {
                return
                    lastCircleRevealed[gameNumber][roundNumber] ==
                    lastSquareRevealed[gameNumber][roundNumber];
            } else {
                return false;
            }
        } else {
            return true;
        }
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
            } else {
                return EliminationResult.CircleEliminated;
            }
        } else {
            if (_squaresRevealed >= _trianglesRevealed) {
                return EliminationResult.SquareEliminated;
            } else {
                return EliminationResult.TriangleEliminated;
            }
        }
    }

    function _updateSurvivingPlays(
        uint256 gameNumber,
        uint256 roundNumber,
        EliminationResult elimResult
    ) internal {
        uint256 previousRound = roundNumber - 1;

        if (elimResult == EliminationResult.CircleEliminated) {
            survivingPlays[gameNumber] =
                squaredRevealed[gameNumber][previousRound] +
                trianglesRevealed[gameNumber][previousRound];
        } else if (elimResult == EliminationResult.SquareEliminated) {
            survivingPlays[gameNumber] =
                circlesRevealed[gameNumber][previousRound] +
                trianglesRevealed[gameNumber][previousRound];
        } else if (elimResult == EliminationResult.TriangleEliminated) {
            survivingPlays[gameNumber] =
                circlesRevealed[gameNumber][previousRound] +
                squaredRevealed[gameNumber][previousRound];
        }
    }
}
