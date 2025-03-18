interface GameStatsProps {
  gameNumber: number;
  handsCount: number;  // Changed from playerCount to handsCount
  potSize: number;
  lastGameMultiple?: number;  // Optional in case it's the first game
}

export function GameStats({
  gameNumber,
  handsCount,
  potSize,
  lastGameMultiple,
}: GameStatsProps) {
  // Show placeholder values if data isn't loaded yet
  const hasData = gameNumber > 0 || potSize > 0;
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
        <div className="flex-between" style={{ marginBottom: '1rem' }}>
          <div><strong>Hands Purchased:</strong> {hasData ? formatNumber(handsCount) : '...'}</div>
          <div><strong>Pot Size:</strong> {hasData ? formatNumber(potSize) + ' TG7T' : '...'}</div>
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