'use client';

import React from 'react';
import { GameSpectator } from '../components/GameSpectator';

export default function GamePage() {
  // Temporary mock game state
  const mockGameState = {
    status: 'buying-in' as const,
    currentRound: 1,
    totalPlayers: 10,
    remainingPlayers: 10,
  };

  const handleBuyIn = () => {
    console.log('Buy in clicked');
    // Will implement wallet connection and contract interaction later
  };

  return <GameSpectator gameState={mockGameState} onBuyIn={handleBuyIn} />;
} 