package signatures

import (
	"encoding/hex"

	"github.com/ethereum/go-ethereum/crypto"
	"github.com/spf13/cobra"
)

func CreateSigCommand() *cobra.Command {
	sigCmd := &cobra.Command{
		Use:   "sig",
		Short: "Sign and verify ZigZagZog commitments",
		Run: func(cmd *cobra.Command, args []string) {
			cmd.Help()
		},
	}

	hashCmd := CreateSigHashCommand()
	signCmd := CreateSigSignCommand()
	verifyCmd := CreateSigVerifyCommand()

	sigCmd.AddCommand(hashCmd, signCmd, verifyCmd)

	return sigCmd
}

func CreateSigHashCommand() *cobra.Command {
	var chainID int64
	var zzzAddress, nonce, gameNumber, roundNumber, numCircles, numSquares, numTriangles string

	sigHashCmd := &cobra.Command{
		Use:   "hash",
		Short: "Produce a commitment hash",
		RunE: func(cmd *cobra.Command, args []string) error {
			commitmentHash, err := ChoicesMessageHash(chainID, zzzAddress, nonce, gameNumber, roundNumber, numCircles, numSquares, numTriangles)
			if err != nil {
				return err
			}
			cmd.Println(hex.EncodeToString(commitmentHash))
			return nil
		},
	}

	sigHashCmd.Flags().Int64Var(&chainID, "chain-id", 1, "Chain ID of the network you are signing for.")
	sigHashCmd.Flags().StringVar(&zzzAddress, "zzz", "0x0000000000000000000000000000000000000000", "Address of ZigZagZog contract")
	sigHashCmd.Flags().StringVar(&nonce, "nonce", "0", "Commitment nonce")
	sigHashCmd.Flags().StringVar(&gameNumber, "game", "0", "Game number")
	sigHashCmd.Flags().StringVar(&roundNumber, "round", "0", "Round number")
	sigHashCmd.Flags().StringVar(&numCircles, "circles", "0", "Number of circles in commitment")
	sigHashCmd.Flags().StringVar(&numSquares, "squares", "0", "Number of squares in commitment")
	sigHashCmd.Flags().StringVar(&numTriangles, "triangles", "0", "Number of triangles in commitment")

	return sigHashCmd
}

func CreateSigSignCommand() *cobra.Command {
	var chainID int64
	var keyfile, password, zzzAddress, nonce, gameNumber, roundNumber, numCircles, numSquares, numTriangles string
	sigSignCmd := &cobra.Command{
		Use:   "sign",
		Short: "Sign ZigZagZog commitments",
		RunE: func(cmd *cobra.Command, args []string) error {
			commitmentHash, hashErr := ChoicesMessageHash(chainID, zzzAddress, nonce, gameNumber, roundNumber, numCircles, numSquares, numTriangles)
			if hashErr != nil {
				return hashErr
			}

			key, keyErr := KeyFromFile(keyfile, password)
			if keyErr != nil {
				return keyErr
			}

			signedMessage, err := SignRawMessage(commitmentHash, key, false)
			if err != nil {
				return err
			}

			cmd.Println(hex.EncodeToString(signedMessage))

			return nil
		},
	}

	sigSignCmd.Flags().Int64Var(&chainID, "chain-id", 1, "Chain ID of the network you are signing for.")
	sigSignCmd.Flags().StringVar(&zzzAddress, "zzz", "0x0000000000000000000000000000000000000000", "Address of ZigZagZog contract")
	sigSignCmd.Flags().StringVar(&nonce, "nonce", "0", "Commitment nonce")
	sigSignCmd.Flags().StringVar(&gameNumber, "game", "0", "Game number")
	sigSignCmd.Flags().StringVar(&roundNumber, "round", "0", "Round number")
	sigSignCmd.Flags().StringVar(&numCircles, "circles", "0", "Number of circles in commitment")
	sigSignCmd.Flags().StringVar(&numSquares, "squares", "0", "Number of squares in commitment")
	sigSignCmd.Flags().StringVar(&numTriangles, "triangles", "0", "Number of triangles in commitment")
	sigSignCmd.Flags().StringVar(&keyfile, "keyfile", "", "Path to the keystore file to use for the transaction")
	sigSignCmd.Flags().StringVar(&password, "password", "", "Password to use to unlock the keystore (if not specified, you will be prompted for the password when the command executes)")

	return sigSignCmd
}

func CreateSigVerifyCommand() *cobra.Command {
	var chainID int64
	var signedMessage, zzzAddress, nonce, gameNumber, roundNumber, numCircles, numSquares, numTriangles string

	sigVerifyCmd := &cobra.Command{
		Use:   "verify",
		Short: "Verify ZigZagZog commitments",
		RunE: func(cmd *cobra.Command, args []string) error {
			commitmentHash, hashErr := ChoicesMessageHash(chainID, zzzAddress, nonce, gameNumber, roundNumber, numCircles, numSquares, numTriangles)
			if hashErr != nil {
				return hashErr
			}

			signedMessageBytes, decodeErr := hex.DecodeString(signedMessage)
			if decodeErr != nil {
				return decodeErr
			}
			signedMessageBytes[64] -= 27
			pubkeyBytes, recoveryErr := crypto.Ecrecover(commitmentHash, signedMessageBytes)
			if recoveryErr != nil {
				return recoveryErr
			}
			pubkey, unmarshalErr := crypto.UnmarshalPubkey(pubkeyBytes)
			if unmarshalErr != nil {
				return unmarshalErr
			}
			signer := crypto.PubkeyToAddress(*pubkey)

			cmd.Println(signer.Hex())

			return nil
		},
	}

	sigVerifyCmd.Flags().Int64Var(&chainID, "chain-id", 1, "Chain ID of the network you are signing for.")
	sigVerifyCmd.Flags().StringVar(&zzzAddress, "zzz", "0x0000000000000000000000000000000000000000", "Address of ZigZagZog contract")
	sigVerifyCmd.Flags().StringVar(&nonce, "nonce", "0", "Commitment nonce")
	sigVerifyCmd.Flags().StringVar(&gameNumber, "game", "0", "Game number")
	sigVerifyCmd.Flags().StringVar(&roundNumber, "round", "0", "Round number")
	sigVerifyCmd.Flags().StringVar(&numCircles, "circles", "0", "Number of circles in commitment")
	sigVerifyCmd.Flags().StringVar(&numSquares, "squares", "0", "Number of squares in commitment")
	sigVerifyCmd.Flags().StringVar(&numTriangles, "triangles", "0", "Number of triangles in commitment")
	sigVerifyCmd.Flags().StringVar(&signedMessage, "sig", "", "Signed message to verify")

	return sigVerifyCmd
}
