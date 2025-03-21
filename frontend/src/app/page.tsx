'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useWeb3 } from '@/contexts/Web3Context';
import Toast from '@/components/Toast';

export default function HomePage() {
  const router = useRouter();
  const { contract } = useWeb3();
  const [gameId, setGameId] = useState<string>('');
  const [currentGameNumber, setCurrentGameNumber] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  
  // Reference to track if we've loaded data
  const hasLoadedRef = useRef(false);
  
  // Fetch current game number - only when contract is first available
  useEffect(() => {
    async function fetchCurrentGame() {
      if (!contract) return;
      if (hasLoadedRef.current && currentGameNumber !== null) return;
      
      try {
        const gameNum = await contract.currentGameNumber();
        setCurrentGameNumber(Number(gameNum));
        hasLoadedRef.current = true;
      } catch (error) {
        console.error("Error fetching current game number:", error);
      }
    }
    
    fetchCurrentGame();
    
    // Set up a less frequent refresh interval for the game number
    const interval = setInterval(fetchCurrentGame, 30000); // refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [contract, currentGameNumber]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const gameNumber = parseInt(gameId);
    if (isNaN(gameNumber) || gameNumber < 0) {
      setToastMessage("Please enter a valid game number (0 or higher)");
      setToastType('error');
      return;
    }
    
    // Navigate to the game page with the selected game number
    router.push(`/game/${gameNumber}`);
  };

  const handleCloseToast = () => {
    setToastMessage(null);
  };

  const handleViewCurrentGame = () => {
    if (currentGameNumber !== null) {
      router.push(`/game/${currentGameNumber}`);
    }
  };

  return (
    <div style={{ 
      maxWidth: '500px',
      margin: '3rem auto',
      padding: '2rem',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      backgroundColor: 'white'
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>ZigZagZog Game</h1>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label style={{ fontWeight: 'bold' }}>
          Enter Game ID:
          <input 
            type="number" 
            min="0"
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
            style={{ 
              display: 'block',
              width: '100%', 
              padding: '0.5rem',
              marginTop: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '1rem'
            }}
            required
          />
        </label>
        
        <button 
          type="submit"
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '1rem',
            cursor: 'pointer'
          }}
        >
          View Game
        </button>
      </form>
      
      {contract && (
        <div style={{ 
          marginTop: '2rem', 
          fontSize: '1rem', 
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '0.75rem' }}>
              {currentGameNumber !== null 
                ? `Current active game: #${currentGameNumber}` 
                : "Connecting to contract..."}
            </div>
            {currentGameNumber !== null && (
              <button
                onClick={handleViewCurrentGame}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
              >
                View Current Game
              </button>
            )}
          </div>
        </div>
      )}
      
      {toastMessage && (
        <Toast 
          message={toastMessage} 
          type={toastType} 
          onClose={handleCloseToast} 
        />
      )}
    </div>
  );
}