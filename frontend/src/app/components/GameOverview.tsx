'use client';

import React, { useState, useEffect } from 'react';
import { GameStats } from './GameStats';
import { useWeb3 } from '@/contexts/Web3Context';
import ShapeSelector from './ShapeSelector';
import { GamePhase } from './GameTimer';
import { ShapeSelection } from '@/hooks/useZigZagZog';

// Play Quantity Selector component
function PlayQuantitySelector({ 
  value, 
  onChange, 
  min = 1, 
  disabled = false 
}: { 
  value: number, 
  onChange: (value: number) => void, 
  min?: number, 
  disabled?: boolean 
}) {
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      marginBottom: '1rem'
    }}>
      <label style={{ marginRight: '1rem', fontWeight: 'bold' }}>
        Number of Plays:
      </label>
      <div style={{ 
        display: 'flex',
        border: '1px solid #ccc',
        borderRadius: '4px',
        overflow: 'hidden'
      }}>
        <button 
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={disabled || value <= min}
          style={{
            padding: '0.5rem 0.8rem',
            backgroundColor: disabled ? '#f0f0f0' : '#fff',
            border: 'none',
            borderRight: '1px solid #ccc',
            cursor: disabled || value <= min ? 'not-allowed' : 'pointer',
            opacity: disabled || value <= min ? 0.6 : 1
          }}
        >
          −
        </button>
        <input
          type="number"
          min={min}
          value={value}
          onChange={(e) => {
            const newValue = parseInt(e.target.value, 10);
            if (!isNaN(newValue) && newValue >= min) {
              onChange(newValue);
            }
          }}
          disabled={disabled}
          style={{
            width: '4rem',
            border: 'none',
            textAlign: 'center',
            fontSize: '1rem',
            padding: '0.5rem 0',
            outline: 'none'
          }}
        />
        <button 
          onClick={() => onChange(value + 1)}
          disabled={disabled}
          style={{
            padding: '0.5rem 0.8rem',
            backgroundColor: disabled ? '#f0f0f0' : '#fff',
            border: 'none',
            borderLeft: '1px solid #ccc',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.6 : 1
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}

// RevealPreview component to show what the player is about to reveal
function RevealPreview({ gameNumber, roundNumber }: { gameNumber: number, roundNumber: number }) {
  const [commitment, setCommitment] = React.useState<{nonce: number, shapes: ShapeSelection} | null>(null);
  
  React.useEffect(() => {
    try {
      const storedCommitment = localStorage.getItem(`commitment_${gameNumber}_${roundNumber}`);
      if (storedCommitment) {
        const parsed = JSON.parse(storedCommitment);
        setCommitment(parsed);
      }
    } catch (error) {
      console.error('Error reading commitment from localStorage:', error);
    }
  }, [gameNumber, roundNumber]);
  
  if (!commitment) {
    return <p>Loading your commitment data...</p>;
  }
  
  const { shapes } = commitment;
  const totalShapes = shapes.circles + shapes.squares + shapes.triangles;
  
  return (
    <div style={{ 
      marginTop: '1rem', 
      marginBottom: '1rem',
      padding: '0.8rem',
      backgroundColor: 'rgba(255, 152, 0, 0.1)',
      borderRadius: '4px',
      textAlign: 'center'
    }}>
      <p style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>Your committed shapes:</p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
        <div>
          <div style={{ fontSize: '1.5rem' }}>●</div>
          <div>{shapes.circles}</div>
        </div>
        <div>
          <div style={{ fontSize: '1.5rem' }}>■</div>
          <div>{shapes.squares}</div>
        </div>
        <div>
          <div style={{ fontSize: '1.5rem' }}>▲</div>
          <div>{shapes.triangles}</div>
        </div>
      </div>
      <div style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
        Total: {totalShapes} shapes
      </div>
    </div>
  );
}

interface GameOverviewProps {
  gameNumber: number;
  potSize: number;
  lastGameMultiple?: number;  // Optional in case it's the first game
  buyInAmount: number;
  onBuyIn: (quantity: number) => void;  // Updated to accept quantity
  isProcessing?: boolean;  // Added to show loading state
  
  // Timer related props
  roundNumber: number;
  roundTimestamp: number;
  commitDuration: number;
  revealDuration: number;
  
  // Game status
  isGameEnded?: boolean;  // Flag indicating if the current game has ended
  willBuyingStartNewGame?: boolean;  // Flag indicating if buying plays will start a new game
  
  // Player status
  hasCommitted: boolean;
  hasRevealed: boolean;
  playerRemainingPlays: number;
  
  // Game statistics
  commitCount?: number;
  revealedShapes?: {
    circles: number;
    squares: number;
    triangles: number;
  };
  
  // Commit and reveal handlers
  onCommitChoices: (shapes: ShapeSelection) => Promise<any>;
  onRevealChoices: () => Promise<any>;
  
  // New property to handle spectator mode or past games
  readOnly?: boolean;  // If true, user can only view but not interact
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
  revealDuration,
  isGameEnded = false,
  willBuyingStartNewGame = false,
  hasCommitted,
  hasRevealed,
  playerRemainingPlays,
  commitCount = 0,
  revealedShapes = { circles: 0, squares: 0, triangles: 0 },
  onCommitChoices,
  onRevealChoices,
  readOnly = false
}: GameOverviewProps) {
  const { isConnected, isCorrectNetwork, currencySymbol } = useWeb3();
  const [currentGamePhase, setCurrentGamePhase] = useState<GamePhase>('nextRound');
  const [isCommitting, setIsCommitting] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [now, setNow] = useState(0);
  const [playQuantity, setPlayQuantity] = useState<number>(1);
  
  // Helper variables for timing
  const commitEndTime = roundTimestamp + commitDuration;
  const roundEndTime = commitEndTime + revealDuration;
  
  // Update time only on client side to avoid hydration mismatch
  useEffect(() => {
    setNow(Math.floor(Date.now() / 1000));
    
    // Update every second
    const interval = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Helper to check if we're past both commit and reveal phases
  const isPastRoundEnd = () => {
    if (roundNumber === 0 && roundTimestamp === 0) return false; // New game
    if (now === 0) return false; // Not initialized yet
    
    return now > roundEndTime;
  };
  
  // Helper to check if we're in the reveal phase (past commit phase but before round end)
  const isInRevealPhase = () => {
    if (roundNumber === 0 && roundTimestamp === 0) return false; // New game
    if (now === 0) return false; // Not initialized yet
    
    return now > commitEndTime && now <= roundEndTime;
  };
  
  // Calculate the current phase
  useEffect(() => {
    // Handle the first round which hasn't started yet
    if (roundNumber === 0 && roundTimestamp === 0) {
      setCurrentGamePhase('nextRound');
      return;
    }
    
    // Wait until time is initialized
    if (now === 0) return;
    
    let newPhase: GamePhase = 'nextRound';
    
    if (now <= commitEndTime) {
      newPhase = 'commit';
    } else if (now <= roundEndTime) {
      newPhase = 'reveal';
    } else {
      newPhase = 'nextRound';
    }
    
    console.log('Calculating phase:', {
      now,
      roundTimestamp,
      commitDuration,
      revealDuration,
      commitEndTime,
      roundEndTime,
      newPhase
    });
    
    setCurrentGamePhase(newPhase);
  }, [roundNumber, roundTimestamp, commitDuration, revealDuration, now, commitEndTime, roundEndTime]);
  
  // Handle committing shapes
  const handleCommitShapes = async (shapes: ShapeSelection) => {
    if (!onCommitChoices) return;
    
    setIsCommitting(true);
    try {
      const result = await onCommitChoices(shapes);
      if (!result.success && result.error) {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error committing shapes:', error);
      alert('Failed to commit shapes. Please try again.');
    } finally {
      setIsCommitting(false);
    }
  };
  
  // Handle revealing shapes
  const handleRevealShapes = async () => {
    if (!onRevealChoices) return;
    
    setIsRevealing(true);
    try {
      const result = await onRevealChoices();
      if (!result.success && result.error) {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error revealing shapes:', error);
      alert('Failed to reveal shapes. Please try again.');
    } finally {
      setIsRevealing(false);
    }
  };
  
  // Determine if the player has plays and needs to take action
  const canCommitDuringCommitPhase = playerRemainingPlays > 0 && currentGamePhase === 'commit' && !hasCommitted;
  const canCommitForNewRound = playerRemainingPlays > 0 && isPastRoundEnd() && !hasCommitted;
  const canCommit = canCommitDuringCommitPhase || canCommitForNewRound;
  
  // A player can reveal if they have committed but not revealed, and we're in the reveal phase
  // Important: We directly check the timing here instead of relying on currentGamePhase
  const canReveal = hasCommitted && !hasRevealed && isInRevealPhase();
  
  const needsBuyIn = playerRemainingPlays === 0;
    
  console.log('GameOverview Debug:', { 
    playerRemainingPlays, 
    currentGamePhase,
    isPastRoundEnd: isPastRoundEnd(),
    canCommitDuringCommitPhase,
    canCommitForNewRound,
    now,
    roundTimestamp,
    commitDuration,
    revealDuration,
    commitEndTime,
    roundEndTime,
    timeUntilCommitEnd: commitEndTime - now,
    timeUntilRoundEnd: roundEndTime - now,
    hasCommitted, 
    hasRevealed,
    canCommit,
    canReveal,
    needsBuyIn,
    roundNumber
  });
  
  return (
    <div className="container">
      {/* Debug info - remove in production */}
      {/* Only render client-side time-based values after component is mounted */}
      <div style={{ 
        marginBottom: '1rem', 
        padding: '0.5rem',
        border: '1px dashed #ccc',
        fontSize: '0.8rem',
        background: '#f9f9f9'
      }}>
        <div><strong>Debug Info</strong></div>
        <div>Game #: {gameNumber}</div>
        <div style={{ 
          color: isGameEnded ? '#d32f2f' : 'inherit', 
          fontWeight: isGameEnded ? 'bold' : 'normal',
          backgroundColor: isGameEnded ? '#ffebee' : 'inherit',
          padding: isGameEnded ? '2px 4px' : '0'
        }}>
          Game Ended: {isGameEnded.toString()} (via hasGameEnded contract call)
        </div>
        <div style={{ color: willBuyingStartNewGame ? '#28a745' : 'inherit', fontWeight: willBuyingStartNewGame ? 'bold' : 'normal' }}>
          Buy → New Game: {willBuyingStartNewGame.toString()}
        </div>
        <div>Phase: {currentGamePhase}</div>
        <div>Round: {roundNumber}</div>
        
        {now > 0 && (
          <>
            <div style={{ color: isInRevealPhase() ? '#ff9800' : 'inherit', fontWeight: isInRevealPhase() ? 'bold' : 'normal' }}>
              In Reveal Phase: {isInRevealPhase().toString()}
            </div>
            <div>Past Round End: {isPastRoundEnd().toString()}</div>
            <div>Time Until Commit End: {commitEndTime - now}s</div>
            <div>Time Until Round End: {roundEndTime - now}s</div>
            <div>Can Commit (Commit Phase): {canCommitDuringCommitPhase.toString()}</div>
            <div>Can Commit (New Round): {canCommitForNewRound.toString()}</div>
            <div>Can Commit (Overall): {canCommit.toString()}</div>
            <div style={{ color: canReveal ? '#ff9800' : 'inherit', fontWeight: canReveal ? 'bold' : 'normal' }}>
              Can Reveal: {canReveal.toString()}
            </div>
          </>
        )}
        
        <div>Needs Buy In: {needsBuyIn.toString()}</div>
        <div>Player Plays: {playerRemainingPlays}</div>
        <div>Has Committed: {hasCommitted.toString()}</div>
        <div>Has Revealed: {hasRevealed.toString()}</div>
        <div style={{ marginTop: '4px' }}>
          <strong>Game Statistics:</strong>
        </div>
        <div>Circle Count: {revealedShapes.circles}</div>
        <div>Square Count: {revealedShapes.squares}</div>
        <div>Triangle Count: {revealedShapes.triangles}</div>
      </div>
      
      <GameStats
        gameNumber={gameNumber}
        potSize={potSize}
        lastGameMultiple={lastGameMultiple}
        roundNumber={roundNumber}
        roundTimestamp={roundTimestamp}
        commitDuration={commitDuration}
        revealDuration={revealDuration}
        isGameEnded={isGameEnded}
        commitCount={commitCount}
        revealedShapes={revealedShapes}
      />
      
      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        {readOnly ? (
          <div style={{
            padding: '1rem',
            marginBottom: '1rem',
            backgroundColor: '#f9f9f9',
            border: '1px solid #ddd',
            borderRadius: '0.25rem',
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Spectator Mode</h3>
            <p style={{ margin: 0 }}>You are viewing this game in read-only mode.</p>
          </div>
        ) : !isConnected ? (
          <p>Connect your wallet to play</p>
        ) : !isCorrectNetwork ? (
          <p>Switch to the correct network to play</p>
        ) : isGameEnded ? (
          <div>
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
                Game #{gameNumber} has ended!
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
              {isProcessing ? 'Processing...' : `Start New Game - ${playQuantity} plays (${(buyInAmount * playQuantity).toFixed(4)} ${currencySymbol})`}
            </button>
            <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.8 }}>
              When you buy plays, a new game will automatically start.
            </div>
          </div>
        ) : needsBuyIn ? (
          <div>
            {willBuyingStartNewGame && (
              <div style={{
                padding: '0.5rem',
                marginBottom: '1rem',
                backgroundColor: '#f1f8e9',
                border: '1px solid #4caf50',
                borderRadius: '0.25rem',
                color: '#4caf50',
                fontWeight: 'bold'
              }}>
                Buying plays will start Game #{gameNumber + 1}!
              </div>
            )}
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
                backgroundColor: willBuyingStartNewGame ? '#4caf50' : 'inherit',
                color: willBuyingStartNewGame ? 'white' : 'inherit',
                border: willBuyingStartNewGame ? 'none' : '1px solid #ccc'
              }}
            >
              {isProcessing 
                ? 'Processing...' 
                : willBuyingStartNewGame 
                  ? `Start Game #${gameNumber + 1} - ${playQuantity} plays (${(buyInAmount * playQuantity).toFixed(4)} ${currencySymbol})`
                  : `Buy ${playQuantity} plays (${(buyInAmount * playQuantity).toFixed(4)} ${currencySymbol})`
              }
            </button>
            <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.8 }}>
              Select the number of plays you want to purchase.
            </div>
          </div>
        ) : (
          <div>
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
              <div style={{ 
                marginTop: '1.5rem',
                padding: '1rem',
                border: '1px solid #ff9800',
                borderRadius: '4px',
                backgroundColor: '#fff9e6'
              }}>
                <h3 style={{ marginTop: 0, color: '#ff9800' }}>Reveal Phase</h3>
                <p>The reveal phase has started. You need to reveal your committed shapes now.</p>
                
                {/* Try to get the commitment data to show what we're revealing */}
                <RevealPreview gameNumber={gameNumber} roundNumber={roundNumber} />
                
                <div style={{ marginTop: '1.5rem' }}>
                  <button 
                    onClick={handleRevealShapes}
                    disabled={isRevealing}
                    style={{ 
                      padding: '0.5rem 1rem',
                      backgroundColor: isRevealing ? '#f0f0f0' : '#ff9800',
                      color: isRevealing ? '#999' : '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '1rem',
                      cursor: isRevealing ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isRevealing ? 'Processing...' : 'Reveal Your Shapes'}
                  </button>
                  
                  <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: '#666' }}>
                    Important: You must reveal your shapes during the reveal phase or they will be lost.
                  </p>
                </div>
              </div>
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
              {willBuyingStartNewGame && (
                <div style={{
                  padding: '0.5rem',
                  marginBottom: '1rem',
                  backgroundColor: '#f1f8e9',
                  border: '1px solid #4caf50',
                  borderRadius: '0.25rem',
                  color: '#4caf50',
                  fontWeight: 'bold',
                  fontSize: '0.9rem'
                }}>
                  Warning: Buying plays now will start Game #{gameNumber + 1}!
                </div>
              )}
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
                  backgroundColor: willBuyingStartNewGame ? '#4caf50' : 'inherit',
                  color: willBuyingStartNewGame ? 'white' : 'inherit',
                  border: willBuyingStartNewGame ? 'none' : '1px solid #ccc'
                }}
              >
                {isProcessing 
                  ? 'Processing...' 
                  : willBuyingStartNewGame 
                    ? `Start Game #${gameNumber + 1} - ${playQuantity} plays (${(buyInAmount * playQuantity).toFixed(4)} ${currencySymbol})`
                    : `Buy ${playQuantity} more plays (${(buyInAmount * playQuantity).toFixed(4)} ${currencySymbol})`
                }
              </button>
              <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.8 }}>
                Current plays: {playerRemainingPlays}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}