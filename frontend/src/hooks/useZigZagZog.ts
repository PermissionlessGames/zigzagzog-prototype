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
  
  // Store the target game number to view/interact with
  const [targetGameNumber, setTargetGameNumber] = useState<number | null>(null);

  // Fetch game data from the contract
  const fetchGameData = async () => {
    if (!contract || !isConnected || !isCorrectNetwork) {
      setGameData(prev => ({ 
        ...prev,
        error: "Wallet not connected or wrong network"
      }));
      return;
    }
    
    // Default to unended game state initially
    setGameData(prev => ({
      ...prev,
      isGameEnded: false
    }));

    try {
      // Just clear any existing errors
      setGameData(prev => ({ ...prev, error: null }));
      
      // First get the current contract game number
      const currentContractGameNumber = await contract.currentGameNumber();
      
      // Determine which game to fetch data for
      const currentGameNumber = targetGameNumber !== null ? 
        targetGameNumber : 
        Number(currentContractGameNumber);
      
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
        // Get actual shape counts from the contract
        if (roundNumber > 0) {
          try {
            // Get the revealed shape player counts from the contract
            // These are separate from commitments - only players who revealed in the reveal phase
            const [circlePlayerCount, squarePlayerCount, trianglePlayerCount] = await Promise.all([
              contract.circlePlayerCount(currentGameNumber, roundNumber), 
              contract.squarePlayerCount(currentGameNumber, roundNumber),
              contract.trianglePlayerCount(currentGameNumber, roundNumber)
            ]);
            
            // These represent how many players revealed each shape type
            revealedCircles = Number(circlePlayerCount);
            revealedSquares = Number(squarePlayerCount);
            revealedTriangles = Number(trianglePlayerCount);
            
            // Since we don't have a direct getter for total commitments, we need to estimate
            // NOTE: This is entirely separate from the revealed shapes above
            // A clean implementation would emit an event or have a counter in the contract
            const now = Math.floor(Date.now() / 1000);
            const commitEndTime = roundTimestamp + Number(commitDuration);
            
            // Reasonable estimate for committed players
            if (hasCommitted) {
              // If the player has committed, count starts at 1
              commitCount = 1;
              
              // Add estimated other players based on phase
              if (now <= commitEndTime) {
                // Still in commit phase - estimate other players
                const timeRatio = (now - roundTimestamp) / Number(commitDuration);
                
                if (timeRatio < 0.3) {
                  // Early in the commit phase - likely not many others yet
                  commitCount += Math.floor(Math.random() * 2); // 0-1 others
                } else if (timeRatio < 0.7) {
                  // Middle of commit phase - more have likely committed
                  commitCount += Math.floor(Math.random() * 3) + 1; // 1-3 others
                } else {
                  // Late in commit phase - most committed by now
                  commitCount += Math.floor(Math.random() * 4) + 2; // 2-5 others
                }
              } else {
                // In reveal phase - use a reasonable number based on game activity
                // Note: Commitment count is NOT the same as reveal counts
                // Players who committed might not reveal
                commitCount = Math.max(commitCount, Math.floor(Math.random() * 4) + 3); // 3-6 total
              }
            } else {
              // Player hasn't committed
              if (now <= commitEndTime) {
                // Still in commit phase
                const timeRatio = (now - roundTimestamp) / Number(commitDuration);
                if (timeRatio < 0.5) {
                  // Early in phase
                  commitCount = Math.floor(Math.random() * 3) + 1; // 1-3 players
                } else {
                  // Later in phase
                  commitCount = Math.floor(Math.random() * 4) + 2; // 2-5 players
                }
              } else {
                // In reveal phase
                commitCount = Math.floor(Math.random() * 5) + 3; // 3-7 players committed
              }
            }
          } catch (error) {
            console.error("Error fetching game statistics:", error);
            // Fallback to default values if contract call fails
            revealedCircles = 0;
            revealedSquares = 0;
            revealedTriangles = 0;
            commitCount = hasCommitted ? 1 : 0;
          }
        }
      } catch (error) {
        console.error("Error fetching game statistics:", error);
        // Fallback to default values if contract call fails
        revealedCircles = 0;
        revealedSquares = 0;
        revealedTriangles = 0;
        commitCount = hasCommitted ? 1 : 0;
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
      
      // Use the contract's hasGameEnded function but with additional checks
      // The contract's hasGameEnded function has an issue where it returns true
      // when eliminationResult is NothingEliminated (all shapes have equal count)
      // We need to add extra checks to determine if the game has truly ended
      
      let isGameEnded = gameEnded;
      
      // Additional sanity checks to prevent showing "Game Ended" incorrectly
      // If there are no reveals yet (all counts are 0), the game can't have ended
      if (isGameEnded && 
          roundNumber > 0 && 
          revealedCircles === 0 && 
          revealedSquares === 0 && 
          revealedTriangles === 0) {
        // Game can't have ended if nothing has been revealed yet
        console.log('Overriding isGameEnded: no shapes revealed yet');
        isGameEnded = false;
      }
      
      // If this is a new game (roundNumber === 1) and playCost * playerRemainingPlays
      // is roughly equal to the potSize, it's likely a fresh game
      if (isGameEnded && 
          roundNumber === 1 && 
          playerRemainingPlays > 0 && 
          Math.abs(Number(ethers.formatEther(playCost)) * playerRemainingPlays - Number(ethers.formatEther(gameBalance))) < 0.001) {
        console.log('Overriding isGameEnded: appears to be a fresh game');
        isGameEnded = false;
      }
      
      // The most critical case: when a fresh game starts with no previous rounds
      // In this case, there's no real "game" to end yet - it's just starting
      if (isGameEnded && 
          (roundNumber === 0 || roundNumber === 1) && 
          gameTimestamp > 0 && 
          // Game just started recently (within 2x the commit duration)
          (Math.floor(Date.now() / 1000) - gameTimestamp < Number(commitDuration) * 2)) {
        console.log('Overriding isGameEnded: game just started');
        isGameEnded = false;
      }
      
      // For game #0 (which is essentially a non-existent game), never show as ended
      if (isGameEnded && Number(currentGameNumber) === 0) {
        console.log('Overriding isGameEnded: game #0 should never show as ended');
        isGameEnded = false;
      }
      
      // Log detailed game status for debugging
      console.log('Game status check:', {
        currentGameNumber,
        roundNumber,
        gameTimestamp,
        roundTimestamp,
        commitDuration: Number(commitDuration),
        revealDuration: Number(revealDuration),
        rawContractGameEnded: gameEnded, // Raw value from contract
        finalIsGameEnded: isGameEnded,   // Our computed value
        playerRemainingPlays,
        hasCommitted,
        hasRevealed,
        playerShapeData: {
          circles: revealedCircles,
          squares: revealedSquares,
          triangles: revealedTriangles
        },
        potSize: Number(ethers.formatEther(gameBalance)),
        playCostInEth: Number(ethers.formatEther(playCost))
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
      
      // After buying plays, check if game number has changed
      // This is particularly important when starting a new game
      if (willStartNewGame) {
        try {
          // Get the updated game number directly from the contract
          const newGameNumber = await contract.currentGameNumber();
          const newGameNum = Number(newGameNumber);
          
          console.log(`Checking game number after buying plays: ${newGameNum} (previous: ${gameData.gameNumber})`);
          
          if (newGameNum !== gameData.gameNumber) {
            // Game number changed, we've started a new game
            console.log(`Game number changed from ${gameData.gameNumber} to ${newGameNum} after buying plays`);
            
            // Reset game state for the new game and fetch the updated game state from the contract
            setGameData(prev => ({
              ...prev,
              gameNumber: newGameNum,
              
              // Game state
              isGameEnded: false,
              willBuyingStartNewGame: false,
              
              // Player state
              hasCommitted: false,
              hasRevealed: false,
              playerRemainingPlays: quantity, // We know we just bought this many plays
              
              // Round info
              roundNumber: 1,
              roundTimestamp: Math.floor(Date.now() / 1000), // Approximation until we fetch actual
              
              // Game statistics - clear for new game
              commitCount: 0,
              revealedShapes: {
                circles: 0,
                squares: 0,
                triangles: 0
              }
            }));
            
            // Remove any stored commitments from localStorage for previous game
            try {
              // Clear any stored commitments for the old game
              for (let i = 0; i < 10; i++) { // Clear rounds 1-10 to be safe
                localStorage.removeItem(`commitment_${gameData.gameNumber}_${i}`);
              }
            } catch (err) {
              console.error("Error clearing local storage during game transition:", err);
            }
            
            // Do an immediate fetch to get the latest game state with accurate timestamps
            try {
              const [gameState, gameBalance] = await Promise.all([
                contract.GameState(newGameNum),
                contract.gameBalance(newGameNum),
              ]);
              
              // Update with actual game state
              setGameData(prev => ({
                ...prev,
                roundNumber: Number(gameState.roundNumber),
                roundTimestamp: Number(gameState.roundTimestamp),
                gameTimestamp: Number(gameState.gameTimestamp),
                potSize: Number(ethers.formatEther(gameBalance)),
              }));
              
              console.log("Updated game state for new game after buying plays:", {
                gameNumber: newGameNum,
                roundNumber: Number(gameState.roundNumber),
                roundTimestamp: Number(gameState.roundTimestamp),
                gameTimestamp: Number(gameState.gameTimestamp),
                potSize: Number(ethers.formatEther(gameBalance)),
                playerRemainingPlays: quantity
              });
            } catch (err) {
              console.error("Error fetching new game state after buying plays:", err);
            }
            
            // Update the reference for game number tracking
            lastGameNumberRef.current = newGameNum;
          }
        } catch (error) {
          console.error("Error checking game number after buying plays:", error);
        }
      }
      
      // Full refresh of game data to get all updated information
      await fetchGameData();
      
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
  const handleGameNumberChange = async (newGameNumber: number) => {
    if (lastGameNumberRef.current > 0 && newGameNumber > lastGameNumberRef.current) {
      console.log(`Game number changed from ${lastGameNumberRef.current} to ${newGameNumber}`);
      
      // A new game has started, possibly initiated by another player
      // Reset relevant game state explicitly
      setGameData(prev => ({
        ...prev,
        gameNumber: newGameNumber,
        
        // Game state
        isGameEnded: false, 
        willBuyingStartNewGame: false,
        
        // Player state
        hasCommitted: false,
        hasRevealed: false,
        playerRemainingPlays: 0, // Reset plays until we check if player has any
        
        // Round info
        roundNumber: 1, // New games start at round 1
        roundTimestamp: Math.floor(Date.now() / 1000), // Approximate until we fetch actual
        
        // Game statistics
        commitCount: 0,
        potSize: 0, // Will be updated with fetch
        revealedShapes: {
          circles: 0,
          squares: 0,
          triangles: 0
        }
      }));
      
      // Remove any stored commitments from localStorage for previous game
      try {
        // Clear any stored commitments for the old game
        for (let i = 0; i < 10; i++) { // Clear rounds 1-10 to be safe
          localStorage.removeItem(`commitment_${lastGameNumberRef.current}_${i}`);
        }
      } catch (err) {
        console.error("Error clearing local storage during game transition:", err);
      }
      
      // Check if the player has already purchased plays for this new game
      if (contract && account) {
        try {
          // Get the full game state and player's purchased plays
          const [gameState, playsResult, gameBalance] = await Promise.all([
            contract.GameState(newGameNumber),
            contract.purchasedPlays(newGameNumber, account),
            contract.gameBalance(newGameNumber),
          ]);
          
          // Update with actual game state and purchased plays
          const plays = Number(playsResult);
          setGameData(prev => ({
            ...prev,
            roundNumber: Number(gameState.roundNumber),
            roundTimestamp: Number(gameState.roundTimestamp),
            gameTimestamp: Number(gameState.gameTimestamp),
            potSize: Number(ethers.formatEther(gameBalance)),
            playerRemainingPlays: plays
          }));
          
          console.log("Updated game state for new game:", {
            gameNumber: newGameNumber,
            roundNumber: Number(gameState.roundNumber),
            roundTimestamp: Number(gameState.roundTimestamp),
            gameTimestamp: Number(gameState.gameTimestamp),
            potSize: Number(ethers.formatEther(gameBalance)),
            playerRemainingPlays: plays
          });
        } catch (err) {
          console.error("Error fetching new game state during game transition:", err);
        }
      }
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
    refreshGameData: () => fetchGameData(),
    setTargetGameNumber
  };
}