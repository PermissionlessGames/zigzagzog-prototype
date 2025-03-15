'use client';

import React from 'react';
import { GameStatus } from '../components/GameStatus';

export default function GamePage() {
  const handleBuyIn = () => {
    console.log('Buy in clicked');
    // Will implement wallet connection and contract interaction later
  };

  return (
    <GameStatus
      gameNumber={1}
      status="buying in"
      totalPlayers={8}
      remainingPlayers={8}
      onBuyIn={handleBuyIn}
    />
  );
} 