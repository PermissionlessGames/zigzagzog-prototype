// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "../lib/forge-std/src/Test.sol";
import {ZigZagZog} from "../src/ZigZagZog.sol";

contract ZigZagZogTestBase is Test {
    ZigZagZog public game;

    uint256 playCost = 1000;
    uint64 commitDuration = 30;
    uint64 revealDuration = 15;
    uint64 roundDuration = commitDuration + revealDuration;

    uint256 player1PrivateKey = 0x1;
    uint256 player2PrivateKey = 0x2;
    uint256 randomPersonPrivateKey = 0x77;
    uint256 poorPlayerPrivateKey = 0x88;

    address player1 = vm.addr(player1PrivateKey);
    address player2 = vm.addr(player2PrivateKey);
    address randomPerson = vm.addr(randomPersonPrivateKey);
    address poorPlayer = vm.addr(poorPlayerPrivateKey);

    function signMessageHash(
        uint256 privateKey,
        bytes32 messageHash
    ) internal pure returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, messageHash);
        return abi.encodePacked(r, s, v);
    }

    function setUp() public virtual {
        game = new ZigZagZog(playCost, commitDuration, revealDuration);
        deal(player1, 100000 wei);
    }

    // function _commitPitch(
    //     uint256 sessionID,
    //     address player,
    //     uint256 playerPrivateKey,
    //     Pitch memory pitch
    // ) internal {
    //     vm.startPrank(player);

    //     bytes32 pitchMessageHash = game.pitchHash(
    //         pitch.nonce,
    //         pitch.speed,
    //         pitch.vertical,
    //         pitch.horizontal
    //     );
    //     bytes memory pitcherCommitment = signMessageHash(
    //         playerPrivateKey,
    //         pitchMessageHash
    //     );

    //     vm.expectEmit(address(game));
    //     emit PitchCommitted(sessionID);
    //     game.commitPitch(sessionID, pitcherCommitment);

    //     vm.stopPrank();

    //     Session memory session = game.getSession(sessionID);

    //     assertTrue(session.didPitcherCommit);

    //     assertEq(session.pitcherCommit, pitcherCommitment);
    // }

    // function _revealPitch(
    //     uint256 sessionID,
    //     address player,
    //     Pitch memory pitch
    // ) internal {
    //     vm.startPrank(player);

    //     vm.expectEmit(address(game));
    //     emit PitchRevealed(sessionID, pitch);
    //     game.revealPitch(
    //         sessionID,
    //         pitch.nonce,
    //         pitch.speed,
    //         pitch.vertical,
    //         pitch.horizontal
    //     );

    //     vm.stopPrank();

    //     Session memory session = game.getSession(sessionID);
    //     assertTrue(session.didPitcherReveal);

    //     Pitch memory sessionPitch = session.pitcherReveal;
    //     assertEq(sessionPitch.nonce, pitch.nonce);
    //     assertEq(uint256(sessionPitch.speed), uint256(pitch.speed));
    //     assertEq(uint256(sessionPitch.vertical), uint256(pitch.vertical));
    //     assertEq(uint256(sessionPitch.horizontal), uint256(pitch.horizontal));
    // }
}

// contract ZigZagZogTestDeployment is ZigZagZogTestBase {
//     function test_Deployment() public {
//         ZigZagZog newGame = new ZigZagZog(
//             playCost,
//             commitDuration,
//             revealDuration
//         );
//         assertEq(newGame.playCost(), playCost);
//         assertEq(newGame.commitDuration(), commitDuration);
//         assertEq(newGame.revealDuration(), revealDuration);
//     }
// }

/**
 * buyHands tests:
 */
contract ZigZagZogTest_buyHands is ZigZagZogTestBase {
    function test_buy_hands() public {
        uint256 buyinAmount = 10000 wei;
        uint256 initialBalance = player1.balance;

        vm.startPrank(player1);
        game.buyPlays{value: buyinAmount}();
        vm.stopPrank();

        uint256 gameNumber = game.currentGameNumber();

        assertEq(player1.balance, initialBalance - buyinAmount);

        assertEq(
            game.purchasedPlays(gameNumber, player1),
            buyinAmount / playCost
        );
    }

    function testRevert_if_value_is_insufficient_to_buy_a_hand() public {
        uint256 buyinAmount = 500 wei;
        uint256 initialBalance = player1.balance;

        uint256 gameNumber = game.currentGameNumber();

        vm.startPrank(player1);
        vm.expectRevert(
            "ZigZagZog.buyPlays(): insufficient value to buy a play."
        );
        game.buyPlays{value: buyinAmount}();
        vm.stopPrank();

        assertEq(player1.balance, initialBalance);

        assertEq(game.purchasedPlays(gameNumber, player1), 0);
    }
}

