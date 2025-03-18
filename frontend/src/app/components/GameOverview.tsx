'use client';

import React from 'react';
import { GameStats } from './GameStats';
import { useWeb3 } from '@/contexts/Web3Context';

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
  const { isConnected, isCorrectNetwork, currencySymbol } = useWeb3();
  
  return (
    <div className="container">
      <GameStats
        gameNumber={gameNumber}
        playerCount={playerCount}
        potSize={potSize}
        lastGameMultiple={lastGameMultiple}
      />
      
      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        {!isConnected ? (
          <p>Connect your wallet to play</p>
        ) : !isCorrectNetwork ? (
          <p>Switch to the correct network to play</p>
        ) : (
          <button 
            onClick={onBuyIn} 
            style={{ fontSize: '1.1rem', padding: '0.6rem 1.2rem' }}
          >
            Buy in: {buyInAmount} {currencySymbol} / hand
          </button>
        )}
      </div>
    </div>
  );
} 