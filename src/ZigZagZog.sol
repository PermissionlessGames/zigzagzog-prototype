// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

contract ZigZagZog {
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

    uint256 public constant handCost = 1000;
    uint64 public constant gameLength = 30;

    uint256 currentGameNumber = 0;

    mapping(uint256 => Game) public GameState;

    event PlayerCommitment(
        address indexed playerAddress,
        uint256 indexed gameNumber,
        uint256 indexed roundNumber
    );

    function buyHands() external payable {
        if (
            block.timestamp >
            GameState[currentGameNumber].startTimestamp + gameLength
        ) {
            currentGameNumber++;
            GameState[currentGameNumber].startTimestamp = block.timestamp;
            GameState[currentGameNumber].roundNumber = 1;
        }

        uint256 handCount = msg.value / handCost;
        require(
            handCount > 0,
            "ZigZagZog.buyHands(): insufficient value to buy a hand."
        );
        handsPurchased[currentGameNumber][msg.sender] = handCount;
        handsSurviving[currentGameNumber][msg.sender] = handCount;
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

        // bytes32 pitchMessageHash = pitchHash(
        //     nonce,
        //     speed,
        //     vertical,
        //     horizontal
        // );
        // require(
        //     SignatureChecker.isValidSignatureNow(
        //         msg.sender,
        //         pitchMessageHash,
        //         session.pitcherCommit
        //     ),
        //     "Fullcount.revealPitch: invalid signature"
        // );

        // session.didPitcherReveal = true;
        // session.pitcherReveal = Pitch(nonce, speed, vertical, horizontal);

        // emit PitchRevealed(sessionID, session.pitcherReveal);

        // if (session.didBatterReveal) {
        //     Outcome outcome = resolve(
        //         session.pitcherReveal,
        //         session.batterReveal
        //     );
        //     emit SessionResolved(
        //         sessionID,
        //         outcome,
        //         session.pitcherNFT.nftAddress,
        //         session.pitcherNFT.tokenID,
        //         session.batterNFT.nftAddress,
        //         session.batterNFT.tokenID
        //     );

        //     session.outcome = outcome;

        //     StakedSession[session.batterNFT.nftAddress][
        //         session.batterNFT.tokenID
        //     ] = 0;
        //     session.batterLeftSession = true;
        //     StakedSession[session.pitcherNFT.nftAddress][
        //         session.pitcherNFT.tokenID
        //     ] = 0;
        //     session.pitcherLeftSession = true;

        //     _progressAtBat(sessionID, true);
        // }
    }
}
