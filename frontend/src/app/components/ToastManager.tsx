'use client';

import React from 'react';
import Toast from '@/components/Toast';

interface ToastManagerProps {
  message: string | null;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
  onRetry?: () => void;
  hasError: boolean;
  duration?: number;
}

export default function ToastManager({
  message,
  type,
  onClose,
  onRetry,
  hasError,
  duration = undefined
}: ToastManagerProps) {
  if (!message) return null;
  
  if (hasError && onRetry) {
    return (
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <Toast 
          message={message} 
          type={type} 
          onClose={onClose} 
          duration={duration || 10000}
        />
        <button 
          onClick={onRetry}
          style={{ 
            marginTop: '10px', 
            padding: '5px 10px',
            backgroundColor: '#f0f0f0',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }
  
  return (
    <Toast 
      message={message} 
      type={type} 
      onClose={onClose} 
    />
  );
}