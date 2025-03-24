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

    function _signMessageHash(uint256 privateKey, bytes32 messageHash) internal pure returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, messageHash);
        return abi.encodePacked(r, s, v);
    }

    function _bytesToHexString(bytes memory _bytes) internal pure returns (string memory) {
        bytes memory HEX_SYMBOLS = "0123456789abcdef";
        uint256 length = _bytes.length;
        bytes memory buffer = new bytes(2 * length + 2); // "0x" prefix
        buffer[0] = "0";
        buffer[1] = "x";

        for (uint256 i = 0; i < length; i++) {
            buffer[2 + i * 2] = HEX_SYMBOLS[uint8(_bytes[i] >> 4)];
            buffer[3 + i * 2] = HEX_SYMBOLS[uint8(_bytes[i] & 0x0f)];
        }

        return string(buffer);
    }

    function setUp() public virtual {
        game = new ZigZagZog(playCost, commitDuration, revealDuration);
        deal(player1, 100000 wei);
    }
}

contract ZigZagZogTest_deployment is ZigZagZogTestBase {
    function test_Deployment() public {
        ZigZagZog newGame = new ZigZagZog(playCost, commitDuration, revealDuration);
        assertEq(newGame.playCost(), playCost);
        assertEq(newGame.commitDuration(), commitDuration);
        assertEq(newGame.revealDuration(), revealDuration);
    }
}

/**
 * buyPlays tests:
 */
contract ZigZagZogTest_buyPlays is ZigZagZogTestBase {
    function test_buy_plays() public {
        uint256 buyinAmount = 10 * playCost;
        uint256 initialBalance = player1.balance;

        vm.startPrank(player1);
        game.buyPlays{value: buyinAmount}(1);

        uint256 gameNumber = game.currentGameNumber();

        assertEq(game.gameBalance(gameNumber), buyinAmount);
        assertEq(player1.balance, initialBalance - buyinAmount);

        assertEq(game.purchasedPlays(gameNumber, player1), buyinAmount / playCost);

        vm.warp(block.timestamp + commitDuration + revealDuration + 1); // Previous game has ended.

        // buy plays in next game
        gameNumber++;

        game.buyPlays{value: buyinAmount}(gameNumber);

        assertEq(game.gameBalance(gameNumber), buyinAmount);
        assertEq(player1.balance, initialBalance - 2 * buyinAmount);

        assertEq(game.purchasedPlays(gameNumber, player1), buyinAmount / playCost);

        vm.stopPrank();
    }

    function testRevert_if_value_is_insufficient_to_buy_a_play() public {
        uint256 buyinAmount = 500 wei;
        uint256 initialBalance = player1.balance;

        uint256 gameNumber = game.currentGameNumber();

        vm.startPrank(player1);
        vm.expectRevert("ZigZagZog.buyPlays(): insufficient value to buy a play.");
        game.buyPlays{value: buyinAmount}(1);
        vm.stopPrank();

        assertEq(player1.balance, initialBalance);

        assertEq(game.purchasedPlays(gameNumber, player1), 0);
    }

    function test_buy_plays_will_refund_excess_payment() public {
        uint256 buyinAmount = playCost + 10 wei;
        uint256 initialBalance = player1.balance;

        vm.startPrank(player1);
        game.buyPlays{value: buyinAmount}(1);
        vm.stopPrank();

        uint256 gameNumber = game.currentGameNumber();

        assertEq(player1.balance, initialBalance - playCost);

        assertEq(game.purchasedPlays(gameNumber, player1), buyinAmount / playCost);
    }

    function testRevert_if_previous_game_has_not_ended() public {
        uint256 buyinAmount = 10 * playCost;
        uint256 initialBalance = player1.balance;

        vm.startPrank(player1);
        game.buyPlays{value: buyinAmount}(1);

        uint256 gameNumber = game.currentGameNumber();

        assertEq(game.gameBalance(gameNumber), buyinAmount);
        assertEq(player1.balance, initialBalance - buyinAmount);

        assertEq(game.purchasedPlays(gameNumber, player1), buyinAmount / playCost);

        vm.expectRevert("ZigZagZog.buyPlays: previous game has not yet ended");
        game.buyPlays{value: buyinAmount}(gameNumber + 1);

        vm.stopPrank();

        assertEq(player1.balance, initialBalance - buyinAmount);
    }

    function testRevert_if_game_number_is_invalid() public {
        uint256 buyinAmount = 10 * playCost;
        uint256 initialBalance = player1.balance;

        vm.startPrank(player1);
        vm.expectRevert("ZigZagZog.buyPlays: game number is invalid");
        game.buyPlays{value: buyinAmount}(5);
        vm.stopPrank();

        assertEq(player1.balance, initialBalance);
    }
}

