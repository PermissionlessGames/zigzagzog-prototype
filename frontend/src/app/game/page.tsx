'use client';

import React, { useState, useEffect } from 'react';
import { GameOverview } from '../components/GameOverview';
import { useZigZagZog, ShapeSelection } from '@/hooks/useZigZagZog';
import Toast from '@/components/Toast';
import { GameSelector } from '../components/GameSelector';
import { useWeb3 } from '@/contexts/Web3Context';

export default function GamePage() {
  const { contract, isConnected } = useWeb3();
  const { gameData, buyPlays, commitChoices, revealChoices, refreshGameData, setTargetGameNumber } = useZigZagZog();
  const [isBuying, setIsBuying] = useState(false);
  const [selectedGame, setSelectedGame] = useState<number | null>(null);
  const [currentContractGame, setCurrentContractGame] = useState<number>(0);
  
  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  
  // Fetch the current contract game number for comparison
  useEffect(() => {
    if (!contract || !isConnected) return;
    
    const fetchCurrentGameNumber = async () => {
      try {
        const gameNum = await contract.currentGameNumber();
        setCurrentContractGame(Number(gameNum));
      } catch (error) {
        console.error("Error fetching current game number:", error);
      }
    };
    
    fetchCurrentGameNumber();
    const interval = setInterval(fetchCurrentGameNumber, 15000); // Refresh every 15 seconds
    
    return () => clearInterval(interval);
  }, [contract, isConnected]);
  
  // When user selects a game, update the target game number in the hook
  const handleSelectGame = (gameNumber: number) => {
    setSelectedGame(gameNumber);
    setTargetGameNumber(gameNumber);
  };
  
  const handleBuyIn = async (quantity: number = 1) => {
    if (selectedGame === null) {
      setToastMessage("Please select a game first");
      setToastType('error');
      return;
    }
    
    // Verify user can buy plays for this game
    if (selectedGame < currentContractGame) {
      setToastMessage("Cannot buy plays for past games");
      setToastType('error');
      return;
    }
    
    if (selectedGame > currentContractGame + 1) {
      setToastMessage("Cannot buy plays for future games yet");
      setToastType('error');
      return;
    }
    
    setIsBuying(true);
    
    try {
      const result = await buyPlays(quantity);
      if (!result.success && result.error) {
        setToastMessage(`Transaction Error: ${result.error}`);
        setToastType('error');
      } else if (result.success) {
        if (result.startedNewGame) {
          setToastMessage(`Successfully started Game #${currentContractGame + 1} with ${quantity} plays!`);
          // Update our selected game to the new one
          setSelectedGame(currentContractGame + 1);
        } else {
          setToastMessage(`Successfully bought ${quantity} plays!`);
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
    
    // Check if contract game number has changed - this means a new game started
    if (lastGameNumberRef.current > 0 && currentContractGame > lastGameNumberRef.current) {
      setToastMessage(`A new game (#${currentContractGame}) has started!`);
      setToastType('info');
    }
    
    // Update reference
    lastGameNumberRef.current = currentContractGame;
  }, [gameData.error, currentContractGame]);

  // Close toast handler
  const handleCloseToast = () => {
    setToastMessage(null);
  };

  // Retry button for contract errors shown in toast
  const handleRetry = () => {
    refreshGameData();
    setToastMessage(null);
  };

  // Determine if the user can interact with the current game
  const canInteract = selectedGame !== null && (
    // Can interact with current game
    selectedGame === currentContractGame || 
    // Can start a new game if selected game is next
    (selectedGame === currentContractGame + 1 && gameData.willBuyingStartNewGame)
  );

  return (
    <div className="container">
      <h1 style={{ textAlign: 'center' }}>ZigZagZog</h1>
      
      {/* Game Selector */}
      <GameSelector 
        onSelectGame={handleSelectGame} 
        selectedGame={selectedGame}
      />
      
      {/* Game state explanation */}
      {selectedGame !== null && (
        <div className="game-state-info" style={{ 
          maxWidth: '600px', 
          margin: '0 auto 2rem auto',
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          {selectedGame < currentContractGame && (
            <p>You are viewing Game #{selectedGame} in spectator mode. This game has already completed.</p>
          )}
          
          {selectedGame === currentContractGame && gameData.roundNumber === 0 && (
            <p>Game #{selectedGame} has not started yet. Buy plays to start the game!</p>
          )}
          
          {selectedGame === currentContractGame && gameData.roundNumber > 0 && !gameData.isGameEnded && (
            <p>Game #{selectedGame} is in progress. You can participate if you have plays or buy new plays.</p>
          )}
          
          {selectedGame === currentContractGame && gameData.isGameEnded && (
            <p>Game #{selectedGame} has ended. Start a new game by buying plays for Game #{currentContractGame + 1}.</p>
          )}
          
          {selectedGame === currentContractGame + 1 && (
            <p>Game #{selectedGame} is the next game. Buy plays to start this new game.</p>
          )}
          
          {selectedGame > currentContractGame + 1 && (
            <p>Game #{selectedGame} is not available yet. Please wait for Game #{currentContractGame + 1} to complete first.</p>
          )}
        </div>
      )}
      
      {/* Game content */}
      {selectedGame !== null && (
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
          // Add a read-only flag for past games
          readOnly={!canInteract}
        />
      )}
      
      {/* Toasts */}
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
      
      {toastMessage && !gameData.error && (
        <Toast 
          message={toastMessage} 
          type={toastType} 
          onClose={handleCloseToast} 
        />
      )}
    </div>
  );
}