import { useEffect, useState } from 'react';
import GameTimer from './GameTimer';

interface GameStatsProps {
  gameNumber: number;
  potSize: number;
  lastGameMultiple?: number;  // Optional in case it's the first game
  
  // Timer related props
  roundNumber: number;
  roundTimestamp: number;
  commitDuration: number;
  revealDuration: number;
  
  // Game statistics
  commitCount?: number;  // Number of players who have committed in current round
  revealedShapes?: {
    circles: number;
    squares: number;
    triangles: number;
  };
}

export function GameStats({
  gameNumber,
  potSize,
  lastGameMultiple,
  roundNumber,
  roundTimestamp,
  commitDuration,
  revealDuration,
  commitCount = 0,
  revealedShapes = { circles: 0, squares: 0, triangles: 0 }
}: GameStatsProps) {
  // Show placeholder values if data isn't loaded yet
  const hasData = gameNumber > 0 || potSize > 0;
  const [currentPhase, setCurrentPhase] = useState<'commit' | 'reveal' | 'nextRound'>('nextRound');
  
  // Update phase based on time, only on client-side to avoid hydration mismatch
  useEffect(() => {
    const updatePhase = () => {
      const now = Math.floor(Date.now() / 1000);
      const commitEndTime = roundTimestamp + commitDuration;
      const roundEndTime = commitEndTime + revealDuration;
      
      if (now <= commitEndTime) {
        setCurrentPhase('commit');
      } else if (now <= roundEndTime) {
        setCurrentPhase('reveal');
      } else {
        setCurrentPhase('nextRound');
      }
    };
    
    updatePhase();
    const interval = setInterval(updatePhase, 1000);
    return () => clearInterval(interval);
  }, [roundTimestamp, commitDuration, revealDuration]);
  
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return Intl.NumberFormat('en-US', { 
        notation: 'compact',
        maximumFractionDigits: 1
      }).format(num);
    }
    return Intl.NumberFormat('en-US').format(num);
  };

  return (
    <div className="game-info">
      <div style={{ marginBottom: '1rem' }}>
        <h2>Game #{hasData ? gameNumber : '...'}</h2>
        <div>● ▲ ■ ◆</div>
      </div>
      
      <div className="card">
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <div><strong>Pot Size:</strong> {hasData ? formatNumber(potSize) + ' TG7T' : '...'}</div>
        </div>
        
        {lastGameMultiple && (
          <div>
            <strong>Last Game Return:</strong> {lastGameMultiple}x
          </div>
        )}
        
        {/* Show commit count during commit phase */}
        {hasData && currentPhase === 'commit' && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '0.5rem', 
            backgroundColor: 'rgba(0, 123, 255, 0.1)', 
            borderRadius: '0.25rem',
            textAlign: 'center'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Commit Phase</div>
            <div>
              <strong>{commitCount}</strong> {commitCount === 1 ? 'player has' : 'players have'} committed
            </div>
          </div>
        )}
        
        {/* Show revealed shapes during reveal phase */}
        {hasData && currentPhase === 'reveal' && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '0.5rem', 
            backgroundColor: 'rgba(255, 152, 0, 0.1)', 
            borderRadius: '0.25rem'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', textAlign: 'center' }}>Revealed Shapes</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem' }}>●</div>
                <div>{revealedShapes.circles}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem' }}>■</div>
                <div>{revealedShapes.squares}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem' }}>▲</div>
                <div>{revealedShapes.triangles}</div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Game timer */}
      {hasData && (commitDuration > 0 || revealDuration > 0) && (
        <GameTimer 
          roundNumber={roundNumber}
          roundTimestamp={roundTimestamp}
          commitDuration={commitDuration}
          revealDuration={revealDuration}
        />
      )}
    </div>
  );
} 