/**
 * commit/reveal tests:
 */
contract ZigZagZogTest_commitChoices is ZigZagZogTestBase {
    uint256 gameNumber;
    uint256 handCount;

    function setUp() public virtual override {
        super.setUp();

        uint256 buyinAmount = 10000 wei;
        handCount = buyinAmount / playCost;

        vm.startPrank(player1);
        game.buyPlays{value: buyinAmount}();
        vm.stopPrank();

        gameNumber = game.currentGameNumber();
    }

    function test_commit_choices() public {
        uint256 roundNumber = 1;

        assertFalse(game.playerHasCommitted(gameNumber, roundNumber, player1));

        uint256 p1Nonce = 0x1902a;
        uint256 numCircles = 6;
        uint256 numSquares = 3;
        uint256 numTriangles = 1;

        bytes32 choicesMessageHash = game.choicesHash(
            p1Nonce,
            gameNumber,
            roundNumber,
            numCircles,
            numSquares,
            numTriangles
        );
        bytes memory signature = signMessageHash(
            player1PrivateKey,
            choicesMessageHash
        );

        vm.startPrank(player1);
        game.commitChoices(gameNumber, roundNumber, signature);
        vm.stopPrank();

        assertTrue(game.playerHasCommitted(gameNumber, roundNumber, player1));
    }

    function testRevert_commit_multiple_times() public {
        uint256 roundNumber = 1;

        uint256 p1Nonce = 0x1902a;
        uint256 numCircles = 6;
        uint256 numSquares = 3;
        uint256 numTriangles = 1;

        bytes32 choicesMessageHash = game.choicesHash(
            p1Nonce,
            gameNumber,
            roundNumber,
            numCircles,
            numSquares,
            numTriangles
        );
        bytes memory signature = signMessageHash(
            player1PrivateKey,
            choicesMessageHash
        );

        vm.startPrank(player1);

        assertFalse(game.playerHasCommitted(gameNumber, roundNumber, player1));
        assertFalse(game.playerHasRevealed(gameNumber, roundNumber, player1));

        game.commitChoices(gameNumber, roundNumber, signature);

        assertTrue(game.playerHasCommitted(gameNumber, roundNumber, player1));
        assertFalse(game.playerHasRevealed(gameNumber, roundNumber, player1));

        vm.expectRevert("ZigZagZog.commitChoices: player already committed");
        game.commitChoices(gameNumber, roundNumber, signature);

        vm.stopPrank();
    }

    function test_reveal_choices() public {
        uint256 roundNumber = 1;

        uint256 p1Nonce = 0x1902a;
        uint256 numCircles = 6;
        uint256 numSquares = 3;
        uint256 numTriangles = 1;

        bytes32 choicesMessageHash = game.choicesHash(
            p1Nonce,
            gameNumber,
            roundNumber,
            numCircles,
            numSquares,
            numTriangles
        );
        bytes memory signature = signMessageHash(
            player1PrivateKey,
            choicesMessageHash
        );

        vm.startPrank(player1);

        assertFalse(game.playerHasCommitted(gameNumber, roundNumber, player1));
        assertFalse(game.playerHasRevealed(gameNumber, roundNumber, player1));

        game.commitChoices(gameNumber, roundNumber, signature);

        assertTrue(game.playerHasCommitted(gameNumber, roundNumber, player1));
        assertFalse(game.playerHasRevealed(gameNumber, roundNumber, player1));

        game.revealChoices(
            gameNumber,
            roundNumber,
            p1Nonce,
            numCircles,
            numSquares,
            numTriangles
        );

        assertTrue(game.playerHasCommitted(gameNumber, roundNumber, player1));
        assertTrue(game.playerHasRevealed(gameNumber, roundNumber, player1));

        vm.stopPrank();
    }

    function testRevert_reveal_multiple_times() public {
        uint256 roundNumber = 1;

        uint256 p1Nonce = 0x1902a;
        uint256 numCircles = 6;
        uint256 numSquares = 3;
        uint256 numTriangles = 1;

        bytes32 choicesMessageHash = game.choicesHash(
            p1Nonce,
            gameNumber,
            roundNumber,
            numCircles,
            numSquares,
            numTriangles
        );
        bytes memory signature = signMessageHash(
            player1PrivateKey,
            choicesMessageHash
        );

        vm.startPrank(player1);

        assertFalse(game.playerHasCommitted(gameNumber, roundNumber, player1));
        assertFalse(game.playerHasRevealed(gameNumber, roundNumber, player1));

        game.commitChoices(gameNumber, roundNumber, signature);

        assertTrue(game.playerHasCommitted(gameNumber, roundNumber, player1));
        assertFalse(game.playerHasRevealed(gameNumber, roundNumber, player1));

        game.revealChoices(
            gameNumber,
            roundNumber,
            p1Nonce,
            numCircles,
            numSquares,
            numTriangles
        );

        assertTrue(game.playerHasCommitted(gameNumber, roundNumber, player1));
        assertTrue(game.playerHasRevealed(gameNumber, roundNumber, player1));

        vm.expectRevert("ZigZagZog.revealChoices: player already revealed");
        game.revealChoices(
            gameNumber,
            roundNumber,
            p1Nonce,
            numCircles,
            numSquares,
            numTriangles
        );

        assertTrue(game.playerHasCommitted(gameNumber, roundNumber, player1));
        assertTrue(game.playerHasRevealed(gameNumber, roundNumber, player1));

        vm.stopPrank();
    }

    function testRevert_reveal_with_invalid_signature() public {
        uint256 roundNumber = 1;

        uint256 p1Nonce = 0x1902a;
        uint256 numCircles = 6;
        uint256 numSquares = 3;
        uint256 numTriangles = 1;

        bytes32 choicesMessageHash = game.choicesHash(
            p1Nonce,
            gameNumber,
            roundNumber,
            numCircles,
            numSquares,
            numTriangles
        );
        bytes memory signature = signMessageHash(
            player1PrivateKey,
            choicesMessageHash
        );

        vm.startPrank(player1);

        assertFalse(game.playerHasCommitted(gameNumber, roundNumber, player1));
        assertFalse(game.playerHasRevealed(gameNumber, roundNumber, player1));

        game.commitChoices(gameNumber, roundNumber, signature);

        assertTrue(game.playerHasCommitted(gameNumber, roundNumber, player1));
        assertFalse(game.playerHasRevealed(gameNumber, roundNumber, player1));

        vm.expectRevert("ZigZagZog.revealChoices: invalid signature");
        game.revealChoices(
            25,
            roundNumber,
            p1Nonce,
            numCircles,
            numSquares,
            numTriangles
        );

        vm.expectRevert("ZigZagZog.revealChoices: invalid signature");
        game.revealChoices(25, roundNumber, p1Nonce, numCircles, numSquares, 2);

        assertTrue(game.playerHasCommitted(gameNumber, roundNumber, player1));
        assertFalse(game.playerHasRevealed(gameNumber, roundNumber, player1));

        game.revealChoices(
            gameNumber,
            roundNumber,
            p1Nonce,
            numCircles,
            numSquares,
            numTriangles
        );

        assertTrue(game.playerHasCommitted(gameNumber, roundNumber, player1));
        assertTrue(game.playerHasRevealed(gameNumber, roundNumber, player1));

        vm.stopPrank();
    }

    function test_commit_choices_round_2() public {
        uint256 roundNumber = 1; // Ask contract for round number?

        uint256 p1Nonce = 0x1902a;
        uint256 numCircles = 6;
        uint256 numSquares = 3;
        uint256 numTriangles = 1;

        bytes32 choicesMessageHash = game.choicesHash(
            p1Nonce,
            gameNumber,
            roundNumber,
            numCircles,
            numSquares,
            numTriangles
        );
        bytes memory signature = signMessageHash(
            player1PrivateKey,
            choicesMessageHash
        );

        vm.startPrank(player1);

        assertFalse(game.playerHasCommitted(gameNumber, roundNumber, player1));
        assertFalse(game.playerHasRevealed(gameNumber, roundNumber, player1));

        game.commitChoices(gameNumber, roundNumber, signature);

        assertTrue(game.playerHasCommitted(gameNumber, roundNumber, player1));
        assertFalse(game.playerHasRevealed(gameNumber, roundNumber, player1));

        game.revealChoices(
            gameNumber,
            roundNumber,
            p1Nonce,
            numCircles,
            numSquares,
            numTriangles
        );

        assertTrue(game.playerHasCommitted(gameNumber, roundNumber, player1));
        assertTrue(game.playerHasRevealed(gameNumber, roundNumber, player1));

        vm.warp(block.timestamp + roundDuration + 1);

        roundNumber = 2;

        choicesMessageHash = game.choicesHash(
            p1Nonce,
            gameNumber,
            roundNumber,
            numCircles,
            numSquares,
            numTriangles
        );
        signature = signMessageHash(player1PrivateKey, choicesMessageHash);
        game.commitChoices(gameNumber, roundNumber, signature);

        assertTrue(game.playerHasCommitted(gameNumber, roundNumber, player1));
        assertFalse(game.playerHasRevealed(gameNumber, roundNumber, player1));

        vm.stopPrank();
    }

    function testRevert_if_round_has_not_started() public {
        uint256 roundNumber = 1; // Ask contract for round number?

        uint256 p1Nonce = 0x1902a;
        uint256 numCircles = 6;
        uint256 numSquares = 3;
        uint256 numTriangles = 1;

        bytes32 choicesMessageHash = game.choicesHash(
            p1Nonce,
            gameNumber,
            roundNumber,
            numCircles,
            numSquares,
            numTriangles
        );
        bytes memory signature = signMessageHash(
            player1PrivateKey,
            choicesMessageHash
        );

        vm.startPrank(player1);

        assertFalse(game.playerHasCommitted(gameNumber, roundNumber, player1));
        assertFalse(game.playerHasRevealed(gameNumber, roundNumber, player1));

        game.commitChoices(gameNumber, roundNumber, signature);

        assertTrue(game.playerHasCommitted(gameNumber, roundNumber, player1));
        assertFalse(game.playerHasRevealed(gameNumber, roundNumber, player1));

        game.revealChoices(
            gameNumber,
            roundNumber,
            p1Nonce,
            numCircles,
            numSquares,
            numTriangles
        );

        assertTrue(game.playerHasCommitted(gameNumber, roundNumber, player1));
        assertTrue(game.playerHasRevealed(gameNumber, roundNumber, player1));

        vm.warp(block.timestamp + roundDuration); // last second in round

        roundNumber = 2;

        choicesMessageHash = game.choicesHash(
            p1Nonce,
            gameNumber,
            roundNumber,
            numCircles,
            numSquares,
            numTriangles
        );
        signature = signMessageHash(player1PrivateKey, choicesMessageHash);
        vm.expectRevert("ZigZagZog.commitChoices: round hasn't started yet");
        game.commitChoices(gameNumber, roundNumber, signature);

        vm.stopPrank();
    }

    function testRevert_if_commit_is_more_than_one_round_ahead() public {
        uint256 roundNumber = 3; // Ask contract for round number?

        uint256 p1Nonce = 0x1902a;
        uint256 numCircles = 6;
        uint256 numSquares = 3;
        uint256 numTriangles = 1;

        bytes32 choicesMessageHash = game.choicesHash(
            p1Nonce,
            gameNumber,
            roundNumber,
            numCircles,
            numSquares,
            numTriangles
        );
        bytes memory signature = signMessageHash(
            player1PrivateKey,
            choicesMessageHash
        );

        vm.startPrank(player1);

        assertFalse(game.playerHasCommitted(gameNumber, roundNumber, player1));
        assertFalse(game.playerHasRevealed(gameNumber, roundNumber, player1));

        vm.expectRevert("ZigZagZog.commitChoices: round hasn't started yet");
        game.commitChoices(gameNumber, roundNumber, signature);

        vm.stopPrank();
    }
}
