'use client';

import React, { useEffect, useState } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';
import { ethers } from 'ethers';

interface GameSelectorProps {
  onSelectGame: (gameNumber: number) => void;
  selectedGame: number | null;
}

export function GameSelector({ onSelectGame, selectedGame }: GameSelectorProps) {
  const { contract, isConnected } = useWeb3();
  const [currentGameNumber, setCurrentGameNumber] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [gameInfos, setGameInfos] = useState<{[gameNumber: number]: { potSize: string, roundNumber: number }}>({});
  
  // Fetch the current game number and basic info for recent games
  useEffect(() => {
    if (!contract || !isConnected) return;
    
    const fetchGameData = async () => {
      setIsLoading(true);
      try {
        // Get the current game number
        const gameNum = await contract.currentGameNumber();
        const currentNum = Number(gameNum);
        setCurrentGameNumber(currentNum);
        
        // Get info for current and most recent games
        const gameData: {[gameNumber: number]: { potSize: string, roundNumber: number }} = {};
        
        // Fetch data for the current game, previous game (if exists), and next potential game
        const gamesToFetch = [];
        
        // Previous game (if exists)
        if (currentNum > 0) {
          gamesToFetch.push(currentNum - 1);
        }
        
        // Current game
        gamesToFetch.push(currentNum);
        
        // Next potential game
        gamesToFetch.push(currentNum + 1);
        
        // Fetch data for each game in parallel
        await Promise.all(
          gamesToFetch.map(async (gameNum) => {
            try {
              const [gameBalance, gameState] = await Promise.all([
                contract.gameBalance(gameNum),
                contract.GameState(gameNum)
              ]);
              
              const potSize = ethers.formatEther(gameBalance);
              const roundNumber = Number(gameState.roundNumber);
              
              gameData[gameNum] = {
                potSize,
                roundNumber
              };
            } catch (error) {
              console.error(`Error fetching data for game ${gameNum}:`, error);
              // For next game that doesn't exist yet
              if (gameNum === currentNum + 1) {
                gameData[gameNum] = {
                  potSize: "0.0",
                  roundNumber: 0
                };
              }
            }
          })
        );
        
        setGameInfos(gameData);
      } catch (error) {
        console.error("Error fetching game data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchGameData();
    
    // Set up polling to keep data fresh
    const interval = setInterval(fetchGameData, 15000); // Every 15 seconds
    
    return () => clearInterval(interval);
  }, [contract, isConnected]);
  
  // If we haven't selected a game yet and data is loaded, select the current game by default
  useEffect(() => {
    if (!isLoading && selectedGame === null && currentGameNumber > 0) {
      onSelectGame(currentGameNumber);
    }
  }, [isLoading, selectedGame, currentGameNumber, onSelectGame]);
  
  // Determine button status text based on game state
  const getGameButtonText = (gameNumber: number) => {
    if (!gameInfos[gameNumber]) return 'Loading...';
    
    if (gameNumber < currentGameNumber) {
      return 'Spectate Past Game';
    } else if (gameNumber === currentGameNumber) {
      return gameInfos[gameNumber].roundNumber > 0 
        ? 'Play Current Game' 
        : 'Start New Game';
    } else {
      return 'Coming Soon';
    }
  };
  
  if (isLoading) {
    return <div className="game-selector-loading">Loading games...</div>;
  }
  
  return (
    <div className="game-selector">
      <h2>Select a Game</h2>
      
      <div className="game-list">
        {/* Previous game button if exists */}
        {currentGameNumber > 0 && gameInfos[currentGameNumber - 1] && (
          <button 
            className={`game-button ${selectedGame === currentGameNumber - 1 ? 'selected' : ''}`}
            onClick={() => onSelectGame(currentGameNumber - 1)}
          >
            <div className="game-number">Game #{currentGameNumber - 1}</div>
            <div className="game-pot">Pot: {parseFloat(gameInfos[currentGameNumber - 1].potSize).toFixed(4)} ETH</div>
            <div className="game-status">{getGameButtonText(currentGameNumber - 1)}</div>
          </button>
        )}
        
        {/* Current game button */}
        {gameInfos[currentGameNumber] && (
          <button 
            className={`game-button ${selectedGame === currentGameNumber ? 'selected' : ''} current`}
            onClick={() => onSelectGame(currentGameNumber)}
          >
            <div className="game-number">Game #{currentGameNumber}</div>
            <div className="game-pot">Pot: {parseFloat(gameInfos[currentGameNumber].potSize).toFixed(4)} ETH</div>
            <div className="game-status">{getGameButtonText(currentGameNumber)}</div>
          </button>
        )}
        
        {/* Next potential game button */}
        <button 
          className={`game-button ${selectedGame === currentGameNumber + 1 ? 'selected' : ''} next`}
          onClick={() => onSelectGame(currentGameNumber + 1)}
          disabled={currentGameNumber === 0}
        >
          <div className="game-number">Game #{currentGameNumber + 1}</div>
          <div className="game-pot">Pot: 0.0000 ETH</div>
          <div className="game-status">{getGameButtonText(currentGameNumber + 1)}</div>
        </button>
      </div>
      
      <style jsx>{`
        .game-selector {
          margin: 2rem 0;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .game-list {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          justify-content: center;
          margin-top: 1rem;
        }
        
        .game-button {
          padding: 1rem;
          min-width: 200px;
          border: 1px solid #ccc;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        
        .game-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        
        .game-button.selected {
          border-color: #0070f3;
          border-width: 2px;
          background-color: #f0f7ff;
        }
        
        .game-button.current {
          border-color: #28a745;
        }
        
        .game-button.next {
          border-color: #6c757d;
          opacity: ${currentGameNumber === 0 ? 0.6 : 1};
        }
        
        .game-number {
          font-weight: bold;
          font-size: 1.2rem;
          margin-bottom: 0.5rem;
        }
        
        .game-pot {
          color: #666;
          margin-bottom: 0.5rem;
        }
        
        .game-status {
          font-size: 0.9rem;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          background-color: #f8f9fa;
        }
      `}</style>
    </div>
  );
}