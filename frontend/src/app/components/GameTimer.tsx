'use client';

import { useEffect, useState } from 'react';

export type GamePhase = 'commit' | 'reveal' | 'nextRound';

interface GameTimerProps {
  // Unix timestamp in seconds when round started
  roundTimestamp: number; 
  // Duration of commit phase in seconds
  commitDuration: number;
  // Duration of reveal phase in seconds
  revealDuration: number;
  // Current round number
  roundNumber: number;
}

export default function GameTimer({ 
  roundTimestamp, 
  commitDuration, 
  revealDuration,
  roundNumber
}: GameTimerProps) {
  const [currentPhase, setCurrentPhase] = useState<GamePhase>('commit');
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [now, setNow] = useState<number>(Math.floor(Date.now() / 1000)); // Current time in seconds

  // Update the time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Calculate the current phase and time remaining
  useEffect(() => {
    // First, check if this is a brand new game with no rounds started yet
    if (roundNumber === 0 && roundTimestamp === 0) {
      // Special case for new game that hasn't started yet
      setCurrentPhase('nextRound');
      setTimeRemaining(0);
      return;
    }

    const commitEndTime = roundTimestamp + commitDuration;
    const roundEndTime = commitEndTime + revealDuration;

    // For debugging
    console.log({
      now,
      roundNumber,
      roundTimestamp,
      commitDuration,
      revealDuration,
      commitEndTime,
      roundEndTime,
      timeLeft: commitEndTime - now,
      phase: now <= commitEndTime ? 'commit' : now <= roundEndTime ? 'reveal' : 'nextRound'
    });

    // Determine current phase
    if (now <= commitEndTime) {
      // In commit phase
      setCurrentPhase('commit');
      setTimeRemaining(commitEndTime - now);
    } else if (now <= roundEndTime) {
      // In reveal phase
      setCurrentPhase('reveal');
      setTimeRemaining(roundEndTime - now);
    } else {
      // Round has ended, waiting for next round
      setCurrentPhase('nextRound');
      setTimeRemaining(0); // No countdown for next round as it depends on player actions
    }
  }, [now, roundTimestamp, commitDuration, revealDuration, roundNumber]);

  // Format time remaining as mm:ss
  const formatTime = (seconds: number): string => {
    if (seconds <= 0) return '00:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Get phase display text
  const getPhaseText = (): string => {
    switch (currentPhase) {
      case 'commit':
        return `Round ${roundNumber}: Commit Phase`;
      case 'reveal':
        return `Round ${roundNumber}: Reveal Phase`;
      case 'nextRound':
        if (roundNumber === 0 && roundTimestamp === 0) {
          return 'Game Ready to Start';
        }
        return `Round ${roundNumber} Complete`;
      default:
        return '';
    }
  };

  // Different styles for different phases
  const getPhaseStyle = () => {
    switch (currentPhase) {
      case 'commit':
        return { borderColor: '#2196f3', color: '#2196f3' };
      case 'reveal':
        return { borderColor: '#ff9800', color: '#ff9800' };
      case 'nextRound':
        return { borderColor: '#4caf50', color: '#4caf50' };
      default:
        return {};
    }
  };

  return (
    <div style={{ 
      marginTop: '1rem',
      padding: '1rem',
      border: `1px solid ${getPhaseStyle().borderColor || '#ddd'}`,
      borderRadius: '4px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
        <strong>Round {roundNumber}</strong>
      </div>
      <div style={{ 
        fontSize: '1.2rem', 
        fontWeight: 'bold',
        color: getPhaseStyle().color 
      }}>
        {getPhaseText()}
      </div>
      {currentPhase !== 'nextRound' && (
        <div style={{ fontSize: '2rem', marginTop: '0.5rem' }}>
          {formatTime(timeRemaining)}
        </div>
      )}
      {currentPhase === 'nextRound' && (
        <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
          {roundNumber === 0 && roundTimestamp === 0 
            ? "Game is ready to start. First player to commit will start Round 1."
            : `Round ${roundNumber} complete. New round starts on first commitment.`}
        </div>
      )}
    </div>
  );
}