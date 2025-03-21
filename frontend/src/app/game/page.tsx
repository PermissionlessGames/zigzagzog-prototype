'use client';

import React, { useState, useEffect } from 'react';
import { GameOverview } from '../components/GameOverview';
import { useZigZagZog, ShapeSelection } from '@/hooks/useZigZagZog';
import Toast from '@/components/Toast';

export default function GamePage() {
  const { gameData, buyPlays, commitChoices, revealChoices, refreshGameData } = useZigZagZog();
  const [isBuying, setIsBuying] = useState(false);
  
  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  
  const handleBuyIn = async () => {
    setIsBuying(true);
    
    try {
      // Get current game number before transaction
      const prevGameNumber = gameData.gameNumber;
      
      const result = await buyPlays();
      if (!result.success && result.error) {
        setToastMessage(`Transaction Error: ${result.error}`);
        setToastType('error');
      } else if (result.success) {
        if (result.startedNewGame) {
          // If we started a new game, show clear message
          setToastMessage(`Successfully started Game #${prevGameNumber + 1}!`);
        } else {
          setToastMessage(`Successfully bought ${result.plays} plays!`);
        }
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

  // Handle committing choices
  const handleCommitChoices = async (shapes: ShapeSelection) => {
    try {
      const result = await commitChoices(shapes);
      if (!result.success && result.error) {
        setToastMessage(`Commit Error: ${result.error}`);
        setToastType('error');
        return result;
      } else if (result.success) {
        setToastMessage(`Successfully committed ${shapes.circles} circles, ${shapes.squares} squares, and ${shapes.triangles} triangles!`);
        setToastType('success');
      }
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setToastMessage(`Commit failed: ${errorMessage}`);
      setToastType('error');
      console.error('Error committing choices:', error);
      return { success: false, error: errorMessage };
    }
  };

  // Handle revealing choices
  const handleRevealChoices = async () => {
    try {
      const result = await revealChoices();
      if (!result.success && result.error) {
        setToastMessage(`Reveal Error: ${result.error}`);
        setToastType('error');
        return result;
      } else if (result.success) {
        const shapes = result.shapes as ShapeSelection;
        setToastMessage(`Successfully revealed ${shapes.circles} circles, ${shapes.squares} squares, and ${shapes.triangles} triangles!`);
        setToastType('success');
      }
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setToastMessage(`Reveal failed: ${errorMessage}`);
      setToastType('error');
      console.error('Error revealing choices:', error);
      return { success: false, error: errorMessage };
    }
  };

  // Keep track of the last game number to detect game transitions
  const lastGameNumberRef = React.useRef<number>(0);
  
  // Show toast for contract errors and game number changes
  useEffect(() => {
    if (gameData.error) {
      setToastMessage(`Error: ${gameData.error}`);
      setToastType('error');
    }
    
    // Check if game number has changed - this means a new game started
    if (lastGameNumberRef.current > 0 && gameData.gameNumber > lastGameNumberRef.current) {
      setToastMessage(`A new game (#${gameData.gameNumber}) has started! Buy plays to join.`);
      setToastType('info');
    }
    
    // Update reference
    lastGameNumberRef.current = gameData.gameNumber;
  }, [gameData.error, gameData.gameNumber]);

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
        isGameEnded={gameData.isGameEnded}
        willBuyingStartNewGame={gameData.willBuyingStartNewGame}
        hasCommitted={gameData.hasCommitted}
        hasRevealed={gameData.hasRevealed}
        playerRemainingPlays={gameData.playerRemainingPlays}
        commitCount={gameData.commitCount}
        revealedShapes={gameData.revealedShapes}
        onCommitChoices={handleCommitChoices}
        onRevealChoices={handleRevealChoices}
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