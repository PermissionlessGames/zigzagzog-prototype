'use client';

import React from 'react';
import { GameStats } from './GameStats';
import { useWeb3 } from '@/contexts/Web3Context';

interface GameOverviewProps {
  gameNumber: number;
  potSize: number;
  lastGameMultiple?: number;  // Optional in case it's the first game
  buyInAmount: number;
  onBuyIn: () => void;
  isProcessing?: boolean;  // Added to show loading state
}

export function GameOverview({
  gameNumber,
  potSize,
  lastGameMultiple,
  buyInAmount,
  onBuyIn,
  isProcessing = false
}: GameOverviewProps) {
  const { isConnected, isCorrectNetwork, currencySymbol } = useWeb3();
  
  return (
    <div className="container">
      <GameStats
        gameNumber={gameNumber}
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
            disabled={isProcessing}
            style={{ 
              fontSize: '1.1rem', 
              padding: '0.6rem 1.2rem',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              opacity: isProcessing ? 0.7 : 1
            }}
          >
            {isProcessing ? 'Processing...' : `Buy in: ${buyInAmount} ${currencySymbol} / hand`}
          </button>
        )}
      </div>
    </div>
  );
} 