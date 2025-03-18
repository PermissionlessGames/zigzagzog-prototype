interface GameStatsProps {
  gameNumber: number;
  playerCount: number;
  potSize: number;
  lastGameMultiple?: number;  // Optional in case it's the first game
}

export function GameStats({
  gameNumber,
  playerCount,
  potSize,
  lastGameMultiple,
}: GameStatsProps) {
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
        <h2>Game #{gameNumber}</h2>
        <div>● ▲ ■ ◆</div>
      </div>
      
      <div className="card">
        <div className="flex-between" style={{ marginBottom: '1rem' }}>
          <div><strong>Players:</strong> {formatNumber(playerCount)}</div>
          <div><strong>Pot Size:</strong> {formatNumber(potSize)} TG7T</div>
        </div>
        
        {lastGameMultiple && (
          <div>
            <strong>Last Game Return:</strong> {lastGameMultiple}x
          </div>
        )}
      </div>
    </div>
  );
} 