'use client';

import React, { useState } from 'react';
import { Shape } from './components/Shape';
import { GameSpectator } from './components/GameSpectator';

type Screen = 'title' | 'game';

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('title');
  const [hoveredShape, setHoveredShape] = useState<string | null>(null);

  // Temporary mock game state
  const mockGameState = {
    status: 'buying-in' as const,
    currentRound: 1,
    totalPlayers: 10,
    remainingPlayers: 10,
  };

  const handleBuyIn = () => {
    console.log('Buy in clicked');
    // Will implement wallet connection and contract interaction later
  };

  if (currentScreen === 'game') {
    return <GameSpectator gameState={mockGameState} onBuyIn={handleBuyIn} />;
  }

  return (
    <div className="container">
      <div>
        <h1 className="title">Zig Zag Zog</h1>
        <div className="card-grid">
          {['circle', 'square', 'triangle', 'diamond'].map((shape) => (
            <div 
              key={shape} 
              className="card"
              onMouseEnter={() => setHoveredShape(shape)}
              onMouseLeave={() => setHoveredShape(null)}
            >
              <Shape 
                type={shape as 'circle' | 'square' | 'triangle' | 'diamond'} 
                isActive={hoveredShape === shape}
              />
            </div>
          ))}
        </div>
        <button 
          className="play-button"
          onClick={() => setCurrentScreen('game')}
        >
          Play Now
        </button>
      </div>
    </div>
  );
}
