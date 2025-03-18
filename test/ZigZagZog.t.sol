// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "../lib/forge-std/src/Test.sol";
import {ZigZagZog} from "../src/ZigZagZog.sol";

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
}

contract ZigZagZogTest_deployment is ZigZagZogTestBase {
    function test_Deployment() public {
        ZigZagZog newGame = new ZigZagZog(
            playCost,
            commitDuration,
            revealDuration
        );
        assertEq(newGame.playCost(), playCost);
        assertEq(newGame.commitDuration(), commitDuration);
        assertEq(newGame.revealDuration(), revealDuration);
    }
}

/**
 * buyHands tests:
 */
contract ZigZagZogTest_buyHands is ZigZagZogTestBase {
    function test_buy_hands() public {
        uint256 buyinAmount = 10 * playCost;
        uint256 initialBalance = player1.balance;

        vm.startPrank(player1);
        game.buyPlays{value: buyinAmount}();
        vm.stopPrank();

        uint256 gameNumber = game.currentGameNumber();

        assertEq(game.getGameBalance(gameNumber), buyinAmount);
        assertEq(player1.balance, initialBalance - buyinAmount);

        assertEq(game.getPurchasedPlays(gameNumber, player1), 10);
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

        assertEq(game.getPurchasedPlays(gameNumber, player1), 0);
    }

    function test_buy_hands_will_refund_excess_payment() public {
        uint256 buyinAmount = playCost + 10 wei;
        uint256 initialBalance = player1.balance;

        vm.startPrank(player1);
        game.buyPlays{value: buyinAmount}();
        vm.stopPrank();

        uint256 gameNumber = game.currentGameNumber();

        assertEq(player1.balance, initialBalance - playCost);

        assertEq(game.getPurchasedPlays(gameNumber, player1), 10);
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

        assertFalse(
            game.getPlayerHasCommitted(gameNumber, roundNumber, player1)
        );

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

        assertTrue(
            game.getPlayerHasCommitted(gameNumber, roundNumber, player1)
        );
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

        assertFalse(
            game.getPlayerHasCommitted(gameNumber, roundNumber, player1)
        );
        assertFalse(
            game.getPlayerHasRevealed(gameNumber, roundNumber, player1)
        );

        game.commitChoices(gameNumber, roundNumber, signature);

        assertTrue(
            game.getPlayerHasCommitted(gameNumber, roundNumber, player1)
        );
        assertFalse(
            game.getPlayerHasRevealed(gameNumber, roundNumber, player1)
        );

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

        assertFalse(
            game.getPlayerHasCommitted(gameNumber, roundNumber, player1)
        );
        assertFalse(
            game.getPlayerHasRevealed(gameNumber, roundNumber, player1)
        );

        game.commitChoices(gameNumber, roundNumber, signature);

        assertTrue(
            game.getPlayerHasCommitted(gameNumber, roundNumber, player1)
        );
        assertFalse(
            game.getPlayerHasRevealed(gameNumber, roundNumber, player1)
        );

        vm.warp(block.timestamp + commitDuration + 1); // Commit window has elapsed

        game.revealChoices(
            gameNumber,
            roundNumber,
            p1Nonce,
            numCircles,
            numSquares,
            numTriangles
        );

        assertTrue(
            game.getPlayerHasCommitted(gameNumber, roundNumber, player1)
        );
        assertTrue(game.getPlayerHasRevealed(gameNumber, roundNumber, player1));

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

        assertFalse(
            game.getPlayerHasCommitted(gameNumber, roundNumber, player1)
        );
        assertFalse(
            game.getPlayerHasRevealed(gameNumber, roundNumber, player1)
        );

        game.commitChoices(gameNumber, roundNumber, signature);

        assertTrue(
            game.getPlayerHasCommitted(gameNumber, roundNumber, player1)
        );
        assertFalse(
            game.getPlayerHasRevealed(gameNumber, roundNumber, player1)
        );

        vm.warp(block.timestamp + commitDuration + 1); // Commit window has elapsed

        game.revealChoices(
            gameNumber,
            roundNumber,
            p1Nonce,
            numCircles,
            numSquares,
            numTriangles
        );

        assertTrue(
            game.getPlayerHasCommitted(gameNumber, roundNumber, player1)
        );
        assertTrue(game.getPlayerHasRevealed(gameNumber, roundNumber, player1));

        vm.expectRevert("ZigZagZog.revealChoices: player already revealed");
        game.revealChoices(
            gameNumber,
            roundNumber,
            p1Nonce,
            numCircles,
            numSquares,
            numTriangles
        );

        assertTrue(
            game.getPlayerHasCommitted(gameNumber, roundNumber, player1)
        );
        assertTrue(game.getPlayerHasRevealed(gameNumber, roundNumber, player1));

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

        assertFalse(
            game.getPlayerHasCommitted(gameNumber, roundNumber, player1)
        );
        assertFalse(
            game.getPlayerHasRevealed(gameNumber, roundNumber, player1)
        );

        game.commitChoices(gameNumber, roundNumber, signature);

        assertTrue(
            game.getPlayerHasCommitted(gameNumber, roundNumber, player1)
        );
        assertFalse(
            game.getPlayerHasRevealed(gameNumber, roundNumber, player1)
        );

        vm.warp(block.timestamp + commitDuration + 1); // Commit window has elapsed

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

        assertTrue(
            game.getPlayerHasCommitted(gameNumber, roundNumber, player1)
        );
        assertFalse(
            game.getPlayerHasRevealed(gameNumber, roundNumber, player1)
        );

        game.revealChoices(
            gameNumber,
            roundNumber,
            p1Nonce,
            numCircles,
            numSquares,
            numTriangles
        );

        assertTrue(
            game.getPlayerHasCommitted(gameNumber, roundNumber, player1)
        );
        assertTrue(game.getPlayerHasRevealed(gameNumber, roundNumber, player1));

        vm.stopPrank();
    }

    function testRevert_reveal_before_reveal_phase_begins() public {
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

        assertFalse(
            game.getPlayerHasCommitted(gameNumber, roundNumber, player1)
        );
        assertFalse(
            game.getPlayerHasRevealed(gameNumber, roundNumber, player1)
        );

        game.commitChoices(gameNumber, roundNumber, signature);

        assertTrue(
            game.getPlayerHasCommitted(gameNumber, roundNumber, player1)
        );
        assertFalse(
            game.getPlayerHasRevealed(gameNumber, roundNumber, player1)
        );

        vm.warp(block.timestamp + commitDuration); // Last second of commit window

        vm.expectRevert(
            "ZigZagZog.revealChoices: reveal phase has not yet begun"
        );
        game.revealChoices(
            gameNumber,
            roundNumber,
            p1Nonce,
            numCircles,
            numSquares,
            numTriangles
        );

        vm.stopPrank();
    }

    function testRevert_reveal_after_reveal_duration_has_elasped() public {
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

        assertFalse(
            game.getPlayerHasCommitted(gameNumber, roundNumber, player1)
        );
        assertFalse(
            game.getPlayerHasRevealed(gameNumber, roundNumber, player1)
        );

        game.commitChoices(gameNumber, roundNumber, signature);

        assertTrue(
            game.getPlayerHasCommitted(gameNumber, roundNumber, player1)
        );
        assertFalse(
            game.getPlayerHasRevealed(gameNumber, roundNumber, player1)
        );

        vm.warp(block.timestamp + commitDuration + revealDuration + 1); // round has ended

        vm.expectRevert("ZigZagZog.revealChoices: reveal phase has ended");
        game.revealChoices(
            gameNumber,
            roundNumber,
            p1Nonce,
            numCircles,
            numSquares,
            numTriangles
        );

        vm.stopPrank();
    }

    // function test_commit_choices_round_2() public {
    //     uint256 roundNumber = 1; // Ask contract for round number?

    //     uint256 p1Nonce = 0x1902a;
    //     uint256 numCircles = 6;
    //     uint256 numSquares = 3;
    //     uint256 numTriangles = 1;

    //     bytes32 choicesMessageHash = game.choicesHash(
    //         p1Nonce,
    //         gameNumber,
    //         roundNumber,
    //         numCircles,
    //         numSquares,
    //         numTriangles
    //     );
    //     bytes memory signature = signMessageHash(
    //         player1PrivateKey,
    //         choicesMessageHash
    //     );

    //     vm.startPrank(player1);

    //     assertFalse(game.playerHasCommitted(gameNumber, roundNumber, player1));
    //     assertFalse(game.playerHasRevealed(gameNumber, roundNumber, player1));

    //     game.commitChoices(gameNumber, roundNumber, signature);

    //     assertTrue(game.playerHasCommitted(gameNumber, roundNumber, player1));
    //     assertFalse(game.playerHasRevealed(gameNumber, roundNumber, player1));

    //     vm.warp(block.timestamp + commitDuration + 1); // Commit window has elapsed

    //     game.revealChoices(
    //         gameNumber,
    //         roundNumber,
    //         p1Nonce,
    //         numCircles,
    //         numSquares,
    //         numTriangles
    //     );

    //     assertTrue(game.playerHasCommitted(gameNumber, roundNumber, player1));
    //     assertTrue(game.playerHasRevealed(gameNumber, roundNumber, player1));

    //     vm.warp(block.timestamp + revealDuration); // Reveal window has elapsed

    //     roundNumber = 2;

    //     choicesMessageHash = game.choicesHash(
    //         p1Nonce,
    //         gameNumber,
    //         roundNumber,
    //         numCircles,
    //         numSquares,
    //         numTriangles
    //     );
    //     signature = signMessageHash(player1PrivateKey, choicesMessageHash);
    //     game.commitChoices(gameNumber, roundNumber, signature);

    //     assertTrue(game.playerHasCommitted(gameNumber, roundNumber, player1));
    //     assertFalse(game.playerHasRevealed(gameNumber, roundNumber, player1));

    //     vm.stopPrank();
    // }

    function testRevert_commit_if_round_has_not_started() public {
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

        assertFalse(
            game.getPlayerHasCommitted(gameNumber, roundNumber, player1)
        );
        assertFalse(
            game.getPlayerHasRevealed(gameNumber, roundNumber, player1)
        );

        game.commitChoices(gameNumber, roundNumber, signature);

        vm.warp(block.timestamp + commitDuration + 1); // Commit window has elapsed

        assertTrue(
            game.getPlayerHasCommitted(gameNumber, roundNumber, player1)
        );
        assertFalse(
            game.getPlayerHasRevealed(gameNumber, roundNumber, player1)
        );

        game.revealChoices(
            gameNumber,
            roundNumber,
            p1Nonce,
            numCircles,
            numSquares,
            numTriangles
        );

        assertTrue(
            game.getPlayerHasCommitted(gameNumber, roundNumber, player1)
        );
        assertTrue(game.getPlayerHasRevealed(gameNumber, roundNumber, player1));

        vm.warp(block.timestamp + revealDuration - 1); // last second in round

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

        assertFalse(
            game.getPlayerHasCommitted(gameNumber, roundNumber, player1)
        );
        assertFalse(
            game.getPlayerHasRevealed(gameNumber, roundNumber, player1)
        );

        vm.expectRevert("ZigZagZog.commitChoices: round hasn't started yet");
        game.commitChoices(gameNumber, roundNumber, signature);

        vm.stopPrank();
    }
}
