const getCommitmentKey = ({contractAddress, playerAddress, gameNumber, roundNumber}: {contractAddress: string, playerAddress: string, gameNumber: string, roundNumber: string}) => {
    return `commitment_${contractAddress}_${playerAddress}_${gameNumber}_${roundNumber}`
}

export {getCommitmentKey}