import styles from "./ZigZagZog.module.css";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createWalletClient, custom, WalletClient } from "viem";
import { thirdwebClientId, thirdWebG7Testnet, viemG7Testnet, wagmiConfig } from "../../config";
import { useActiveAccount, useActiveWalletChain, useConnectModal, useSwitchActiveWalletChain } from 'thirdweb/react';
import { useEffect, useState } from "react";
import { Chain, createThirdwebClient } from "thirdweb";
import { getZigZagZogConstants } from "../../utils/contractInfo";
import { getGameAndRoundState } from "../../utils/gameAndRoundState";
import { getCurrentGameNumber, getGameState } from "../../utils/gameState";
import { buyPlays, buyPlaysTW, claimWinning, Commitment, revealChoicesTW } from "../../utils/zigZagZog";
import { commitChoices } from "../../utils/signing";
import { ShapeSelection } from "../../utils/signing";
import ShapeSelector from "./ShapeSelector";
import { canClaim, getRounds, getShareInfo } from "../../utils/playerState";
import Navbar from "./Navbar";
import Rounds from "./Rounds";
import RulesModal from "./RulesModal";
import { getBalance } from '@wagmi/core';
import { getCommitmentKey } from "../../utils/localStorage";

// export const ZIG_ZAG_ZOG_ADDRESS = '0xc193Dc413358067B4D15fF20b50b59A9421eD1CD'
// export const ZIG_ZAG_ZOG_ADDRESS = '0xA05C355eD4EbA9f20E43CCc018AD041E5E3BEa13'
// export const ZIG_ZAG_ZOG_ADDRESS = '0xc2dc3596f6194dBBc3f9c2fB9Cc1547F4A92aa76' stuck because one player plays one shape
// export const ZIG_ZAG_ZOG_ADDRESS = '0xD0DD649939D4d6C5D0B4b15eDdF9dF4EE48eEC2F' 1 1 0 vs 0 1 1 stuck because commit and buyPlays define differently what ended game is
// export const ZIG_ZAG_ZOG_ADDRESS = '0x487a366Ed27F5F7D6ed1756B8972B23793Ce6B1d' 0 0 10 vs 0 0 10
//export const ZIG_ZAG_ZOG_ADDRESS = '0x8EC5D6c9E1E1a4172BAe81660Da4ae2Ae8DE42bc'
// export const ZIG_ZAG_ZOG_ADDRESS = '0xD1593986bAf847B01E1B29d7F9eF45283438Ca01' //NEW
// export const ZIG_ZAG_ZOG_ADDRESS = '0x389A72713301833517b99c64C7E7e37442b47067'

// export const ZIG_ZAG_ZOG_ADDRESS = '0x781B0309c24e6D3352952337D09114a327253750'
// export const ZIG_ZAG_ZOG_ADDRESS = '0x4135bB78BC18b13FA39d0a156ca3524Ee3881665'
// export const ZIG_ZAG_ZOG_ADDRESS = '0x4A4a9854984894c986e14B124d030636A8304c8A' //Stuck?
export const ZIG_ZAG_ZOG_ADDRESS = '0x91E5597cac8C69Ff54EF9BB22D7d65c06e36ABeb'

// export const ZIG_ZAG_ZOG_ADDRESS = '0x720550037b1A0c613b997C53cd4B812Ed2E1aC82'

