'use client';

import React from 'react';
import { GameStatus } from '../components/GameStatus';

export default function GamePage() {
  // Mock data - will be replaced with contract data
  const mockGameData = {
    gameNumber: 1,
    playerCount: 8,
    potSize: 80,
    lastGameMultiple: 2.5,  // Winner got 2.5x their buy-in
    buyInAmount: 10
  };

  const handleBuyIn = () => {
    console.log('Buy in clicked');
    // Will implement wallet connection and contract interaction later
  };

  return (
    <GameStatus
      gameNumber={mockGameData.gameNumber}
      playerCount={mockGameData.playerCount}
      potSize={mockGameData.potSize}
      lastGameMultiple={mockGameData.lastGameMultiple}
      buyInAmount={mockGameData.buyInAmount}
      onBuyIn={handleBuyIn}
    />
  );
} 