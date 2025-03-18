# The _ZigZagZog_ Integration Guide

This document describes the player flows on the `ZigZagZog` smart contract and breaks down how each flow can be implemented in terms of the smart contract methods involved. It is meant for people programming _ZigZagZog_ game clients.

For a list of deployed contract addresses, see [Deployments](./deployments.md).

Interacting with a `ZigZagZog` smart contract:

* Use the ZigZagZog ABI if you want to interact with a game contract from outside the blockchain.
* Use the IZigZagZog interface if you want to interact with a game contract from another contract.

Flows:

1. Game Structure
2. Buying Plays
3. Committing Choices
4. Revealing Choices
5. Game Progression and Elimination

## Game Structure

_ZigZagZog_ is a permissionless elimination game where players compete by strategically choosing between three shapes: circles, squares, and triangles. The game progresses in rounds, with each round having two phases:

1. Commit Phase: Players submit encrypted commitments of their shape choices
2. Reveal Phase: Players reveal their actual choices, and eliminations are calculated

Each game has a fixed play cost and timing parameters:
```solidity
function playCost() external view returns (uint256);
function commitDuration() external view returns (uint64);
function revealDuration() external view returns (uint64);
```

The game balance (total staked value) for any game number can be checked using:
```solidity
function gameBalance(uint256 gameNumber) external view returns (uint256);
```

## Round Timing and Transitions

Each round in _ZigZagZog_ has strict timing windows for the commit and reveal phases. Understanding these windows is crucial for client implementations.

To check the current game and round state:
```solidity
function GameState(uint256 gameNumber) external view returns (
    uint256 gameTimestamp,    // When the game started
    uint256 roundNumber,      // Current round number
    uint256 roundTimestamp    // When the current round started
);
```

The timing windows work as follows:

1. Commit Phase: Starts at `roundTimestamp` and lasts for `commitDuration` seconds
   - Players can commit during: `roundTimestamp <= timestamp <= roundTimestamp + commitDuration`
   - Check if commit phase is active: `timestamp <= roundTimestamp + commitDuration`

2. Reveal Phase: Starts after commit phase and lasts for `revealDuration` seconds
   - Players can reveal during: `roundTimestamp + commitDuration < timestamp <= roundTimestamp + commitDuration + revealDuration`
   - Check if reveal phase is active: `timestamp > roundTimestamp + commitDuration && timestamp <= roundTimestamp + commitDuration + revealDuration`

3. Next Round: Starts when a player makes the first commit after the previous round's reveal phase ends
   - Next round can start when: `timestamp > roundTimestamp + commitDuration + revealDuration`
   - The first player to call `commitChoices()` after this time will trigger the start of the next round
   - When this happens, `roundNumber` is incremented and `roundTimestamp` is updated to the current timestamp

For example, to determine the current phase and when the next phase will start:
```solidity
uint256 roundEnd = gameState.roundTimestamp + commitDuration + revealDuration;
if (block.timestamp <= gameState.roundTimestamp + commitDuration) {
    // In commit phase
    uint256 commitPhaseEndsIn = gameState.roundTimestamp + commitDuration - block.timestamp;
} else if (block.timestamp <= roundEnd) {
    // In reveal phase
    uint256 revealPhaseEndsIn = roundEnd - block.timestamp;
} else {
    // Previous round has ended, next round will start with the next commitment
}
```

Note: When implementing a client, it's important to account for slight variations in blockchain timestamps and potential block time fluctuations. Consider adding small buffers when checking phase transitions.

## Buying Plays

To participate in a game, players must first buy plays using the native token. The cost per play is fixed and can be checked using the `playCost()` function.

Players buy plays using:
```solidity
function buyPlays() external payable;
```

The number of plays purchased is calculated as `msg.value / playCost`. Any excess value is refunded to the player.

You can check a player's purchased and surviving plays using:
```solidity
function purchasedPlays(uint256 gameNumber, address player) external view returns (uint256);
function playerSurvivingPlays(uint256 gameNumber, address player) external view returns (uint256);
```

## Committing Choices

Each round begins with a commit phase where players must submit encrypted commitments of their shape choices. The commitment is created using EIP-712 typed data signing.

The structure for creating the commitment hash is:
```solidity
function choicesHash(
    uint256 nonce,
    uint256 gameNumber,
    uint256 roundNumber,
    uint256 numCircles,
    uint256 numSquares,
    uint256 numTriangles
) public view returns (bytes32);
```

Players submit their commitments using:
```solidity
function commitChoices(
    uint256 gameNumber,
    uint256 roundNumber,
    bytes memory signature
) external;
```

The commit phase duration is fixed and can be checked using `commitDuration()`. Players can verify if they've committed using:
```solidity
function playerHasCommitted(uint256 gameNumber, uint256 roundNumber, address player) external view returns (bool);
```

## Revealing Choices

After the commit phase ends, players must reveal their actual choices during the reveal phase. This is done using:
```solidity
function revealChoices(
    uint256 gameNumber,
    uint256 roundNumber,
    uint256 nonce,
    uint256 numCircles,
    uint256 numSquares,
    uint256 numTriangles
) external;
```

The values provided must match the original commitment, and the total number of shapes must equal the player's surviving plays.

Players can verify if they've revealed using:
```solidity
function playerHasRevealed(uint256 gameNumber, uint256 roundNumber, address player) external view returns (bool);
```

## Game Progression and Elimination

After each round's reveal phase, shapes are eliminated based on their relative quantities:

1. If circles > squares and circles ≥ triangles: circles are eliminated
2. If squares > circles and squares ≥ triangles: squares are eliminated
3. If triangles > circles and triangles > squares: triangles are eliminated
4. If all quantities are equal: nothing is eliminated

The game ends when:
1. Total surviving plays ≤ 2, or
2. All surviving plays belong to a single player

You can track the current game state using:
```solidity
function GameState(uint256 gameNumber) external view returns (
    uint256 gameTimestamp,
    uint256 roundNumber,
    uint256 roundTimestamp
);
```

For each round, you can check the revealed quantities:
```solidity
function circlesRevealed(uint256 gameNumber, uint256 roundNumber) external view returns (uint256);
function squaredRevealed(uint256 gameNumber, uint256 roundNumber) external view returns (uint256);
function trianglesRevealed(uint256 gameNumber, uint256 roundNumber) external view returns (uint256);
```

And for individual players:
```solidity
function playerCirclesRevealed(uint256 gameNumber, uint256 roundNumber, address player) external view returns (uint256);
function playerSquaresRevealed(uint256 gameNumber, uint256 roundNumber, address player) external view returns (uint256);
function playerTrianglesRevealed(uint256 gameNumber, uint256 roundNumber, address player) external view returns (uint256);
``` 