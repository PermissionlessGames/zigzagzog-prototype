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
  
  // Timer related props
  roundNumber: number;
  roundTimestamp: number;
  commitDuration: number;
  revealDuration: number;
}

export function GameOverview({
  gameNumber,
  potSize,
  lastGameMultiple,
  buyInAmount,
  onBuyIn,
  isProcessing = false,
  roundNumber,
  roundTimestamp,
  commitDuration,
  revealDuration
}: GameOverviewProps) {
  const { isConnected, isCorrectNetwork, currencySymbol } = useWeb3();
  
  return (
    <div className="container">
      <GameStats
        gameNumber={gameNumber}
        potSize={potSize}
        lastGameMultiple={lastGameMultiple}
        roundNumber={roundNumber}
        roundTimestamp={roundTimestamp}
        commitDuration={commitDuration}
        revealDuration={revealDuration}
      />
      
      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        {!isConnected ? (
          <p>Connect your wallet to play</p>
        ) : !isCorrectNetwork ? (
          <p>Switch to the correct network to play</p>
        ) : (
          <div>
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
              {isProcessing ? 'Processing...' : `Buy plays: ${buyInAmount} ${currencySymbol} / play`}
            </button>
            <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.8 }}>
              You can buy multiple plays by sending more ETH. The amount will be calculated automatically.
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 