/**
 * commit/reveal tests:
 */
contract ZigZagZogTest_commitChoices is ZigZagZogTestBase {
    uint256 gameNumber;
    uint256 playCount;

    function setUp() public virtual override {
        super.setUp();

        uint256 buyinAmount = 10000 wei;
        playCount = buyinAmount / playCost;

        vm.startPrank(player1);
        game.buyPlays{value: buyinAmount}(1);
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

        bytes32 choicesMessageHash =
            game.choicesHash(p1Nonce, gameNumber, roundNumber, numCircles, numSquares, numTriangles);
        bytes memory signature = _signMessageHash(player1PrivateKey, choicesMessageHash);

        vm.startPrank(player1);
        game.commitChoices(gameNumber, roundNumber, signature);
        vm.stopPrank();

        assertTrue(game.playerHasCommitted(gameNumber, roundNumber, player1));
        assertEq(game.playerCommitment(gameNumber, roundNumber, player1), signature);
    }

    function testRevert_commit_multiple_times() public {
        uint256 roundNumber = 1;

        uint256 p1Nonce = 0x1902a;
        uint256 numCircles = 6;
        uint256 numSquares = 3;
        uint256 numTriangles = 1;

        bytes32 choicesMessageHash =
            game.choicesHash(p1Nonce, gameNumber, roundNumber, numCircles, numSquares, numTriangles);
        bytes memory signature = _signMessageHash(player1PrivateKey, choicesMessageHash);

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

        bytes32 choicesMessageHash =
            game.choicesHash(p1Nonce, gameNumber, roundNumber, numCircles, numSquares, numTriangles);
        bytes memory signature = _signMessageHash(player1PrivateKey, choicesMessageHash);

        vm.startPrank(player1);

        assertFalse(game.playerHasCommitted(gameNumber, roundNumber, player1));
        assertFalse(game.playerHasRevealed(gameNumber, roundNumber, player1));

        game.commitChoices(gameNumber, roundNumber, signature);

        assertTrue(game.playerHasCommitted(gameNumber, roundNumber, player1));
        assertFalse(game.playerHasRevealed(gameNumber, roundNumber, player1));

        vm.warp(block.timestamp + commitDuration + 1); // Commit window has elapsed

        game.revealChoices(gameNumber, roundNumber, p1Nonce, numCircles, numSquares, numTriangles);

        assertTrue(game.playerHasCommitted(gameNumber, roundNumber, player1));
        assertTrue(game.playerHasRevealed(gameNumber, roundNumber, player1));

        console.log("Shape-player counts: ");
        console.log(game.circlePlayerCount(gameNumber, roundNumber));
        console.log(game.squarePlayerCount(gameNumber, roundNumber));
        console.log(game.trianglePlayerCount(gameNumber, roundNumber));

        vm.warp(block.timestamp + revealDuration);
        assertTrue(game.hasGameEnded(gameNumber));

        vm.stopPrank();
    }

    function testRevert_reveal_multiple_times() public {
        uint256 roundNumber = 1;

        uint256 p1Nonce = 0x1902a;
        uint256 numCircles = 6;
        uint256 numSquares = 3;
        uint256 numTriangles = 1;

        bytes32 choicesMessageHash =
            game.choicesHash(p1Nonce, gameNumber, roundNumber, numCircles, numSquares, numTriangles);
        bytes memory signature = _signMessageHash(player1PrivateKey, choicesMessageHash);

        vm.startPrank(player1);

        assertFalse(game.playerHasCommitted(gameNumber, roundNumber, player1));
        assertFalse(game.playerHasRevealed(gameNumber, roundNumber, player1));

        game.commitChoices(gameNumber, roundNumber, signature);

        assertTrue(game.playerHasCommitted(gameNumber, roundNumber, player1));
        assertFalse(game.playerHasRevealed(gameNumber, roundNumber, player1));

        vm.warp(block.timestamp + commitDuration + 1); // Commit window has elapsed

        game.revealChoices(gameNumber, roundNumber, p1Nonce, numCircles, numSquares, numTriangles);

        assertTrue(game.playerHasCommitted(gameNumber, roundNumber, player1));
        assertTrue(game.playerHasRevealed(gameNumber, roundNumber, player1));

        vm.expectRevert("ZigZagZog.revealChoices: player already revealed");
        game.revealChoices(gameNumber, roundNumber, p1Nonce, numCircles, numSquares, numTriangles);

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

        bytes32 choicesMessageHash =
            game.choicesHash(p1Nonce, gameNumber, roundNumber, numCircles, numSquares, numTriangles);
        bytes memory signature = _signMessageHash(player1PrivateKey, choicesMessageHash);

        vm.startPrank(player1);

        assertFalse(game.playerHasCommitted(gameNumber, roundNumber, player1));
        assertFalse(game.playerHasRevealed(gameNumber, roundNumber, player1));

        game.commitChoices(gameNumber, roundNumber, signature);

        assertTrue(game.playerHasCommitted(gameNumber, roundNumber, player1));
        assertFalse(game.playerHasRevealed(gameNumber, roundNumber, player1));

        vm.warp(block.timestamp + commitDuration + 1); // Commit window has elapsed

        vm.expectRevert("ZigZagZog.revealChoices: invalid signature");
        game.revealChoices(25, roundNumber, p1Nonce, numCircles, numSquares, numTriangles);

        vm.expectRevert("ZigZagZog.revealChoices: invalid signature");
        game.revealChoices(25, roundNumber, p1Nonce, numCircles, numSquares, 2);

        assertTrue(game.playerHasCommitted(gameNumber, roundNumber, player1));
        assertFalse(game.playerHasRevealed(gameNumber, roundNumber, player1));

        game.revealChoices(gameNumber, roundNumber, p1Nonce, numCircles, numSquares, numTriangles);

        assertTrue(game.playerHasCommitted(gameNumber, roundNumber, player1));
        assertTrue(game.playerHasRevealed(gameNumber, roundNumber, player1));

        vm.stopPrank();
    }

    function testRevert_reveal_before_reveal_phase_begins() public {
        uint256 roundNumber = 1;

        uint256 p1Nonce = 0x1902a;
        uint256 numCircles = 6;
        uint256 numSquares = 3;
        uint256 numTriangles = 1;

        bytes32 choicesMessageHash =
            game.choicesHash(p1Nonce, gameNumber, roundNumber, numCircles, numSquares, numTriangles);
        bytes memory signature = _signMessageHash(player1PrivateKey, choicesMessageHash);

        vm.startPrank(player1);

        assertFalse(game.playerHasCommitted(gameNumber, roundNumber, player1));
        assertFalse(game.playerHasRevealed(gameNumber, roundNumber, player1));

        game.commitChoices(gameNumber, roundNumber, signature);

        assertTrue(game.playerHasCommitted(gameNumber, roundNumber, player1));
        assertFalse(game.playerHasRevealed(gameNumber, roundNumber, player1));

        vm.warp(block.timestamp + commitDuration); // Last second of commit window

        vm.expectRevert("ZigZagZog.revealChoices: reveal phase has not yet begun");
        game.revealChoices(gameNumber, roundNumber, p1Nonce, numCircles, numSquares, numTriangles);

        vm.stopPrank();
    }

    function testRevert_reveal_after_reveal_duration_has_elasped() public {
        uint256 roundNumber = 1;

        uint256 p1Nonce = 0x1902a;
        uint256 numCircles = 6;
        uint256 numSquares = 3;
        uint256 numTriangles = 1;

        bytes32 choicesMessageHash =
            game.choicesHash(p1Nonce, gameNumber, roundNumber, numCircles, numSquares, numTriangles);
        bytes memory signature = _signMessageHash(player1PrivateKey, choicesMessageHash);

        vm.startPrank(player1);

        assertFalse(game.playerHasCommitted(gameNumber, roundNumber, player1));
        assertFalse(game.playerHasRevealed(gameNumber, roundNumber, player1));

        game.commitChoices(gameNumber, roundNumber, signature);

        assertTrue(game.playerHasCommitted(gameNumber, roundNumber, player1));
        assertFalse(game.playerHasRevealed(gameNumber, roundNumber, player1));

        vm.warp(block.timestamp + commitDuration + revealDuration + 1); // round has ended

        vm.expectRevert("ZigZagZog.revealChoices: reveal phase has ended");
        game.revealChoices(gameNumber, roundNumber, p1Nonce, numCircles, numSquares, numTriangles);

        vm.stopPrank();
    }

    function testRevert_commit_if_round_has_not_started() public {
        uint256 roundNumber = 1; // Ask contract for round number?

        uint256 p1Nonce = 0x1902a;
        uint256 numCircles = 6;
        uint256 numSquares = 3;
        uint256 numTriangles = 1;

        bytes32 choicesMessageHash =
            game.choicesHash(p1Nonce, gameNumber, roundNumber, numCircles, numSquares, numTriangles);
        bytes memory signature = _signMessageHash(player1PrivateKey, choicesMessageHash);

        vm.startPrank(player1);

        assertFalse(game.playerHasCommitted(gameNumber, roundNumber, player1));
        assertFalse(game.playerHasRevealed(gameNumber, roundNumber, player1));

        game.commitChoices(gameNumber, roundNumber, signature);

        vm.warp(block.timestamp + commitDuration + 1); // Commit window has elapsed

        assertTrue(game.playerHasCommitted(gameNumber, roundNumber, player1));
        assertFalse(game.playerHasRevealed(gameNumber, roundNumber, player1));

        game.revealChoices(gameNumber, roundNumber, p1Nonce, numCircles, numSquares, numTriangles);

        assertTrue(game.playerHasCommitted(gameNumber, roundNumber, player1));
        assertTrue(game.playerHasRevealed(gameNumber, roundNumber, player1));

        vm.warp(block.timestamp + revealDuration - 1); // last second in round

        roundNumber = 2;

        choicesMessageHash = game.choicesHash(p1Nonce, gameNumber, roundNumber, numCircles, numSquares, numTriangles);
        signature = _signMessageHash(player1PrivateKey, choicesMessageHash);
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

        bytes32 choicesMessageHash =
            game.choicesHash(p1Nonce, gameNumber, roundNumber, numCircles, numSquares, numTriangles);
        bytes memory signature = _signMessageHash(player1PrivateKey, choicesMessageHash);

        vm.startPrank(player1);

        assertFalse(game.playerHasCommitted(gameNumber, roundNumber, player1));
        assertFalse(game.playerHasRevealed(gameNumber, roundNumber, player1));

        vm.expectRevert("ZigZagZog.commitChoices: round hasn't started yet");
        game.commitChoices(gameNumber, roundNumber, signature);

        vm.stopPrank();
    }
}

