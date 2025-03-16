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
    <div className="game-stats">
      <div className="game-stats-header">
        <h1 className="game-stats-title">Game {gameNumber}</h1>
        <div className="game-stats-symbols">
          ○ ∆ □ ◊
        </div>
      </div>
      <div className="game-stats-info">
        <div className="game-stats-main">
          <p className="game-stats-players">{formatNumber(playerCount)} players</p>
          <span className="game-stats-separator">|</span>
          <p className="game-stats-pot">{formatNumber(potSize)} G7 in pot</p>
        </div>
        {lastGameMultiple && (
          <p className="game-stats-multiples">
            Last game return on winning hands: {lastGameMultiple}x
          </p>
        )}
      </div>
    </div>
  );
} 