'use client';

import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose: () => void;
}

export default function Toast({ 
  message, 
  type = 'info', 
  duration = 3000, 
  onClose 
}: ToastProps) {
  // Auto-close the toast after duration
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  // Get color based on type
  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: '#e6f7e6',
          color: '#2e7d32',
          borderColor: '#2e7d32'
        };
      case 'error':
        return {
          backgroundColor: '#ffebee',
          color: '#c62828',
          borderColor: '#c62828'
        };
      case 'info':
      default:
        return {
          backgroundColor: '#e3f2fd',
          color: '#0d47a1',
          borderColor: '#0d47a1'
        };
    }
  };

  const typeStyles = getTypeStyles();

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        padding: '10px 15px',
        borderRadius: '4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        zIndex: 1000,
        border: `1px solid ${typeStyles.borderColor}`,
        maxWidth: '300px',
        ...typeStyles
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>{message}</div>
        <button 
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            marginLeft: '10px',
            fontSize: '16px',
            color: typeStyles.color,
            padding: '0',
            fontWeight: 'bold'
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}