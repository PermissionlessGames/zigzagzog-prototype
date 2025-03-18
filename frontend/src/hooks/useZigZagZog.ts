'use client';

import { useEffect, useState } from 'react';
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
  const fetchGameData = async () => {
    if (!contract || !isConnected || !isCorrectNetwork) {
      setGameData(prev => ({ 
        ...prev,
        isLoading: false,
        error: "Wallet not connected or wrong network"
      }));
      return;
    }

    try {
      setGameData(prev => ({ ...prev, isLoading: true, error: null }));

      // Get current game number
      const currentGameNumber = await contract.currentGameNumber();
      
      // Get play cost
      const playCost = await contract.playCost();
      
      // Get game balance (pot size)
      const gameBalance = await contract.gameBalance(currentGameNumber);
      
      // For previous game return multiple, if this isn't the first game
      let lastGameMultiple;
      if (currentGameNumber > 0) {
        try {
          const previousGameBalance = await contract.gameBalance(currentGameNumber - 1);
          
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

      // Update state with contract data
      setGameData({
        gameNumber: Number(currentGameNumber),
        playerCount: 0, // We need an event listener to count participants
        potSize: Number(ethers.formatEther(gameBalance)),
        lastGameMultiple,
        playCost: Number(ethers.formatEther(playCost)),
        isLoading: false,
        error: null
      });
    } catch (error) {
      console.error("Error loading contract data:", error);
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
    fetchGameData();
    
    // Set up periodic refresh
    const refreshInterval = setInterval(fetchGameData, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(refreshInterval);
  }, [contract, isConnected, isCorrectNetwork]);

  return {
    gameData,
    buyPlays,
    refreshGameData: fetchGameData
  };
}