/**
 * multiplayer tests:
 */
contract ZigZagZogTest_multiplayer is ZigZagZogTestBase {
    address[] public players;
    mapping(address => uint256) public playCounts;
    mapping(address => uint256) public buyinAmounts;
    mapping(address => uint256) public playerPrivateKeys;
    uint256 public gameNumber;
    mapping(address => uint256) private playerNonces;
    mapping(address => uint256[3]) private playerShapes; // Stores selected shapes [circles, squares, triangles]

    function setUp() public virtual override {
        super.setUp();

        // Define private keys and derive player addresses
        uint256 privateKey1 = 0xA11CE;
        uint256 privateKey2 = 0xB22DF;
        uint256 privateKey3 = 0xC33BE;

        address player1 = vm.addr(privateKey1);
        address player2 = vm.addr(privateKey2);
        address player3 = vm.addr(privateKey3);

        players.push(player1);
        players.push(player2);
        players.push(player3);

        // Store private keys for later use
        playerPrivateKeys[player1] = privateKey1;
        playerPrivateKeys[player2] = privateKey2;
        playerPrivateKeys[player3] = privateKey3;

        // Assign unique buy-in amounts
        buyinAmounts[player1] = 12000 wei;
        buyinAmounts[player2] = 8000 wei;
        buyinAmounts[player3] = 15000 wei;

        for (uint256 i = 0; i < players.length; i++) {
            address player = players[i];
            uint256 buyinAmount = buyinAmounts[player];
            uint256 playCount = buyinAmount / playCost;
            playCounts[player] = playCount;

            vm.deal(player, buyinAmount); // Fund the player
            vm.startPrank(player);
            game.buyPlays{value: buyinAmount}(1);
            vm.stopPrank();
        }

        gameNumber = game.currentGameNumber();
    }

    // Private helper function for a single player commit
    function _commitChoicesForPlayer(address player, uint256 roundNumber) private {
        require(playCounts[player] > 0, "Player has no plays");

        // Retrieve pre-set shape choices
        uint256 numCircles = playerShapes[player][0];
        uint256 numSquares = playerShapes[player][1];
        uint256 numTriangles = playerShapes[player][2];

        uint256 playerNonce = uint256(keccak256(abi.encodePacked(player, roundNumber)));
        playerNonces[player] = playerNonce; // Store nonce for later reveal

        bytes32 choicesMessageHash =
            game.choicesHash(playerNonce, gameNumber, roundNumber, numCircles, numSquares, numTriangles);

        bytes memory signature = _signMessageHash(playerPrivateKeys[player], choicesMessageHash);

        vm.startPrank(player);
        game.commitChoices(gameNumber, roundNumber, signature);
        vm.stopPrank();

        // Ensure the commitment was recorded
        assertTrue(game.playerHasCommitted(gameNumber, roundNumber, player));
    }

    // Private helper function for a single player reveal
    function _revealChoicesForPlayer(address player, uint256 roundNumber) private {
        require(playCounts[player] > 0, "Player has no plays");

        // Retrieve pre-set shape choices
        uint256 numCircles = playerShapes[player][0];
        uint256 numSquares = playerShapes[player][1];
        uint256 numTriangles = playerShapes[player][2];

        uint256 playerNonce = playerNonces[player];

        vm.startPrank(player);
        game.revealChoices(gameNumber, roundNumber, playerNonce, numCircles, numSquares, numTriangles);
        vm.stopPrank();

        // Ensure the reveal was recorded
        assertTrue(game.playerHasRevealed(gameNumber, roundNumber, player));
    }

    function _playRound(uint256 roundNumber) private {
        // All players commit their choices
        for (uint256 i = 0; i < players.length; i++) {
            _commitChoicesForPlayer(players[i], roundNumber);
        }

        // Warp time to simulate commit phase ending
        vm.warp(block.timestamp + commitDuration + 1);

        // All players reveal their choices
        for (uint256 i = 0; i < players.length; i++) {
            _revealChoicesForPlayer(players[i], roundNumber);
        }

        // Warp time to simulate reveal phase ending
        vm.warp(block.timestamp + revealDuration);
    }

    // Test where all players commit first, then all players reveal
    function test_full_game_multiplayer() public {
        uint256 roundNumber = 1;

        playerShapes[players[0]] = [4, 4, 4];
        playerShapes[players[1]] = [2, 2, 4];
        playerShapes[players[2]] = [5, 5, 5];

        _playRound(roundNumber);

        roundNumber = 2;

        playerShapes[players[0]] = [3, 3, 2];
        playerShapes[players[1]] = [2, 1, 1];
        playerShapes[players[2]] = [4, 3, 3];

        _playRound(roundNumber);

        roundNumber = 3;

        playerShapes[players[0]] = [2, 2, 1];
        playerShapes[players[1]] = [1, 0, 1];
        playerShapes[players[2]] = [2, 2, 2];

        _playRound(roundNumber);

        roundNumber = 4;

        playerShapes[players[0]] = [1, 1, 1];
        playerShapes[players[1]] = [1, 0, 0];
        playerShapes[players[2]] = [4, 0, 0];

        _playRound(roundNumber);

        assertTrue(game.hasGameEnded(gameNumber));
    }
}
