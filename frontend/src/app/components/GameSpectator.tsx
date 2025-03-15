interface GameState {
  status: 'buying-in' | 'in-progress' | 'completed';
  currentRound: number;
  totalPlayers: number;
  remainingPlayers: number;
  // We'll add more game state properties as needed
}

interface GameSpectatorProps {
  gameState: GameState;
  onBuyIn: () => void;
}

export function GameSpectator({ gameState, onBuyIn }: GameSpectatorProps) {
  return (
    <div className="game-spectator">
      <div className="game-info">
        <h2 className="game-status">
          Game #{gameState.currentRound} - {gameState.status.replace('-', ' ')}
        </h2>
        <div className="player-count">
          {gameState.remainingPlayers} / {gameState.totalPlayers} players remaining
        </div>
      </div>
      
      <div className="game-actions">
        {gameState.status === 'buying-in' ? (
          <button className="buy-in-button" onClick={onBuyIn}>
            Buy In to Next Game
          </button>
        ) : (
          <button className="buy-in-button" onClick={onBuyIn}>
            Lock In for Next Game
          </button>
        )}
      </div>
    </div>
  );
} 