'use client';

import React, { useState, useEffect } from 'react';
import { GameOverview } from '../components/GameOverview';
import { useZigZagZog } from '@/hooks/useZigZagZog';
import Toast from '@/components/Toast';

export default function GamePage() {
  const { gameData, buyPlays, refreshGameData } = useZigZagZog();
  const [isBuying, setIsBuying] = useState(false);
  
  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  
  const handleBuyIn = async () => {
    setIsBuying(true);
    
    try {
      const result = await buyPlays();
      if (!result.success && result.error) {
        setToastMessage(`Transaction Error: ${result.error}`);
        setToastType('error');
      } else if (result.success) {
        setToastMessage('Successfully bought plays!');
        setToastType('success');
      }
    } catch (error) {
      setToastMessage('Transaction failed');
      setToastType('error');
      console.error('Error buying plays:', error);
    } finally {
      setIsBuying(false);
    }
  };

  // Show toast for contract errors
  useEffect(() => {
    if (gameData.error) {
      setToastMessage(`Error: ${gameData.error}`);
      setToastType('error');
    }
  }, [gameData.error]);

  // Close toast handler
  const handleCloseToast = () => {
    setToastMessage(null);
  };

  // Retry button for contract errors shown in toast
  const handleRetry = () => {
    refreshGameData();
    setToastMessage(null);
  };

  return (
    <>
      <GameOverview
        gameNumber={gameData.gameNumber}
        potSize={gameData.potSize}
        lastGameMultiple={gameData.lastGameMultiple}
        buyInAmount={gameData.playCost}
        onBuyIn={handleBuyIn}
        isProcessing={isBuying}
        roundNumber={gameData.roundNumber}
        roundTimestamp={gameData.roundTimestamp}
        commitDuration={gameData.commitDuration}
        revealDuration={gameData.revealDuration}
      />
      
      {/* Display toast for errors */}
      {toastMessage && gameData.error && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <Toast 
            message={toastMessage} 
            type={toastType} 
            onClose={handleCloseToast} 
            duration={10000}
          />
          <button 
            onClick={handleRetry}
            style={{ 
              marginTop: '10px', 
              padding: '5px 10px',
              backgroundColor: '#f0f0f0',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      )}
      
      {/* Display regular toast for transaction errors */}
      {toastMessage && !gameData.error && (
        <Toast 
          message={toastMessage} 
          type={toastType} 
          onClose={handleCloseToast} 
        />
      )}
    </>
  );
}