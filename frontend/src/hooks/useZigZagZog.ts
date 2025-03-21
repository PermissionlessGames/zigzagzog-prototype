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
  
  // Previous round data
  previousRoundShapes?: {
    circles: number;
    squares: number;
    triangles: number;
    eliminationResult?: string; // Which shape was eliminated
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
    
    // Previous round data
    previousRoundShapes: {
      circles: 0,
      squares: 0,
      triangles: 0,
      eliminationResult: undefined
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
      
      // Then get the rest of the data in parallel - skip hasGameEnded since it's broken
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

      // Fetch previous round data if we're past round 1
      let previousRoundShapes = {
        circles: 0,
        squares: 0,
        triangles: 0,
        eliminationResult: undefined
      };
      
      if (roundNumber > 1) {
        try {
          const previousRoundNumber = roundNumber - 1;
          const [prevCircles, prevSquares, prevTriangles] = await Promise.all([
            contract.circlePlayerCount(currentGameNumber, previousRoundNumber),
            contract.squarePlayerCount(currentGameNumber, previousRoundNumber),
            contract.trianglePlayerCount(currentGameNumber, previousRoundNumber)
          ]);
          
          previousRoundShapes = {
            circles: Number(prevCircles),
            squares: Number(prevSquares),
            triangles: Number(prevTriangles),
            eliminationResult: undefined
          };
          
          // Determine which shape was eliminated
          const circleCount = Number(prevCircles);
          const squareCount = Number(prevSquares);
          const triangleCount = Number(prevTriangles);
          
          if (circleCount > squareCount) {
            if (circleCount >= triangleCount) {
              previousRoundShapes.eliminationResult = "Circle";
            } else {
              previousRoundShapes.eliminationResult = "Triangle";
            }
          } else if (circleCount === squareCount) {
            if (circleCount < triangleCount) {
              previousRoundShapes.eliminationResult = "Triangle";
            } else if (circleCount === triangleCount) {
              previousRoundShapes.eliminationResult = "None";
            } else {
              previousRoundShapes.eliminationResult = "Circle";
            }
          } else {
            if (squareCount >= triangleCount) {
              previousRoundShapes.eliminationResult = "Square";
            } else {
              previousRoundShapes.eliminationResult = "Triangle";
            }
          }
          
        } catch (error) {
          console.error("Error fetching previous round data:", error);
        }
      }

      // Check player status if account is connected
      let hasCommitted = false;
      let hasRevealed = false;
      let playerRemainingPlays = 0;
      
      // Fetch revealed shapes and commit counts
      let commitCount = 0;
      let revealedCircles = 0;
      let revealedSquares = 0;
      let revealedTriangles = 0;
      
      try {
        // Get actual shape counts from the contract
        if (roundNumber > 0) {
          try {
            // Get the revealed shape player counts from the contract
            const [circlePlayerCount, squarePlayerCount, trianglePlayerCount] = await Promise.all([
              contract.circlePlayerCount(currentGameNumber, roundNumber), 
              contract.squarePlayerCount(currentGameNumber, roundNumber),
              contract.trianglePlayerCount(currentGameNumber, roundNumber)
            ]);
            
            // These represent how many players revealed each shape type
            revealedCircles = Number(circlePlayerCount);
            revealedSquares = Number(squarePlayerCount);
            revealedTriangles = Number(trianglePlayerCount);
            
            // Query the PlayerCommitment events for this game/round to accurately count commits
            // This is the proper source of truth for commitments
            const filter = contract.filters.PlayerCommitment(null, currentGameNumber, roundNumber);
            const commitEvents = await contract.queryFilter(filter);
            
            // Each unique address in the events represents a player who committed
            const committedAddresses = new Set();
            commitEvents.forEach(event => {
              if (event.args && event.args.playerAddress) {
                committedAddresses.add(event.args.playerAddress);
              }
            });
            
            // The size of the set is the count of unique players who committed
            commitCount = committedAddresses.size;
            
            // If there are players who have revealed, make sure the commit count is at least that high
            // (since players must commit before they can reveal)
            const distinctRevealedPlayers = new Set([
              ...(revealedCircles > 0 ? [1] : []),
              ...(revealedSquares > 0 ? [1] : []),
              ...(revealedTriangles > 0 ? [1] : [])
            ]).size;
            
            const totalRevealedPlayers = revealedCircles + revealedSquares + revealedTriangles;
            if (totalRevealedPlayers > commitCount) {
              // Contract guarantees more commitments than reveals
              commitCount = totalRevealedPlayers;
            }
            
          } catch (error) {
            console.error("Error fetching game statistics:", error);
            // Fallback to source of truth - query player commits if direct event query failed
            try {
              // As a fallback, we'll try to get the playerHasCommitted mapping for a sample of addresses
              // This is less efficient, but may work if event querying has issues
              const playerCommitsPromises = [];
              // Try to get recent transaction senders as a sample of potential players
              const blockNumber = await contract.provider.getBlockNumber();
              const recentBlock = await contract.provider.getBlock(blockNumber);
              
              if (recentBlock && recentBlock.transactions) {
                // Get unique transaction senders from recent block
                const txSenders = new Set();
                for (let i = 0; i < Math.min(20, recentBlock.transactions.length); i++) {
                  const tx = await contract.provider.getTransaction(recentBlock.transactions[i]);
                  if (tx && tx.from) {
                    txSenders.add(tx.from);
                  }
                }
                
                // Query if these addresses have committed to the current game/round
                for (const addr of txSenders) {
                  playerCommitsPromises.push(
                    contract.playerHasCommitted(currentGameNumber, roundNumber, addr)
                  );
                }
                
                // Count how many have committed
                const commitResults = await Promise.all(playerCommitsPromises);
                const additionalCommitCount = commitResults.filter(Boolean).length;
                
                // Add any additional commits found to our count
                if (additionalCommitCount > 0) {
                  commitCount += additionalCommitCount;
                }
              }
            } catch (innerError) {
              console.error("Error in commit count fallback:", innerError);
              // If all else fails, use a simple fallback based on current player state
              commitCount = hasCommitted ? 1 : 0;
            }
            
            // Fallback for revealed counts if those failed too
            revealedCircles = 0;
            revealedSquares = 0;
            revealedTriangles = 0;
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
          
          // Note: We don't need to increment commit count here since we're already
          // getting the accurate commit count from the contract events
        } catch (error) {
          console.error("Error fetching player data:", error);
        }
      }
      
      // Simple game ended detection - avoid using contract's hasGameEnded which has issues
      // Instead use a simplified approach based on round data
      let isGameEnded = false;
      
      // Determine if the game has ended based on basic game state
      // A game with no rounds is not ended
      if (roundNumber === 0) {
        isGameEnded = false;
      } 
      // Consider a game ended if all three shape counts are 0 but we're past round 1
      else if (roundNumber > 1 && 
          revealedCircles === 0 && 
          revealedSquares === 0 && 
          revealedTriangles === 0) {
        isGameEnded = true;
      }
      // Special case for game 0
      else if (Number(currentGameNumber) === 0) {
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
        isGameEnded,   // Our computed value
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
        
        // Previous round data
        previousRoundShapes,
        
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

  // Check if buying plays will start a new game based on contract logic
  const checkIfBuyingWillStartNewGame = async () => {
    if (!contract || !gameData) {
      return false;
    }
    
    try {
      // Use the contract's actual condition by simulating the check from the buyPlays function:
      // From contract line 87-93:
      //   if (block.timestamp > GameState[currentGameNumber].gameTimestamp + commitDuration || currentGameNumber == 0) {
      //     currentGameNumber++;
      //     ...
      //   }
      const [currentContractGameNumber, gameState, commitDuration] = await Promise.all([
        contract.currentGameNumber(),
        contract.GameState(await contract.currentGameNumber()),
        contract.commitDuration()
      ]);
      
      // Get the current block timestamp from the provider
      const latestBlock = await contract.provider.getBlock('latest');
      const blockTimestamp = latestBlock ? latestBlock.timestamp : Math.floor(Date.now() / 1000);
      
      // Apply the exact contract logic
      const gameTimestamp = Number(gameState.gameTimestamp);
      const willStartNewGame = 
        blockTimestamp > gameTimestamp + Number(commitDuration) || 
        Number(currentContractGameNumber) === 0;
      
      console.log('Will buying start new game (source of truth):', {
        currentGameNumber: Number(currentContractGameNumber),
        blockTimestamp,
        gameTimestamp,
        commitDuration: Number(commitDuration),
        threshold: gameTimestamp + Number(commitDuration),
        isPastThreshold: blockTimestamp > gameTimestamp + Number(commitDuration),
        willStartNewGame
      });
      
      return willStartNewGame;
    } catch (error) {
      console.error("Error checking if buying will start new game:", error);
      
      // Fallback to client-side calculation if contract call fails
      const now = Math.floor(Date.now() / 1000);
      return now > gameData.gameTimestamp + gameData.commitDuration || gameData.gameNumber === 0;
    }
  };

  // Handle buying plays
  const buyPlays = async (quantity = 1) => {
    if (!contract || !isConnected || !isCorrectNetwork) {
      return { success: false, error: "Wallet not connected or wrong network" };
    }

    try {
      // Check if buying plays will start a new game - using contract as source of truth
      const willStartNewGame = await checkIfBuyingWillStartNewGame();
      
      // Update the state with this info from source of truth
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
    
    // Set up refresh at a reasonable interval - much less frequent to prevent flickering
    // Only if we have contract and connection
    if (contract && isConnected && isCorrectNetwork) {
      // Less frequent updates to avoid flicker
      refreshInterval = setInterval(async () => {
        if (isMounted) {
          try {
            // Only check for game number changes, which is a lightweight call
            const currentGameNumber = await contract.currentGameNumber();
            if (Number(currentGameNumber) !== lastGameNumberRef.current) {
              console.log(`Game number changed from ${lastGameNumberRef.current} to ${Number(currentGameNumber)}`);
              handleGameNumberChange(Number(currentGameNumber));
            } else {
              // Silent refresh - only do partial data refresh for critical game state
              const [gameBalance, gameState] = await Promise.all([
                contract.gameBalance(gameData.gameNumber),
                contract.GameState(gameData.gameNumber),
              ]);
              
              // Only update state if there's an actual change to reduce renders
              const roundNumber = Number(gameState.roundNumber);
              const roundTimestamp = Number(gameState.roundTimestamp);
              if (roundNumber !== gameData.roundNumber || 
                  roundTimestamp !== gameData.roundTimestamp ||
                  Number(ethers.formatEther(gameBalance)) !== gameData.potSize) {
                // Important game state changed - do a full refresh
                fetchGameData();
              }
            }
          } catch (error) {
            console.error("Error during background refresh:", error);
          }
        }
      }, 2000); // 2 seconds delay - need more frequent updates for commit/reveal phases
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