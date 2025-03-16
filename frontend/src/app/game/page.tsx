'use client';

import React from 'react';
import { GameOverview } from '../components/GameOverview';

// Mock game data - will be replaced with contract data
const mockGameData = {
  gameNumber: 872,
  playerCount: 82945,
  potSize: 92384733,
  lastGameMultiple: 2.5,
  buyInAmount: 10
};

export default function GamePage() {
  const handleBuyIn = () => {
    console.log('Buy in clicked - wallet connection and contract interaction to be implemented');
  };

  return (
    <GameOverview
      gameNumber={mockGameData.gameNumber}
      playerCount={mockGameData.playerCount}
      potSize={mockGameData.potSize}
      lastGameMultiple={mockGameData.lastGameMultiple}
      buyInAmount={mockGameData.buyInAmount}
      onBuyIn={handleBuyIn}
    />
  );
} 