const ZigZagZog = () => {
    const activeAccount = useActiveAccount();
    const { connect } = useConnectModal();
    const switchChain = useSwitchActiveWalletChain();

    const client = createThirdwebClient({ clientId: thirdwebClientId });
    const [commitment, setCommitment] = useState<Commitment | undefined>(undefined)
    const [selected, setSelected] = useState<ShapeSelection>({circles: BigInt(0), squares: BigInt(0), triangles: BigInt(0)})
    const [showRules, setShowRules] = useState(false);
    const activeChain = useActiveWalletChain();


    useEffect(() => {
        const userGotRules = localStorage.getItem('userGotRules')
        if (!userGotRules) {
            setShowRules(true)
        }
    }, [])



    const balance = useQuery({
        queryKey: ['balance', activeAccount?.address],
        queryFn: () => getBalance(wagmiConfig, {address: activeAccount?.address ?? ''}),
        refetchOnWindowFocus: 'always',
        refetchInterval: 3000,
    })

    useEffect(() => {
        if (!activeAccount) {
            connect({client});
        }
      }, [activeAccount, connect, client]);

    useEffect(() => {
        if (activeAccount && activeChain?.id !== thirdWebG7Testnet.id) {
            switchChain({...thirdWebG7Testnet, testnet: true})
        }
    }, [activeAccount, activeChain])

    const buyPlaysMutation = useMutation({
        mutationFn: async ({version, activeChain}: {version: number, activeChain: Chain | undefined}) => {
            if (!currentGameState.data || !activeAccount?.address || !currentGameNumber.data || !currentGameAndRoundState.data || !activeChain) {
                return
            }
            
            if (activeChain?.id !== thirdWebG7Testnet.id) {
                await switchChain({...thirdWebG7Testnet, testnet: true})
            }

            let _client: WalletClient | undefined;
            if (window.ethereum && activeAccount?.address) {
                _client = createWalletClient({
                    account: activeAccount.address,
                    chain: viemG7Testnet,
                    transport: custom(window.ethereum)
                });
            }
            if (!_client) {
                throw new Error("No client found");
            }
            const gameToBuyIn = currentGameAndRoundState.data.hasGameEnded ? Number(currentGameNumber.data) + 1 : Number(currentGameNumber.data)
            let hash;

            
            if (version === 1) {
                hash = await buyPlays(ZIG_ZAG_ZOG_ADDRESS, BigInt(4000), _client, BigInt(gameToBuyIn))
            } else {
                hash = await buyPlaysTW(ZIG_ZAG_ZOG_ADDRESS, BigInt(4000), BigInt(gameToBuyIn), client, activeAccount)
            }
            return hash
        },
        onSuccess: async () => {
            await currentGameNumber.refetch()
            await currentGameState.refetch()
            await currentGameAndRoundState.refetch()
        },
        onError: (error) => {
            console.error('buyPlaysMutation error', error)
        }
    })





    

    const gameConstants = useQuery({
        queryKey: ["gameConstants"],
        queryFn: async () => {
            const constants = await getZigZagZogConstants(ZIG_ZAG_ZOG_ADDRESS)
            return constants
        },
        refetchInterval: false,
    })

    const currentGameNumber = useQuery({
        queryKey: ["currentGameNumber"],
        queryFn: async () => {
            const currentGameNumber = await getCurrentGameNumber(ZIG_ZAG_ZOG_ADDRESS)
            return currentGameNumber
        }
    })
    

    const currentGameState = useQuery({
        queryKey: ["gameState", currentGameNumber.data],
        queryFn: async () => {
            if (!currentGameNumber.data || !activeAccount?.address) {
                return
            }
            const state = await getGameState(ZIG_ZAG_ZOG_ADDRESS, BigInt(currentGameNumber.data), activeAccount?.address)
            return state
        },
        enabled: currentGameNumber.data !== undefined && activeAccount?.address !== undefined
    });

    const queryClient = useQueryClient()

    const currentGameAndRoundState = useQuery({
        queryKey: ["gameAndRoundState", currentGameState.data, activeAccount?.address],
        queryFn: async () => {
            if (!gameConstants.data || !activeAccount?.address || !currentGameNumber.data) {
                return
            }
            const gameState = await getGameState(ZIG_ZAG_ZOG_ADDRESS, BigInt(currentGameNumber.data), activeAccount.address)
            const state = await getGameAndRoundState(ZIG_ZAG_ZOG_ADDRESS, gameState, gameConstants.data, activeAccount?.address)

            queryClient.invalidateQueries({queryKey: ["playerState"]})
            if (state.isRevealPhase && !commitment && currentGameAndRoundState.data?.activeRound) {
                const commitmentKey = getCommitmentKey({contractAddress: ZIG_ZAG_ZOG_ADDRESS, playerAddress: activeAccount?.address, gameNumber: currentGameNumber.data.toString(), roundNumber: currentGameAndRoundState.data?.activeRound.toString()})
                const commitmentString = localStorage.getItem(commitmentKey) ?? undefined
                if (!commitmentString) {
                    return
                }
                try {
                    const _commitment = JSON.parse(commitmentString) as Commitment
                    setCommitment(_commitment)
                    setSelected({
                        circles: BigInt(_commitment.shapes.circles),
                        squares: BigInt(_commitment.shapes.squares),
                        triangles: BigInt(_commitment.shapes.triangles)
                    })
                } catch (e) {
                    console.error('commitmentString error', e)
                }
            }
            return state
        },
        enabled: gameConstants.data !== undefined && activeAccount?.address !== undefined && currentGameNumber.data !== undefined,
        refetchInterval: 3000,
    })
    

    const playerState = useQuery({
        queryKey: ["playerState", currentGameNumber.data, activeAccount?.address],
        queryFn: async () => {
            if (!currentGameNumber.data || !activeAccount?.address || !currentGameAndRoundState.data) {
                return
            }

            const activeRound = currentGameAndRoundState.data?.activeRound
            const shareInfo = await getShareInfo(ZIG_ZAG_ZOG_ADDRESS, currentGameNumber.data, activeAccount?.address)

            const rounds = await getRounds(ZIG_ZAG_ZOG_ADDRESS, 
                                            currentGameNumber.data, 
                                            BigInt(activeRound), 
                                            activeAccount?.address)
            const survivingPlays = activeRound > 1 ? rounds[activeRound - 1 - 1].survivingPlays : shareInfo.purchasedPlays //1-based index
            const hasCommitted = rounds[activeRound - 1].playerCommitted
            const hasRevealed = rounds[activeRound - 1].playerRevealed
            let playerCanClaim = false
            try {
                playerCanClaim = (currentGameState.data && currentGameAndRoundState.data && !currentGameState.data.hasPlayerCashedOut) ? canClaim(rounds, currentGameState.data, currentGameAndRoundState.data) : false
            } catch (e) {
                console.log('playerCanClaimError', e)
            }
            return {rounds, survivingPlays, hasCommitted, hasRevealed, playerCanClaim, shareInfo}
        },
        enabled: currentGameNumber.data !== undefined && activeAccount?.address !== undefined && currentGameAndRoundState.data !== undefined,
    })

    
    const commitChoicesMutation = useMutation({
        mutationFn: async () => {
            if (!currentGameAndRoundState.data || !activeAccount?.address || !currentGameNumber.data) {
                return
            }
            if (totalShapes(selected) !== playerState.data?.survivingPlays) {
                return
            }
            const result = await commitChoices(selected, BigInt(currentGameAndRoundState.data?.activeRound), BigInt(currentGameNumber.data), client, activeAccount)
            return result
        },
        onSuccess: async (result: any) => {
            setCommitment(result)
            try {
                if (currentGameNumber.data && currentGameAndRoundState.data?.activeRound && activeAccount?.address) {
                    const commitmentKey = getCommitmentKey({contractAddress: ZIG_ZAG_ZOG_ADDRESS, playerAddress: activeAccount?.address, gameNumber: currentGameNumber.data.toString(), roundNumber: currentGameAndRoundState.data?.activeRound.toString()})
                    localStorage.setItem(commitmentKey, JSON.stringify({
                        nonce: result.nonce.toString(),
                        shapes: {
                            circles: result.shapes.circles.toString(),
                            squares: result.shapes.squares.toString(),
                            triangles: result.shapes.triangles.toString()
                        },
                        gameNumber: result.gameNumber.toString(),
                        roundNumber: result.roundNumber.toString()
                    }));
                }
            } catch (e) {
                console.error('commitChoicesMutation onSuccess error', e)
            }
            await currentGameState.refetch()
            await currentGameAndRoundState.refetch()
        },
        onError: (error) => {
            console.error('commitChoicesMutation error', error)
        }
    })

    const revealChoicesMutation = useMutation({
        mutationFn: async () => {
            if (!activeAccount) {
                throw new Error("No active account")
            }
            
            let _commitment: Commitment | undefined;
            if (!currentGameNumber.data || !currentGameAndRoundState.data?.activeRound || !activeAccount?.address) {
                return
            }
            const commitmentKey = getCommitmentKey({contractAddress: ZIG_ZAG_ZOG_ADDRESS, playerAddress: activeAccount?.address, gameNumber: currentGameNumber.data.toString(), roundNumber: currentGameAndRoundState.data?.activeRound.toString()})
            const commitmentString = localStorage.getItem(commitmentKey) ?? undefined
            if (!commitmentString) {
                return
            }
            try {
                _commitment = JSON.parse(commitmentString) as Commitment
            } catch (e) {
                console.error('revealChoicesMutation commitmentString error', e)
                return
            }
            const result = await revealChoicesTW(ZIG_ZAG_ZOG_ADDRESS, _commitment, client, activeAccount)
            return result
        },
        onSuccess: async () => {
            await currentGameState.refetch()
            await currentGameAndRoundState.refetch()
        },
        onError: (error) => {
            console.error('revealChoicesMutation error', error)
        }
    })



    const claimWinningMutation = useMutation({
        mutationFn: async () => {
            if (!currentGameNumber.data || !activeAccount?.address) {
                return
            }
            let _client: WalletClient | undefined;
            if (window.ethereum && activeAccount?.address) {
                _client = createWalletClient({
                    account: activeAccount.address,
                    chain: viemG7Testnet,
                    transport: custom(window.ethereum)
                });
            }
            if (!_client) {
                throw new Error("No client found");
            }
            const tx = await claimWinning(ZIG_ZAG_ZOG_ADDRESS, BigInt(currentGameNumber.data), _client)
            return tx
        },
        onSuccess: async () => {
            await currentGameState.refetch()
            await currentGameAndRoundState.refetch()
        },
        onError: (error) => {
            console.error('claimWinningMutation error', error)
        }
    })

    const totalShapes = (selected: ShapeSelection) => {
        return Number(selected.circles) + Number(selected.triangles) + Number(selected.squares)
    }



    return (
        <div className={styles.container}>
            <Navbar 
                gameNumber={Number(currentGameNumber.data ?? 0)} 
                phase={currentGameAndRoundState.data?.isCommitPhase ? 'Commit' : currentGameAndRoundState.data?.isRevealPhase ? 'Reveal' : 'Idle'} 
                timeLeft={currentGameAndRoundState.data?.timeLeft ?? 0} 
                potSize={playerState.data?.shareInfo.gameBalance ?? 0}
                onRulesClick={() => setShowRules(true)}
                balance={balance.data?.formatted}
            />
            <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
            <div className={styles.hStack}>
                <div className={styles.vStack}>

                    {balance.data?.value && balance.data.value > BigInt(0) ? (<>
                    {currentGameAndRoundState.data?.canBuyPlays && playerState.data?.survivingPlays !== undefined && (playerState.data.survivingPlays < 1 || currentGameAndRoundState.data?.hasGameEnded) && (
                        <div className={styles.buyButton} onClick={() => buyPlaysMutation.mutate({version: 1, activeChain})}>{buyPlaysMutation.isPending && buyPlaysMutation.variables?.version === 1 ? 'Buying...' : 'Buy Plays v1'}</div>
                    )}
                    {currentGameAndRoundState.data?.canBuyPlays && playerState.data?.survivingPlays !== undefined && (playerState.data.survivingPlays < 1 || currentGameAndRoundState.data?.hasGameEnded) && (
                            <div className={styles.buyButton} onClick={() => buyPlaysMutation.mutate({version: 2, activeChain})}>{buyPlaysMutation.isPending && buyPlaysMutation.variables?.version === 2 ? 'Buying...' : 'Buy Plays v2'}</div>
                        )}
                    </>): (
                        <>
                            {!balance.isLoading && (
                                <div className={styles.buyButton} onClick={() => window.open(`https://getsome.game7.io?network=testnet&address=${activeAccount?.address}`, "_blank")}>getsome tokens</div>
                            )}
                        </>
                    )}


                    {playerState.data?.survivingPlays !== undefined && playerState.data.survivingPlays > 0 && !currentGameAndRoundState.data?.hasGameEnded && (
                        <ShapeSelector selected={selected} 
                            onSelect={setSelected} 
                            playsCount={playerState.data.survivingPlays} 
                            isCommitPhase={(currentGameAndRoundState.data?.isCommitPhase && !playerState.data?.hasCommitted) ?? false} 
                        />)}
                    {currentGameAndRoundState.data?.isCommitPhase && !playerState.data?.hasCommitted && playerState.data?.survivingPlays !== undefined && playerState.data.survivingPlays > 0 && (
                        <div className={styles.commitButton} onClick={() => commitChoicesMutation.mutate()} style={{cursor: totalShapes(selected) === playerState.data?.survivingPlays ? 'pointer' : 'not-allowed'}}>
                            {commitChoicesMutation.isPending ? 'Committing...' : `${totalShapes(selected) === playerState.data?.survivingPlays ? 'Commit Choices' : `${-totalShapes(selected) + playerState.data?.survivingPlays} plays left`}`}
                        </div>
                        )}
                    {currentGameAndRoundState.data?.isRevealPhase && commitment && !playerState.data?.hasRevealed && (
                        <div className={styles.commitButton} onClick={() => revealChoicesMutation.mutate()}>{revealChoicesMutation.isPending ? 'Revealing...' : 'Reveal Choices'}</div>
                    )}
                    {playerState.data?.playerCanClaim && (
                        <div className={styles.buyButton} onClick={() => claimWinningMutation.mutate()}>{claimWinningMutation.isPending ? 'Claiming...' : 'Claim Winning'}</div>
                    )}
                    <div className={styles.debugInfo}>
                        {currentGameAndRoundState.data?.isRevealPhase && 'Reveal Phase'}
                    </div>
                    <div className={styles.debugInfo}>
                        {currentGameAndRoundState.data?.isCommitPhase && 'Commit Phase'}
                    </div>
                    <div className={styles.debugInfo}>
                        {!!currentGameAndRoundState.data?.timeLeft && `Time left: ${currentGameAndRoundState.data.timeLeft}ms`}
                    </div>

                </div>
            </div>
            <Rounds 
                rounds={playerState.data?.rounds && currentGameAndRoundState.data?.activeRound ? playerState.data?.rounds.slice(0, currentGameAndRoundState.data?.activeRound - (currentGameAndRoundState.data?.hasGameEnded ? 0 : 1)) : []} 
                shareInfo={playerState.data?.shareInfo} 
                hasGameEnded={currentGameAndRoundState.data?.hasGameEnded ?? false}
            />
                    {/* {playerState.data && playerState.data.survivingPlays !== undefined && (
                        <>
                            <ShapeSelector selected={selected} 
                                onSelect={setSelected} 
                                playsCount={1} //playerState.data.survivingPlays} 
                                isCommitPhase={false} 
                        />
                    
                        <div className={styles.commitButton} onClick={() => commitChoicesMutation.mutate()} style={{cursor: totalShapes(selected) === playerState.data?.survivingPlays ? 'pointer' : 'not-allowed'}}>
                            {commitChoicesMutation.isPending ? 'Committing...' : `${totalShapes(selected) === playerState.data?.survivingPlays ? 'Commit Choices' : `${-totalShapes(selected) + playerState.data?.survivingPlays} plays left`}`}
                        </div>
                        </>
                    )} */}

                        


        </div>
    )
}

export default ZigZagZog;