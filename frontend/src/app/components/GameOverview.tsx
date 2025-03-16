'use client';

import React from 'react';
import { GameStats } from './GameStats';

interface GameOverviewProps {
  gameNumber: number;
  playerCount: number;
  potSize: number;
  lastGameMultiple?: number;  // Optional in case it's the first game
  buyInAmount: number;
  onBuyIn: () => void;
}

export function GameOverview({
  gameNumber,
  playerCount,
  potSize,
  lastGameMultiple,
  buyInAmount,
  onBuyIn
}: GameOverviewProps) {
  return (
    <div className="game-overview">
      <GameStats
        gameNumber={gameNumber}
        playerCount={playerCount}
        potSize={potSize}
        lastGameMultiple={lastGameMultiple}
      />
      <button onClick={onBuyIn} className="blink-button">
        Buy in: {buyInAmount} G7 / hand
      </button>
    </div>
  );
} 