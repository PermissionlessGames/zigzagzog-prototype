'use client';

import React from 'react';

interface GameHeaderProps {
  gameNumber: number;
  onSelectDifferent: () => void;
}

export default function GameHeader({ gameNumber, onSelectDifferent }: GameHeaderProps) {
  return (
    <div style={{ 
      padding: '1rem', 
      backgroundColor: '#f8f9fa', 
      margin: '1rem 0', 
      borderRadius: '8px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div>
        <h1 style={{ margin: 0 }}>Game #{gameNumber}</h1>
      </div>
      <button
        onClick={onSelectDifferent}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#f1f1f1',
          border: '1px solid #ddd',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Select Different Game
      </button>
    </div>
  );
}