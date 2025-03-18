'use client';

import { useEffect, useState, useRef } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';
import { ethers } from 'ethers';

interface GameData {
  gameNumber: number;
  playerCount: number;
  potSize: number;
  lastGameMultiple?: number;
  playCost: number;
  isLoading: boolean;
  error: string | null;
}

export function useZigZagZog() {
  const { contract, isConnected, isCorrectNetwork } = useWeb3();
  // Track initial load state
  const isInitialLoadRef = useRef(true);
  
  const [gameData, setGameData] = useState<GameData>({
    gameNumber: 0,
    playerCount: 0,
    potSize: 0,
    lastGameMultiple: undefined,
    playCost: 0,
    isLoading: true,
    error: null
  });

  // Fetch game data from the contract
  const fetchGameData = async (forceLoadingState = false) => {
    if (!contract || !isConnected || !isCorrectNetwork) {
      setGameData(prev => ({ 
        ...prev,
        isLoading: false,
        error: "Wallet not connected or wrong network"
      }));
      return;
    }

    try {
      // Only show loading state on initial load or when explicitly forced
      // This prevents flickering during periodic updates
      if (isInitialLoadRef.current || forceLoadingState) {
        setGameData(prev => ({ ...prev, isLoading: true, error: null }));
      }

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

      // Update state with contract data
      setGameData(prev => ({
        ...prev, // Keep any existing data during transitions
        gameNumber: Number(currentGameNumber),
        playerCount: 0, // We need an event listener to count participants
        potSize: Number(ethers.formatEther(gameBalance)),
        lastGameMultiple,
        playCost: Number(ethers.formatEther(playCost)),
        isLoading: false,
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
      
      // Refresh data after successful transaction - without loading state
      await fetchGameData(false);
      
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
    
    // Initial load (will show loading indicator on first load)
    fetchGameData(false);
    
    // Track if the component is mounted
    let isMounted = true;
    
    // For periodic silent refreshes
    let refreshInterval: NodeJS.Timeout | null = null;
    
    // Set up silent refresh at a reasonable interval
    // Only if we have contract and connection
    if (contract && isConnected && isCorrectNetwork) {
      refreshInterval = setInterval(() => {
        if (isMounted) {
          // Silent refresh (no loading indicator)
          fetchGameData(false);
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
    refreshGameData: (forceLoading = false) => fetchGameData(forceLoading)
  };
}