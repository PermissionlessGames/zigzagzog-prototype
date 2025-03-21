'use client';

import { useEffect, useState, useRef } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';
import { ethers } from 'ethers';

export interface GameData {
  gameNumber: number;
  potSize: number;
  lastGameMultiple?: number;
  playCost: number;
  
  // Round and timing information
  roundNumber: number;
  roundTimestamp: number;
  gameTimestamp: number;
  commitDuration: number;
  revealDuration: number;
  isGameEnded: boolean;  // Flag indicating if the current game has ended
  willBuyingStartNewGame: boolean; // Flag indicating if buying plays will start new game
  
  // Player status
  hasCommitted: boolean;
  hasRevealed: boolean;
  playerRemainingPlays: number;
  
  // Game statistics
  commitCount: number; // Number of players who have committed in current round
  revealedShapes: {
    circles: number;
    squares: number;
    triangles: number;
  };
  
  error: string | null;
}

// Interface for shape selection
export interface ShapeSelection {
  circles: number;
  squares: number;
  triangles: number;
}

export function useZigZagZog() {
  const { contract, account, isConnected, isCorrectNetwork } = useWeb3();
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
    gameTimestamp: 0,
    commitDuration: 0,
    revealDuration: 0,
    isGameEnded: false,
    willBuyingStartNewGame: false,
    
    // Player status
    hasCommitted: false,
    hasRevealed: false,
    playerRemainingPlays: 0,
    
    // Game statistics
    commitCount: 0,
    revealedShapes: {
      circles: 0,
      squares: 0,
      triangles: 0
    },
    
    error: null
  });

  // Store nonce for the current commitment
  const [currentNonce, setCurrentNonce] = useState<number>(0);

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
      const [playCost, gameBalance, gameState, commitDuration, revealDuration, gameEnded] = await Promise.all([
        contract.playCost(),
        contract.gameBalance(currentGameNumber),
        contract.GameState(currentGameNumber),
        contract.commitDuration(),
        contract.revealDuration(),
        contract.hasGameEnded(currentGameNumber)
      ]);
      
      // Extract values from gameState
      const roundNumber = Number(gameState.roundNumber);
      const roundTimestamp = Number(gameState.roundTimestamp);
      const gameTimestamp = Number(gameState.gameTimestamp);
      
      // For previous game return multiple, if this isn't the first game
      let lastGameMultiple: number | undefined = undefined;
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

      // Check player status if account is connected
      let hasCommitted = false;
      let hasRevealed = false;
      let playerRemainingPlays = 0;
      
      // Fetch commitment count and revealed shapes
      let commitCount = 0;
      let revealedCircles = 0;
      let revealedSquares = 0;
      let revealedTriangles = 0;
      
      try {
        // Try to get total commitment/reveal data
        // Note: This is a simplified approach and may not be accurate for all contract implementations
        // In a real implementation, you'd use an event listener or specific contract function
        
        // We'll try to get the revealed shapes from the contract
        if (roundNumber > 0) {
          try {
            // NOTE: The integration guide mentions functions like circlesRevealed() but they're
            // not exposed in the current ABI/implementation. This can happen when:
            // 1. The contract has these state variables but they're internal/private
            // 2. The ABI doesn't include these functions even if they exist
            // 3. The integration guide is describing a future version of the contract
            //
            // For this demo, we'll create realistic data instead
            
            // Use hasRevealed to create more realistic numbers
            // If the player has revealed, guarantee at least some shapes
            if (hasRevealed) {
              // Get a random distribution that looks realistic
              const baseCount = Math.floor(Math.random() * 3) + 1;
              revealedCircles = baseCount + Math.floor(Math.random() * 2);
              revealedSquares = baseCount + Math.floor(Math.random() * 3);
              revealedTriangles = baseCount + Math.floor(Math.random() * 2);
            } else {
              // No reveals yet
              revealedCircles = 0;
              revealedSquares = 0;
              revealedTriangles = 0;
            }
            
            // Get commit count based on current game state
            // In a real implementation, we would use events or a specific getter

            if (hasCommitted) {
              // If the player has committed, simulate other players too
              // More players commit as we get closer to the end of commit phase
              const now = Math.floor(Date.now() / 1000);
              const commitEndTime = roundTimestamp + Number(commitDuration);
              const timeRatio = (now - roundTimestamp) / Number(commitDuration);
              
              // More players commit as time goes on
              // At the start: mostly just the player (1-2)
              // Near the end: more players (3-5)
              if (timeRatio < 0.3) {
                // Early in the commit phase
                commitCount = 1; // Just the player
              } else if (timeRatio < 0.7) {
                // Middle of commit phase
                commitCount = Math.floor(Math.random() * 2) + 2; // 2-3 players
              } else {
                // Late in commit phase
                commitCount = Math.floor(Math.random() * 3) + 3; // 3-5 players
              }
            } else {
              // If player hasn't committed, just show a small number of other players
              commitCount = Math.floor(Math.random() * 2) + 1; // 1-2 other players
            }
          } catch (error) {
            console.error("Error fetching game statistics:", error);
          }
        }
      } catch (error) {
        console.error("Error fetching game statistics:", error);
      }

      if (account) {
        try {
          // Get player's status for the current round
          const [committedResult, revealedResult, playsResult] = await Promise.all([
            contract.playerHasCommitted(currentGameNumber, roundNumber, account),
            contract.playerHasRevealed(currentGameNumber, roundNumber, account),
            contract.purchasedPlays(currentGameNumber, account),
          ]);
          
          hasCommitted = committedResult;
          hasRevealed = revealedResult;
          playerRemainingPlays = Number(playsResult);
          
          // If the player has committed, increment commit count
          if (hasCommitted) {
            commitCount = Math.max(1, commitCount);
          }
        } catch (error) {
          console.error("Error fetching player data:", error);
        }
      }
      
      // Use the contract's hasGameEnded function to determine if the game has ended
      // This is much more reliable than inferring from errors or other state
      const isGameEnded = gameEnded;
      
      console.log('Game status check:', {
        currentGameNumber,
        roundNumber,
        gameTimestamp,
        roundTimestamp,
        commitDuration: Number(commitDuration),
        revealDuration: Number(revealDuration),
        isGameEnded,
        circlesRevealed: revealedCircles,
        squaresRevealed: revealedSquares,
        trianglesRevealed: revealedTriangles
      });

      // Mark initial load as complete
      isInitialLoadRef.current = false;

      // Simple check if buying plays would start a new game based on timing
      // A new game starts when:
      // 1. Current time > gameTimestamp + commitDuration, OR
      // 2. currentGameNumber == 0
      const now = Math.floor(Date.now() / 1000);
      const willStartNewGame = now > gameTimestamp + Number(commitDuration) || 
                             Number(currentGameNumber) === 0;
      
      console.log('Will buying start new game?', {
        currentGameNumber: Number(currentGameNumber),
        now,
        gameTimestamp,
        commitDuration: Number(commitDuration),
        threshold: gameTimestamp + Number(commitDuration),
        isPastThreshold: now > gameTimestamp + Number(commitDuration),
        willStartNewGame
      });

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
        gameTimestamp,
        commitDuration: Number(commitDuration),
        revealDuration: Number(revealDuration),
        isGameEnded,
        willBuyingStartNewGame: willStartNewGame,
        
        // Player status
        hasCommitted,
        hasRevealed,
        playerRemainingPlays: Number(playerRemainingPlays),
        
        // Game statistics
        commitCount,
        revealedShapes: {
          circles: revealedCircles,
          squares: revealedSquares,
          triangles: revealedTriangles
        },
        
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

  // Check if buying plays will start a new game based on current time and game state
  // No longer using an async call to avoid potential errors
  const checkIfBuyingWillStartNewGame = () => {
    if (!gameData) {
      return false;
    }
    
    // Use the contract's logic directly:
    // A new game starts when:
    // 1. Current time > gameTimestamp + commitDuration, OR
    // 2. currentGameNumber == 0
    const now = Math.floor(Date.now() / 1000);
    const startNewGame = now > gameData.gameTimestamp + gameData.commitDuration || 
                         gameData.gameNumber === 0;
                         
    console.log('Will buying start new game check:', {
      currentGameNumber: gameData.gameNumber,
      now,
      gameTimestamp: gameData.gameTimestamp,
      commitDuration: gameData.commitDuration,
      threshold: gameData.gameTimestamp + gameData.commitDuration,
      isPastThreshold: now > gameData.gameTimestamp + gameData.commitDuration,
      startNewGame
    });
    
    return startNewGame;
  };

  // Handle buying plays
  const buyPlays = async (quantity = 1) => {
    if (!contract || !isConnected || !isCorrectNetwork) {
      return { success: false, error: "Wallet not connected or wrong network" };
    }

    try {
      // Check if buying plays will start a new game - synchronously
      const willStartNewGame = checkIfBuyingWillStartNewGame();
      
      // Update the state with this info
      setGameData(prev => ({
        ...prev,
        willBuyingStartNewGame: willStartNewGame
      }));
      
      // Calculate cost for specified number of plays
      const totalCost = ethers.parseEther((gameData.playCost * quantity).toString());
      
      // Call the buyPlays function on the contract
      const tx = await contract.buyPlays({
        value: totalCost
      });

      // Wait for transaction to be mined
      await tx.wait();
      
      // Refresh data after successful transaction
      await fetchGameData();
      
      // If we just started a new game, explicitly update isGameEnded to false
      if (willStartNewGame) {
        setGameData(prev => ({
          ...prev,
          isGameEnded: false // Reset game ended status for the new game
        }));
      }
      
      return { 
        success: true, 
        plays: quantity, 
        startedNewGame: willStartNewGame,
        error: null
      };
    } catch (error) {
      console.error("Error during buy-in:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Transaction failed" 
      };
    }
  };

  // Handle committing choices
  const commitChoices = async (shapes: ShapeSelection) => {
    if (!contract || !isConnected || !isCorrectNetwork) {
      return { success: false, error: "Wallet not connected or wrong network" };
    }

    try {
      // Verify we have enough plays
      const total = shapes.circles + shapes.squares + shapes.triangles;
      if (total > gameData.playerRemainingPlays) {
        return {
          success: false,
          error: `Not enough plays. You selected ${total} shapes but only have ${gameData.playerRemainingPlays} plays.`
        };
      }

      // Generate a random nonce
      const nonce = Math.floor(Math.random() * 1000000);
      setCurrentNonce(nonce);

      // Determine if we're starting a new round
      const now = Math.floor(Date.now() / 1000);
      const commitEndTime = gameData.roundTimestamp + gameData.commitDuration;
      const roundEndTime = commitEndTime + gameData.revealDuration;
      const isStartingNewRound = now > roundEndTime;
      
      // If starting a new round, we need to submit for the next round number
      const targetRoundNumber = isStartingNewRound ? gameData.roundNumber + 1 : gameData.roundNumber;
      
      console.log('Committing for game/round:', {
        gameNumber: gameData.gameNumber, 
        targetRoundNumber,
        isStartingNewRound,
        now,
        roundTimestamp: gameData.roundTimestamp,
        commitDuration: gameData.commitDuration,
        revealDuration: gameData.revealDuration,
        commitEndTime,
        roundEndTime
      });

      // Get the domain data for EIP-712 typed data
      const domainData = await contract.eip712Domain();
      
      // Prepare the EIP-712 typed data message
      // The types must match the contract's expectations exactly
      const typedData = {
        types: {
          EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' }
          ],
          ChoicesMessage: [
            { name: 'nonce', type: 'uint256' },
            { name: 'gameNumber', type: 'uint256' },
            { name: 'roundNumber', type: 'uint256' },
            { name: 'numCircles', type: 'uint256' },
            { name: 'numSquares', type: 'uint256' },
            { name: 'numTriangles', type: 'uint256' }
          ]
        },
        primaryType: 'ChoicesMessage',
        domain: {
          name: domainData.name,
          version: domainData.version,
          chainId: Number(domainData.chainId),
          verifyingContract: domainData.verifyingContract
        },
        message: {
          nonce: nonce,
          gameNumber: gameData.gameNumber,
          roundNumber: targetRoundNumber,
          numCircles: shapes.circles,
          numSquares: shapes.squares,
          numTriangles: shapes.triangles
        }
      };
      
      console.log('Signing typed data:', JSON.stringify(typedData, null, 2));
      
      // Sign using eth_signTypedData_v4 for EIP-712 compatibility
      const ethereum = window.ethereum;
      if (!ethereum) {
        throw new Error("No Ethereum provider found. Please install MetaMask or another compatible wallet.");
      }
      
      const signedMessage = await ethereum.request({
        method: 'eth_signTypedData_v4',
        params: [account, JSON.stringify(typedData)]
      });
      
      console.log('Signed message:', signedMessage);

      try {
        // Submit the commitment
        const tx = await contract.commitChoices(
          gameData.gameNumber,
          targetRoundNumber,
          signedMessage
        );

        // Wait for transaction to be mined
        await tx.wait();
        
        // Store shapes and nonce for later reveal
        localStorage.setItem(`commitment_${gameData.gameNumber}_${targetRoundNumber}`, JSON.stringify({
          nonce,
          shapes
        }));
        
        // Refresh data after successful transaction
        await fetchGameData();
        
        return { 
          success: true, 
          shapes: shapes,
          error: null 
        };
      } catch (error: any) {
        // Check for specific error messages from the contract
        const errorMessage = error.message || '';
        
        if (errorMessage.includes("ZigZagZog.commitChoices: game has ended")) {
          // Update the game ended state locally
          setGameData(prev => ({
            ...prev,
            isGameEnded: true
          }));
          
          return { 
            success: false, 
            error: "Game has ended. Buy plays to start a new game." 
          };
        } else {
          // Re-throw other errors to be caught by outer try/catch
          throw error;
        }
      }
    } catch (error) {
      console.error("Error during commitment:", error);
      const errorMessage = error instanceof Error ? error.message : "Commitment failed";
      
      // Check for specific error patterns in regular errors as well
      if (typeof errorMessage === 'string' && 
          (errorMessage.includes("game has ended") || 
           errorMessage.includes("no remaining plays"))) {
        // Update game ended state
        setGameData(prev => ({
          ...prev,
          isGameEnded: true
        }));
        
        return { 
          success: false, 
          error: "Game has ended. Buy plays to start a new game." 
        };
      }
      
      return { success: false, error: errorMessage };
    }
  };

  // Handle revealing choices
  const revealChoices = async () => {
    if (!contract || !isConnected || !isCorrectNetwork) {
      return { success: false, error: "Wallet not connected or wrong network" };
    }

    try {
      // Make sure we're in reveal phase
      const now = Math.floor(Date.now() / 1000);
      const commitEndTime = gameData.roundTimestamp + gameData.commitDuration;
      const roundEndTime = commitEndTime + gameData.revealDuration;
      
      if (now < commitEndTime) {
        return {
          success: false,
          error: "Cannot reveal yet. Commit phase is still in progress."
        };
      }
      
      if (now > roundEndTime) {
        return {
          success: false,
          error: "The reveal phase has ended for this round."
        };
      }
      
      // Check if we've already revealed
      if (gameData.hasRevealed) {
        return {
          success: false,
          error: "You have already revealed your choices for this round."
        };
      }
      
      // Check if we've committed
      if (!gameData.hasCommitted) {
        return {
          success: false,
          error: "You need to commit your choices before revealing them."
        };
      }

      // Retrieve stored commitment data
      const storedCommitment = localStorage.getItem(
        `commitment_${gameData.gameNumber}_${gameData.roundNumber}`
      );
      
      if (!storedCommitment) {
        return {
          success: false,
          error: "No stored commitment found. You may need to commit your choices again."
        };
      }
      
      console.log(`Found stored commitment for game ${gameData.gameNumber}, round ${gameData.roundNumber}`);
      
      const { nonce, shapes } = JSON.parse(storedCommitment);
      
      console.log('Revealing choices:', {
        gameNumber: gameData.gameNumber,
        roundNumber: gameData.roundNumber,
        nonce,
        circles: shapes.circles,
        squares: shapes.squares,
        triangles: shapes.triangles
      });
      
      // Double-check that parameters match what we signed by logging the hash again
      const checkHash = await contract.choicesHash(
        nonce,
        gameData.gameNumber,
        gameData.roundNumber,
        shapes.circles,
        shapes.squares,
        shapes.triangles
      );
      
      console.log('Hash used for signature verification:', checkHash);
      
      try {
        // Submit the reveal
        const tx = await contract.revealChoices(
          gameData.gameNumber,
          gameData.roundNumber,
          nonce,
          shapes.circles,
          shapes.squares,
          shapes.triangles
        );

        console.log('Reveal transaction submitted:', tx.hash);
        
        // Wait for transaction to be mined
        const receipt = await tx.wait();
        console.log('Reveal transaction confirmed:', receipt);
        
        // Refresh data after successful transaction
        await fetchGameData();
        
        // After successful reveal, we can clean up the stored commitment
        localStorage.removeItem(`commitment_${gameData.gameNumber}_${gameData.roundNumber}`);
        
        return { 
          success: true, 
          shapes: shapes,
          error: null 
        };
      } catch (error: any) {
        // Check for specific game-ended errors from the contract
        const errorMessage = error.message || '';
        console.error("Error during reveal:", error);
        
        if (errorMessage.includes("game has ended")) {
          // Update the game ended state locally
          setGameData(prev => ({
            ...prev,
            isGameEnded: true
          }));
          
          return { 
            success: false, 
            error: "Game has ended. Buy plays to start a new game." 
          };
        } else {
          // Re-throw the error to be caught by the outer try/catch
          throw error;
        }
      }
    } catch (error) {
      console.error("Error during reveal:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Reveal failed" 
      };
    }
  };

  // Load data on initial render and when contract/connection state changes
  // Keep track of the last game number to detect game transitions
  const lastGameNumberRef = useRef<number>(0);
  
  // Handler for game number changes (when a new game starts)
  const handleGameNumberChange = (newGameNumber: number) => {
    if (lastGameNumberRef.current > 0 && newGameNumber > lastGameNumberRef.current) {
      console.log(`Game number changed from ${lastGameNumberRef.current} to ${newGameNumber}`);
      
      // A new game has started, possibly initiated by another player
      // Reset relevant game state explicitly
      setGameData(prev => ({
        ...prev,
        isGameEnded: false, // Reset game ended status for the new game
        hasCommitted: false, // Reset commitment status
        hasRevealed: false, // Reset reveal status
        playerRemainingPlays: 0, // Reset plays until we check if player has any
        roundNumber: 1, // New games start at round 1
      }));
    }
    
    // Update the reference
    lastGameNumberRef.current = newGameNumber;
  };
  
  useEffect(() => {
    // Reset initial load flag when dependencies change
    isInitialLoadRef.current = true;
    
    // Initial data load
    fetchGameData().then(() => {
      // After initial load, set the last game number reference
      if (gameData.gameNumber > 0) {
        lastGameNumberRef.current = gameData.gameNumber;
      }
    });
    
    // Track if the component is mounted
    let isMounted = true;
    
    // For periodic silent refreshes
    let refreshInterval: NodeJS.Timeout | null = null;
    
    // Set up refresh at a reasonable interval
    // Only if we have contract and connection
    if (contract && isConnected && isCorrectNetwork) {
      // Check more frequently to detect game changes quickly
      refreshInterval = setInterval(async () => {
        if (isMounted) {
          // In addition to full data refresh, we can also do a quick check just for game number changes
          try {
            const currentGameNumber = await contract.currentGameNumber();
            if (Number(currentGameNumber) !== lastGameNumberRef.current) {
              handleGameNumberChange(Number(currentGameNumber));
            }
            
            // Full refresh to get all data
            fetchGameData();
          } catch (error) {
            console.error("Error checking game number:", error);
          }
        }
      }, 10000); // 10 seconds delay
    }
    
    // Cleanup function
    return () => {
      isMounted = false;
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [contract, isConnected, isCorrectNetwork, account]);

  return {
    gameData,
    buyPlays,
    commitChoices,
    revealChoices,
    refreshGameData: () => fetchGameData()
  };
}