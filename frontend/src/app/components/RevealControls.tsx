'use client';

import React, { useState, useEffect } from 'react';
import { ShapeSelection } from '@/hooks/useZigZagZog';

interface RevealControlsProps {
  gameNumber: number;
  roundNumber: number;
  onReveal: () => Promise<any>;
  isRevealing: boolean;
}

export default function RevealControls({
  gameNumber,
  roundNumber,
  onReveal,
  isRevealing
}: RevealControlsProps) {
  const [commitment, setCommitment] = useState<{nonce: number, shapes: ShapeSelection} | null>(null);
  
  useEffect(() => {
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
      marginTop: '1.5rem',
      padding: '1rem',
      border: '1px solid #ff9800',
      borderRadius: '4px',
      backgroundColor: '#fff9e6'
    }}>
      <h3 style={{ marginTop: 0, color: '#ff9800' }}>Reveal Phase</h3>
      <p>The reveal phase has started. You need to reveal your committed shapes now.</p>
      
      {/* Display committed shapes */}
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
      
      <div style={{ marginTop: '1.5rem' }}>
        <button 
          onClick={onReveal}
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
  );
}