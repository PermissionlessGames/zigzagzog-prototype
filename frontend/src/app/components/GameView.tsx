'use client';

import React, { useState } from 'react';
import { GameStats } from './GameStats';
import { GameControls } from './GameControls';
import { GameData, ShapeSelection } from '@/hooks/useZigZagZog';
import { useZigZagZog } from '@/hooks/useZigZagZog';

interface GameViewProps {
  gameData: GameData;
  onToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function GameView({ gameData, onToast }: GameViewProps) {
  const { buyPlays, commitChoices, revealChoices, refreshGameData } = useZigZagZog();
  const [isBuying, setIsBuying] = useState(false);
  
  // Handler for buying plays
  const handleBuyIn = async (quantity: number = 1) => {
    setIsBuying(true);
    
    try {
      const result = await buyPlays(quantity);
      if (!result.success && result.error) {
        onToast(`Transaction Error: ${result.error}`, 'error');
      } else if (result.success) {
        onToast(`Successfully bought ${quantity} plays!`, 'success');
      }
    } catch (error) {
      onToast('Transaction failed', 'error');
      console.error('Error buying plays:', error);
    } finally {
      setIsBuying(false);
    }
  };

  // Handle committing choices
  const handleCommitChoices = async (shapes: ShapeSelection) => {
    try {
      const result = await commitChoices(shapes);
      if (!result.success && result.error) {
        onToast(`Commit Error: ${result.error}`, 'error');
        return result;
      } else if (result.success) {
        onToast(`Successfully committed shapes!`, 'success');
      }
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onToast(`Commit failed: ${errorMessage}`, 'error');
      console.error('Error committing choices:', error);
      return { success: false, error: errorMessage };
    }
  };

  // Handle revealing choices
  const handleRevealChoices = async () => {
    try {
      const result = await revealChoices();
      if (!result.success && result.error) {
        onToast(`Reveal Error: ${result.error}`, 'error');
        return result;
      } else if (result.success) {
        onToast(`Successfully revealed shapes!`, 'success');
      }
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onToast(`Reveal failed: ${errorMessage}`, 'error');
      console.error('Error revealing choices:', error);
      return { success: false, error: errorMessage };
    }
  };

  // Retry button for contract errors
  const handleRetry = () => {
    refreshGameData();
    onToast('Refreshing game data...', 'info');
  };

  return (
    <div>
      {/* Game statistics component */}
      <GameStats
        gameNumber={gameData.gameNumber}
        potSize={gameData.potSize}
        lastGameMultiple={gameData.lastGameMultiple}
        roundNumber={gameData.roundNumber}
        roundTimestamp={gameData.roundTimestamp}
        commitDuration={gameData.commitDuration}
        revealDuration={gameData.revealDuration}
        isGameEnded={gameData.isGameEnded}
        commitCount={gameData.commitCount}
        revealedShapes={gameData.revealedShapes}
        previousRoundShapes={gameData.previousRoundShapes}
      />
      
      {/* Game controls component */}
      <GameControls
        gameData={gameData}
        onBuyIn={handleBuyIn}
        onCommitChoices={handleCommitChoices}
        onRevealChoices={handleRevealChoices}
        isProcessing={isBuying}
      />
      
      {/* Retry button for errors */}
      {gameData.error && (
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button 
            onClick={handleRetry}
            style={{ 
              padding: '0.5rem 1rem',
              backgroundColor: '#f0f0f0',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Retry Loading Game Data
          </button>
        </div>
      )}
    </div>
  );
}