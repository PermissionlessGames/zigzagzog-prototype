'use client';

import React, { useState } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';
import ShapeSelector from './ShapeSelector';
import PlayQuantitySelector from './PlayQuantitySelector';
import RevealControls from './RevealControls';
import { GameData, ShapeSelection } from '@/hooks/useZigZagZog';
import { GamePhase } from './GameTimer';

interface GameControlsProps {
  gameData: GameData;
  onBuyIn: (quantity: number) => void;
  onCommitChoices: (shapes: ShapeSelection) => Promise<any>;
  onRevealChoices: () => Promise<any>;
  isProcessing: boolean;
}

export function GameControls({
  gameData,
  onBuyIn,
  onCommitChoices,
  onRevealChoices,
  isProcessing
}: GameControlsProps) {
  const { isConnected, isCorrectNetwork, currencySymbol } = useWeb3();
  const [playQuantity, setPlayQuantity] = useState<number>(1);
  const [isCommitting, setIsCommitting] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [currentGamePhase, setCurrentGamePhase] = useState<GamePhase>('nextRound');
  
  // Helper variables for timing
  const { 
    roundTimestamp, 
    commitDuration, 
    revealDuration, 
    isGameEnded,
    hasCommitted,
    hasRevealed,
    playerRemainingPlays,
    willBuyingStartNewGame,
    roundNumber
  } = gameData;
  
  const commitEndTime = roundTimestamp + commitDuration;
  const roundEndTime = commitEndTime + revealDuration;
  const now = Math.floor(Date.now() / 1000);
  
  // Helper to check if we're past both commit and reveal phases
  const isPastRoundEnd = () => {
    if (roundNumber === 0 && roundTimestamp === 0) return false; // New game
    return now > roundEndTime;
  };
  
  // Helper to check if we're in the reveal phase
  const isInRevealPhase = () => {
    if (roundNumber === 0 && roundTimestamp === 0) return false; // New game
    return now > commitEndTime && now <= roundEndTime;
  };
  
  // Determine if the player can commit or reveal
  const canCommitDuringCommitPhase = playerRemainingPlays > 0 && now <= commitEndTime && !hasCommitted;
  const canCommitForNewRound = playerRemainingPlays > 0 && isPastRoundEnd() && !hasCommitted;
  const canCommit = canCommitDuringCommitPhase || canCommitForNewRound;
  const canReveal = hasCommitted && !hasRevealed && isInRevealPhase();
  const needsBuyIn = playerRemainingPlays === 0;
  
  // Handle committing shapes
  const handleCommitShapes = async (shapes: ShapeSelection) => {
    setIsCommitting(true);
    try {
      await onCommitChoices(shapes);
    } finally {
      setIsCommitting(false);
    }
  };
  
  // Handle revealing shapes
  const handleRevealShapes = async () => {
    setIsRevealing(true);
    try {
      await onRevealChoices();
    } finally {
      setIsRevealing(false);
    }
  };

  if (!isConnected) {
    return <p style={{ textAlign: 'center', marginTop: '2rem' }}>Connect your wallet to play</p>;
  }
  
  if (!isCorrectNetwork) {
    return <p style={{ textAlign: 'center', marginTop: '2rem' }}>Switch to the correct network to play</p>;
  }
  
  if (isGameEnded) {
    return (
      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <div style={{
          padding: '1rem',
          marginBottom: '1.5rem',
          backgroundColor: '#f8f9fa',
          border: '1px solid #28a745',
          borderRadius: '0.25rem',
          color: '#28a745',
          fontWeight: 'bold'
        }}>
          <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
            Game #{gameData.gameNumber} has ended!
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 'normal', color: '#333' }}>
            A game can end in several ways:<br />
            1. When only one player remains with surviving shapes<br />
            2. When only one shape type is left, but the same player has all shapes<br />
            3. When all three shapes have the same count (stalemate)
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            Buy plays to start a new game.
          </div>
        </div>
        
        <PlayQuantitySelector
          value={playQuantity}
          onChange={setPlayQuantity}
          disabled={isProcessing}
          min={1}
        />
        
        <button 
          onClick={() => onBuyIn(playQuantity)}
          disabled={isProcessing}
          style={{ 
            fontSize: '1.1rem', 
            padding: '0.6rem 1.2rem',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            opacity: isProcessing ? 0.7 : 1,
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem'
          }}
        >
          {isProcessing ? 'Processing...' : `Start New Game - ${playQuantity} plays (${(gameData.playCost * playQuantity).toFixed(4)} ${currencySymbol})`}
        </button>
        <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.8 }}>
          When you buy plays, a new game will automatically start.
        </div>
      </div>
    );
  }
  
  if (needsBuyIn) {
    return (
      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        {/* Message about buying plays starting a new game removed */}
        
        <PlayQuantitySelector
          value={playQuantity}
          onChange={setPlayQuantity}
          disabled={isProcessing}
          min={1}
        />
        
        <button 
          onClick={() => onBuyIn(playQuantity)}
          disabled={isProcessing}
          style={{ 
            fontSize: '1.1rem', 
            padding: '0.6rem 1.2rem',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            opacity: isProcessing ? 0.7 : 1,
            backgroundColor: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem'
          }}
        >
          {isProcessing 
            ? 'Processing...' 
            : `Buy ${playQuantity} plays (${(gameData.playCost * playQuantity).toFixed(4)} ${currencySymbol})`
          }
        </button>
        <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.8 }}>
          Select the number of plays you want to purchase.
        </div>
      </div>
    );
  }
  
  return (
    <div style={{ marginTop: '2rem', textAlign: 'center' }}>
      {/* Player has plays but needs to wait for next round - only show if not canCommit */}
      {currentGamePhase === 'nextRound' && !canCommit && (
        <div style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
          <p>
            You have <strong>{playerRemainingPlays}</strong> plays ready for the next round.
          </p>
          {roundNumber > 0 ? (
            <p>Waiting for next round to start. The game will progress when a player commits.</p>
          ) : (
            <p>You can start the first round by committing shapes.</p>
          )}
        </div>
      )}
      
      {/* Player can commit shapes */}
      {canCommit && (
        <ShapeSelector 
          maxPlays={playerRemainingPlays}
          onSelectionConfirmed={handleCommitShapes}
          isCommitting={isCommitting}
          isNewRound={currentGamePhase === 'nextRound'}
        />
      )}
      
      {/* Player has committed but needs to wait for reveal phase */}
      {hasCommitted && currentGamePhase === 'commit' && (
        <div style={{ 
          marginTop: '1.5rem',
          padding: '1rem',
          border: '1px solid #ddd',
          borderRadius: '4px'
        }}>
          <h3 style={{ marginTop: 0 }}>Committed Shapes</h3>
          <p>You've already committed your shapes for this round.</p>
          <p>You'll need to reveal them once the reveal phase starts.</p>
        </div>
      )}
      
      {/* Player can reveal shapes */}
      {canReveal && (
        <RevealControls 
          gameNumber={gameData.gameNumber}
          roundNumber={gameData.roundNumber}
          onReveal={handleRevealShapes}
          isRevealing={isRevealing}
        />
      )}
      
      {/* Player has revealed */}
      {hasRevealed && (
        <div style={{ 
          marginTop: '1.5rem',
          padding: '1rem',
          border: '1px solid #4caf50',
          borderRadius: '4px',
          backgroundColor: '#f1f8e9'
        }}>
          <h3 style={{ marginTop: 0, color: '#4caf50' }}>Shapes Successfully Revealed</h3>
          <p>You've successfully revealed your shapes for this round.</p>
          
          <div style={{ 
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            margin: '1rem 0',
            backgroundColor: 'white',
            borderRadius: '50%',
            width: '64px',
            height: '64px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            color: '#4caf50',
            fontSize: '2rem'
          }}>
            ✓
          </div>
          
          <p>
            The round will end after all players reveal or the reveal phase time limit is reached. 
            After that, eliminations will be calculated and the next round will begin.
          </p>
          
          <p style={{ fontSize: '0.9rem', marginTop: '1rem' }}>
            <strong>How eliminations work:</strong><br />
            • If circles &gt; squares and circles &ge; triangles: circles are eliminated<br />
            • If squares &gt; circles and squares &ge; triangles: squares are eliminated<br />
            • If triangles &gt; circles and triangles &gt; squares: triangles are eliminated<br />
            • If all quantities are equal: nothing is eliminated
          </p>
        </div>
      )}
      
      {/* Show buy more plays button for players with plays */}
      <div style={{ marginTop: '2rem' }}>
        {/* Warning about buying plays starting a new game removed */}
        
        <PlayQuantitySelector
          value={playQuantity}
          onChange={setPlayQuantity}
          disabled={isProcessing}
          min={1}
        />
        
        <button 
          onClick={() => onBuyIn(playQuantity)}
          disabled={isProcessing}
          style={{ 
            fontSize: '1rem', 
            padding: '0.5rem 1rem',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            opacity: isProcessing ? 0.7 : 1,
            backgroundColor: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem'
          }}
        >
          {isProcessing 
            ? 'Processing...' 
            : `Buy ${playQuantity} more plays (${(gameData.playCost * playQuantity).toFixed(4)} ${currencySymbol})`
          }
        </button>
        <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.8 }}>
          Current plays: {playerRemainingPlays}
        </div>
      </div>
    </div>
  );
}