'use client';

import React, { useState, useEffect } from 'react';
import { ShapeSelection } from '@/hooks/useZigZagZog';

interface ShapeSelectorProps {
  maxPlays: number;
  onSelectionConfirmed: (selection: ShapeSelection) => void;
  isCommitting: boolean;
  isNewRound?: boolean; // Flag to indicate if this is starting a new round
}

export default function ShapeSelector({ 
  maxPlays, 
  onSelectionConfirmed,
  isCommitting,
  isNewRound = false
}: ShapeSelectorProps) {
  const [circles, setCircles] = useState(0);
  const [squares, setSquares] = useState(0);
  const [triangles, setTriangles] = useState(0);
  const [error, setError] = useState('');
  
  // Calculate total and remaining
  const total = circles + squares + triangles;
  const remaining = maxPlays - total;
  
  // Reset selection when maxPlays changes
  useEffect(() => {
    setCircles(0);
    setSquares(0);
    setTriangles(0);
    setError('');
  }, [maxPlays]);
  
  const handleIncrement = (shape: 'circle' | 'square' | 'triangle') => {
    if (total >= maxPlays) {
      setError(`Can't add more shapes. You've used all ${maxPlays} plays.`);
      return;
    }
    
    setError('');
    
    switch (shape) {
      case 'circle':
        setCircles(prev => prev + 1);
        break;
      case 'square':
        setSquares(prev => prev + 1);
        break;
      case 'triangle':
        setTriangles(prev => prev + 1);
        break;
    }
  };
  
  const handleDecrement = (shape: 'circle' | 'square' | 'triangle') => {
    setError('');
    
    switch (shape) {
      case 'circle':
        if (circles > 0) setCircles(prev => prev - 1);
        break;
      case 'square':
        if (squares > 0) setSquares(prev => prev - 1);
        break;
      case 'triangle':
        if (triangles > 0) setTriangles(prev => prev - 1);
        break;
    }
  };
  
  const handleConfirm = () => {
    if (total === 0) {
      setError('You must select at least 1 shape.');
      return;
    }
    
    if (total > maxPlays) {
      setError(`You've selected ${total} shapes but only have ${maxPlays} plays.`);
      return;
    }
    
    onSelectionConfirmed({
      circles,
      squares,
      triangles
    });
  };
  
  return (
    <div style={{ 
      marginTop: '1.5rem',
      padding: '1rem',
      border: '1px solid #ddd',
      borderRadius: '4px'
    }}>
      <h3 style={{ marginTop: 0 }}>
        {isNewRound ? 'Start Next Round: Select Your Shapes' : 'Select Your Shapes'}
      </h3>
      
      {isNewRound && (
        <p style={{ color: '#4caf50', fontWeight: 'bold' }}>
          You're initiating a new round by committing your shapes!
        </p>
      )}
      
      <p>Remaining plays: <strong>{remaining}</strong> of {maxPlays}</p>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-around',
        marginBottom: '1.5rem'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>●</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button 
              onClick={() => handleDecrement('circle')}
              style={{ width: '30px' }}
              disabled={circles <= 0 || isCommitting}
            >-</button>
            <span style={{ margin: '0 10px', minWidth: '20px', textAlign: 'center' }}>{circles}</span>
            <button 
              onClick={() => handleIncrement('circle')}
              style={{ width: '30px' }}
              disabled={total >= maxPlays || isCommitting}
            >+</button>
          </div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>■</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button 
              onClick={() => handleDecrement('square')}
              style={{ width: '30px' }}
              disabled={squares <= 0 || isCommitting}
            >-</button>
            <span style={{ margin: '0 10px', minWidth: '20px', textAlign: 'center' }}>{squares}</span>
            <button 
              onClick={() => handleIncrement('square')}
              style={{ width: '30px' }}
              disabled={total >= maxPlays || isCommitting}
            >+</button>
          </div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>▲</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button 
              onClick={() => handleDecrement('triangle')}
              style={{ width: '30px' }}
              disabled={triangles <= 0 || isCommitting}
            >-</button>
            <span style={{ margin: '0 10px', minWidth: '20px', textAlign: 'center' }}>{triangles}</span>
            <button 
              onClick={() => handleIncrement('triangle')}
              style={{ width: '30px' }}
              disabled={total >= maxPlays || isCommitting}
            >+</button>
          </div>
        </div>
      </div>
      
      {error && (
        <div style={{ 
          color: 'red', 
          margin: '0.5rem 0', 
          fontSize: '0.9rem',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}
      
      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
        <button 
          onClick={handleConfirm}
          disabled={total === 0 || total > maxPlays || isCommitting}
          style={{ 
            padding: '0.5rem 1rem',
            backgroundColor: isCommitting ? '#f0f0f0' : '#000',
            color: isCommitting ? '#999' : '#fff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '1rem',
            cursor: isCommitting ? 'not-allowed' : 'pointer'
          }}
        >
          {isCommitting ? 'Processing...' : isNewRound ? 'Start Round with These Shapes' : 'Commit Shapes'}
        </button>
      </div>
    </div>
  );
}