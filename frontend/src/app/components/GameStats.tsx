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
  return (
    <div className="game-stats">
      <h1 className="game-stats-title">Game #{gameNumber}</h1>
      <div className="game-stats-info">
        <p className="game-stats-players">{playerCount} players</p>
        <p className="game-stats-pot">{potSize} G7 in pot</p>
        {lastGameMultiple && (
          <p className="game-stats-multiples">
            Last game return on winning hands: {lastGameMultiple}x
          </p>
        )}
      </div>
    </div>
  );
} 