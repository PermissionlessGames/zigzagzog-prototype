'use client';

import React, { useState } from 'react';
import { GameOverview } from '../components/GameOverview';
import { useZigZagZog } from '@/hooks/useZigZagZog';

export default function GamePage() {
  const { gameData, buyPlays, refreshGameData } = useZigZagZog();
  const [isBuying, setIsBuying] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  
  const handleBuyIn = async () => {
    setIsBuying(true);
    setTxError(null);
    
    try {
      const result = await buyPlays();
      if (!result.success && result.error) {
        setTxError(result.error);
      }
    } catch (error) {
      setTxError('Transaction failed');
      console.error('Error buying plays:', error);
    } finally {
      setIsBuying(false);
    }
  };

  // Remove loading screen entirely - it causes flickering

  // Show error message
  if (gameData.error) {
    return (
      <div className="container">
        <div style={{ marginBottom: '1rem' }}>Error: {gameData.error}</div>
        <button onClick={() => refreshGameData(true)}>Retry</button>
      </div>
    );
  }

  return (
    <>
      <GameOverview
        gameNumber={gameData.gameNumber}
        playerCount={gameData.playerCount}
        potSize={gameData.potSize}
        lastGameMultiple={gameData.lastGameMultiple}
        buyInAmount={gameData.playCost}
        onBuyIn={handleBuyIn}
        isProcessing={isBuying}
      />
      
      {/* Show transaction error */}
      {txError && (
        <div style={{ textAlign: 'center', marginTop: '1rem', color: '#c62828' }}>
          Transaction Error: {txError}
        </div>
      )}
    </>
  );
}