import {  wagmiConfig } from "../config";
import { ZIG_ZAG_ZOG_ADDRESS } from "../components/zigZagZog/ZIgZagZog";
import { getPublicClient } from "@wagmi/core";
import { prepareContractCall, sendTransaction, waitForReceipt, ThirdwebClient } from "thirdweb";
import { Account } from 'thirdweb/wallets';
import { getThirdwebContract } from "./zigZagZog";


export interface ShapeSelection {
    circles: bigint;
    squares: bigint;
    triangles: bigint;
  }

export const commitChoices = async (shapes: ShapeSelection, roundNumber: bigint, gameNumber: bigint, thirdWebClient: ThirdwebClient, thirdWebAccount: Account) => {
      const publicClient = getPublicClient(wagmiConfig);

      // Generate a random nonce
      const nonce = Math.floor(Math.random() * 1000000);

      // Get the domain data for EIP-712 typed data
      const {domain} = await publicClient.getEip712Domain({address: ZIG_ZAG_ZOG_ADDRESS});
      
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
          name: domain.name,
          version: domain.version,
          chainId: Number(domain.chainId),
          verifyingContract: domain.verifyingContract
        },
        message: {
          nonce: nonce.toString(),
          gameNumber: gameNumber.toString(),
          roundNumber: roundNumber.toString(),
          numCircles: shapes.circles.toString(),
          numSquares: shapes.squares.toString(),
          numTriangles: shapes.triangles.toString()
        }
      };
      
      
      // Sign using eth_signTypedData_v4 for EIP-712 compatibility
      const ethereum = window.ethereum;
      if (!ethereum) {
        throw new Error("No Ethereum provider found. Please install MetaMask or another compatible wallet.");
      }

      const signedMessage = await ethereum.request({
        method: 'eth_signTypedData_v4',
        params: [thirdWebAccount.address, JSON.stringify(typedData)]
      });
      

        const contract = getThirdwebContract(ZIG_ZAG_ZOG_ADDRESS, thirdWebClient)
        const args: readonly [bigint, bigint, `0x${string}`] = [
          gameNumber,
          roundNumber,
          signedMessage
      ];
      
        const tx = prepareContractCall({
          contract,
          method: "commitChoices",
          params: args,
        });
      
        const transactionResult = await sendTransaction({
          transaction: tx,
          account: thirdWebAccount,
        });
        waitForReceipt(transactionResult);      

        
        return { 
          nonce: nonce,
          shapes: shapes,
          gameNumber: gameNumber,
          roundNumber: roundNumber,
        };
  };