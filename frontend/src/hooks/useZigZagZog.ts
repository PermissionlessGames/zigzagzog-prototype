'use client';

import { useEffect, useState, useRef } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';
import { ethers } from 'ethers';

interface GameData {
  gameNumber: number;
  potSize: number;
  lastGameMultiple?: number;
  playCost: number;
  
  // Round and timing information
  roundNumber: number;
  roundTimestamp: number;
  commitDuration: number;
  revealDuration: number;
  
  error: string | null;
}

export function useZigZagZog() {
  const { contract, isConnected, isCorrectNetwork } = useWeb3();
  // Track initial load state
  const isInitialLoadRef = useRef(true);
  
  const [gameData, setGameData] = useState<GameData>({
    gameNumber: 0,
    potSize: 0,
    lastGameMultiple: undefined,
    playCost: 0,
    
    // Round and timing information
    roundNumber: 0,
    roundTimestamp: 0,
    commitDuration: 0,
    revealDuration: 0,
    
    error: null
  });

  // Fetch game data from the contract
  const fetchGameData = async () => {
    if (!contract || !isConnected || !isCorrectNetwork) {
      setGameData(prev => ({ 
        ...prev,
        error: "Wallet not connected or wrong network"
      }));
      return;
    }

    try {
      // Just clear any existing errors
      setGameData(prev => ({ ...prev, error: null }));

      // First get the current game number
      const currentGameNumber = await contract.currentGameNumber();
      
      // Then get the rest of the data in parallel
      const [playCost, gameBalance, gameState, commitDuration, revealDuration] = await Promise.all([
        contract.playCost(),
        contract.gameBalance(currentGameNumber),
        contract.GameState(currentGameNumber),
        contract.commitDuration(),
        contract.revealDuration()
      ]);
      
      // Extract values from gameState
      const roundNumber = Number(gameState.roundNumber);
      const roundTimestamp = Number(gameState.roundTimestamp);
      
      // For previous game return multiple, if this isn't the first game
      let lastGameMultiple;
      if (Number(currentGameNumber) > 0) {
        try {
          const previousGameBalance = await contract.gameBalance(Number(currentGameNumber) - 1);
          
          // This is a simple calculation - in a real implementation,
          // you would need to analyze the contract to determine the actual formula
          if (previousGameBalance > 0) {
            // This is just a placeholder - the actual calculation would depend on contract implementation
            lastGameMultiple = 2.0; // Example value
          }
        } catch (error) {
          console.error("Error fetching previous game data:", error);
        }
      }

      // Mark initial load as complete
      isInitialLoadRef.current = false;

      // Update state with contract data
      setGameData(prev => ({
        ...prev, // Keep any existing data during transitions
        gameNumber: Number(currentGameNumber),
        potSize: Number(ethers.formatEther(gameBalance)),
        lastGameMultiple,
        playCost: Number(ethers.formatEther(playCost)),
        
        // Round and timing information
        roundNumber,
        roundTimestamp,
        commitDuration: Number(commitDuration),
        revealDuration: Number(revealDuration),
        
        error: null
      }));
    } catch (error) {
      console.error("Error loading contract data:", error);
      // Only update error state, preserve previous data
      setGameData(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: "Failed to load game data from contract" 
      }));
    }
  };

  // Handle buying plays
  const buyPlays = async () => {
    if (!contract || !isConnected || !isCorrectNetwork) {
      return { success: false, error: "Wallet not connected or wrong network" };
    }

    try {
      // Call the buyPlays function on the contract
      const tx = await contract.buyPlays({
        value: ethers.parseEther(gameData.playCost.toString())
      });

      // Wait for transaction to be mined
      await tx.wait();
      
      // Refresh data after successful transaction
      await fetchGameData();
      
      return { success: true, error: null };
    } catch (error) {
      console.error("Error during buy-in:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Transaction failed" 
      };
    }
  };

  // Load data on initial render and when contract/connection state changes
  useEffect(() => {
    // Reset initial load flag when dependencies change
    isInitialLoadRef.current = true;
    
    // Initial data load
    fetchGameData();
    
    // Track if the component is mounted
    let isMounted = true;
    
    // For periodic silent refreshes
    let refreshInterval: NodeJS.Timeout | null = null;
    
    // Set up refresh at a reasonable interval
    // Only if we have contract and connection
    if (contract && isConnected && isCorrectNetwork) {
      refreshInterval = setInterval(() => {
        if (isMounted) {
          fetchGameData();
        }
      }, 15000); // 15 seconds delay
    }
    
    // Cleanup function
    return () => {
      isMounted = false;
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [contract, isConnected, isCorrectNetwork]);

  return {
    gameData,
    buyPlays,
    refreshGameData: () => fetchGameData()
  };
}