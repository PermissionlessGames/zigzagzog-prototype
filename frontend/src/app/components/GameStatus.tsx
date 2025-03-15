'use client';

import React from 'react';

interface GameStatusProps {
  gameNumber: number;
  status: string;
  totalPlayers: number;
  remainingPlayers: number;
  onBuyIn: () => void;
}

export function GameStatus({
  gameNumber,
  status,
  totalPlayers,
  remainingPlayers,
  onBuyIn
}: GameStatusProps) {
  return (
    <div className="game-status-display">
      <h1 className="game-status-title">
        Game #{gameNumber} - {status}
      </h1>
      <p className="game-status-players">
        {remainingPlayers} / {totalPlayers} players remaining
      </p>
      <button onClick={onBuyIn} className="buy-in-button">
        Buy In to Next Game
      </button>
    </div>
  );
} 