'use client';

import React from 'react';

interface PlayQuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  disabled?: boolean;
}

export default function PlayQuantitySelector({ 
  value, 
  onChange, 
  min = 1, 
  disabled = false 
}: PlayQuantitySelectorProps) {
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      marginBottom: '1rem'
    }}>
      <label style={{ marginRight: '1rem', fontWeight: 'bold' }}>
        Number of Plays:
      </label>
      <div style={{ 
        display: 'flex',
        border: '1px solid #ccc',
        borderRadius: '4px',
        overflow: 'hidden'
      }}>
        <button 
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={disabled || value <= min}
          style={{
            padding: '0.5rem 0.8rem',
            backgroundColor: disabled ? '#f0f0f0' : '#fff',
            border: 'none',
            borderRight: '1px solid #ccc',
            cursor: disabled || value <= min ? 'not-allowed' : 'pointer',
            opacity: disabled || value <= min ? 0.6 : 1
          }}
        >
          −
        </button>
        <input
          type="number"
          min={min}
          value={value}
          onChange={(e) => {
            const newValue = parseInt(e.target.value, 10);
            if (!isNaN(newValue) && newValue >= min) {
              onChange(newValue);
            }
          }}
          disabled={disabled}
          style={{
            width: '4rem',
            border: 'none',
            textAlign: 'center',
            fontSize: '1rem',
            padding: '0.5rem 0',
            outline: 'none'
          }}
        />
        <button 
          onClick={() => onChange(value + 1)}
          disabled={disabled}
          style={{
            padding: '0.5rem 0.8rem',
            backgroundColor: disabled ? '#f0f0f0' : '#fff',
            border: 'none',
            borderLeft: '1px solid #ccc',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.6 : 1
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}