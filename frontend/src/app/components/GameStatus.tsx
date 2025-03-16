'use client';

import React from 'react';

interface GameStatusProps {
  gameNumber: number;
  playerCount: number;
  potSize: number;
  lastGameMultiple?: number;  // Optional in case it's the first game
  buyInAmount: number;
  onBuyIn: () => void;
}

export function GameStatus({
  gameNumber,
  playerCount,
  potSize,
  lastGameMultiple,
  buyInAmount,
  onBuyIn
}: GameStatusProps) {
  return (
    <div className="game-status-display">
      <h1 className="game-status-title">Game #{gameNumber}</h1>
      <div className="game-status-info">
        <p className="game-status-players">{playerCount} players</p>
        <p className="game-status-pot">{potSize} G7 in pot</p>
        {lastGameMultiple && (
          <p className="game-status-multiples">
            Last game winner received {lastGameMultiple}x
          </p>
        )}
      </div>
      <button onClick={onBuyIn} className="buy-in-button">
        Buy in: {buyInAmount} G7 / hand
      </button>
    </div>
  );
} 