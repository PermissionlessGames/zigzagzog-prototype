'use client';

import { useEffect, useState, useRef } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';
import { ethers } from 'ethers';

interface GameData {
  gameNumber: number;
  handsCount: number; // Number of hands purchased instead of players
  potSize: number;
  lastGameMultiple?: number;
  playCost: number;
  error: string | null;
}

export function useZigZagZog() {
  const { contract, isConnected, isCorrectNetwork } = useWeb3();
  // Track initial load state
  const isInitialLoadRef = useRef(true);
  
  const [gameData, setGameData] = useState<GameData>({
    gameNumber: 0,
    handsCount: 0,
    potSize: 0,
    lastGameMultiple: undefined,
    playCost: 0,
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
      const [playCost, gameBalance] = await Promise.all([
        contract.playCost(),
        contract.gameBalance(currentGameNumber)
      ]);
      
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

      // Calculate number of hands purchased (pot size divided by play cost)
      const handsPurchased = playCost.gt(0)
        ? Math.floor(Number(gameBalance) / Number(playCost))
        : 0;

      // Update state with contract data
      setGameData(prev => ({
        ...prev, // Keep any existing data during transitions
        gameNumber: Number(currentGameNumber),
        handsCount: handsPurchased,
        potSize: Number(ethers.formatEther(gameBalance)),
        lastGameMultiple,
        playCost: Number(ethers.formatEther(playCost)),
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