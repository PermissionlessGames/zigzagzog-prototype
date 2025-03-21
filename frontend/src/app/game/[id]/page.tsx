'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import GameView from '@/app/components/GameView';
import GameHeader from '@/app/components/GameHeader';
import ToastManager from '@/app/components/ToastManager';
import { useZigZagZog, ShapeSelection } from '@/hooks/useZigZagZog';

export default function GamePage() {
  const router = useRouter();
  const params = useParams();
  const gameId = parseInt(params?.id as string);
  
  const { gameData, setTargetGameNumber } = useZigZagZog();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  
  // Set the target game when component mounts or ID changes
  useEffect(() => {
    if (!isNaN(gameId) && gameId >= 0) {
      setTargetGameNumber(gameId);
    } else {
      // Invalid game ID - redirect to home page
      router.push('/');
    }
  }, [gameId, router, setTargetGameNumber]);
  
  const handleSelectDifferent = () => {
    router.push('/');
  };
  
  const handleToastClose = () => {
    setToastMessage(null);
  };
  
  if (isNaN(gameId) || gameId < 0) {
    return null; // This will be redirected by the useEffect
  }

  return (
    <div className="container">
      <GameHeader 
        gameNumber={gameId}
        onSelectDifferent={handleSelectDifferent}
      />
      
      <GameView
        gameData={gameData}
        onToast={(message, type) => {
          setToastMessage(message);
          setToastType(type);
        }}
      />
      
      <ToastManager
        message={toastMessage}
        type={toastType}
        onClose={handleToastClose}
        hasError={!!gameData.error}
      />
    </div>
  );
}