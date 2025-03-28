/// Produce and verify signatures for ZigZagZog.

// This code was inspired by the waggle source code: https://github.com/moonstream-to/waggle/blob/6004265c99eb7ebd26a92eda3a131d6db924abd3/sign.go

package signatures

import (
	"fmt"
	"math/big"
	"os"

	"github.com/ethereum/go-ethereum/accounts/keystore"
	"github.com/ethereum/go-ethereum/common/math"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/signer/core/apitypes"
	"github.com/google/uuid"
	"golang.org/x/term"
)

func KeyfileFromPrivateKey(outfile string) error {
	fmt.Print("Enter private key (it will not be displayed on screen): ")
	privateKeyRaw, inputErr := term.ReadPassword(int(os.Stdin.Fd()))
	if inputErr != nil {
		return fmt.Errorf("error reading private key: %s", inputErr.Error())
	}
	fmt.Print("\n")
	privateKey := string(privateKeyRaw)

	parsedPrivateKey, parseErr := crypto.HexToECDSA(privateKey)
	if parseErr != nil {
		return fmt.Errorf("error parsing private key: %s", parseErr.Error())
	}

	keyUUID, uuidErr := uuid.NewRandom()
	if uuidErr != nil {
		return fmt.Errorf("error generating UUID for keystore: %s", uuidErr.Error())
	}

	key := &keystore.Key{
		Id:         keyUUID,
		PrivateKey: parsedPrivateKey,
		Address:    crypto.PubkeyToAddress(parsedPrivateKey.PublicKey),
	}
	scryptN := keystore.StandardScryptN
	scryptP := keystore.StandardScryptP

	fmt.Printf("Enter the passphrase you would like to secure the keyfile (%s) with: ", outfile)
	passphraseRaw, passphraseInputErr := term.ReadPassword(int(os.Stdin.Fd()))
	if passphraseInputErr != nil {
		return fmt.Errorf("error reading passphrase: %s", inputErr.Error())
	}
	fmt.Print("\n")
	passphrase := string(passphraseRaw)

	keystoreJSON, encryptErr := keystore.EncryptKey(key, passphrase, scryptN, scryptP)
	if encryptErr != nil {
		return fmt.Errorf("could not generate encrypted keystore: %s", encryptErr.Error())
	}

	err := os.WriteFile(outfile, keystoreJSON, 0600)
	return err
}

func OpenKeystore(keystoreData []byte, password string) (*keystore.Key, error) {
	key, err := keystore.DecryptKey(keystoreData, password)
	return key, err
}

func KeyFromFile(keystoreFile string, password string) (*keystore.Key, error) {
	var emptyKey *keystore.Key
	keystoreContent, readErr := os.ReadFile(keystoreFile)
	if readErr != nil {
		return emptyKey, readErr
	}

	// If password is "", prompt user for password.
	if password == "" {
		fmt.Printf("Please provide a password for keystore (%s): ", keystoreFile)
		passwordRaw, inputErr := term.ReadPassword(int(os.Stdin.Fd()))
		if inputErr != nil {
			return emptyKey, fmt.Errorf("error reading password: %s", inputErr.Error())
		}
		fmt.Print("\n")
		password = string(passwordRaw)
	}

	key, err := OpenKeystore(keystoreContent, password)
	return key, err
}

func SignRawMessage(message []byte, key *keystore.Key, sensible bool) ([]byte, error) {
	signature, err := crypto.Sign(message, key.PrivateKey)
	if !sensible {
		// This refers to a bug in an early Ethereum client implementation where the v parameter byte was
		// shifted by 27: https://github.com/ethereum/go-ethereum/issues/2053
		// Default for callers should be NOT sensible.
		// Defensively, we only shift if the 65th byte is 0 or 1.
		if signature[64] < 2 {
			signature[64] += 27
		}
	}
	return signature, err
}

func ChoicesMessageHash(chainId int64, zzzAddress string, nonce, gameNumber, roundNumber, numCircles, numSquares, numTriangles string) ([]byte, error) {
	// Inspired by: https://medium.com/alpineintel/issuing-and-verifying-eip-712-challenges-with-go-32635ca78aaf
	signerData := apitypes.TypedData{
		Types: apitypes.Types{
			"EIP712Domain": {
				{Name: "name", Type: "string"},
				{Name: "version", Type: "string"},
				{Name: "chainId", Type: "uint256"},
				{Name: "verifyingContract", Type: "address"},
			},
			"ChoicesMessage": {
				{Name: "nonce", Type: "uint256"},
				{Name: "gameNumber", Type: "uint256"},
				{Name: "roundNumber", Type: "uint256"},
				{Name: "numCircles", Type: "uint256"},
				{Name: "numSquares", Type: "uint256"},
				{Name: "numTriangles", Type: "uint256"},
			},
		},
		PrimaryType: "ChoicesMessage",
		Domain: apitypes.TypedDataDomain{
			Name:              "ZigZagZog",
			Version:           "0.1.0",
			ChainId:           (*math.HexOrDecimal256)(big.NewInt(chainId)),
			VerifyingContract: zzzAddress,
		},
		Message: apitypes.TypedDataMessage{
			"nonce":        nonce,
			"gameNumber":   gameNumber,
			"roundNumber":  roundNumber,
			"numCircles":   numCircles,
			"numSquares":   numSquares,
			"numTriangles": numTriangles,
		},
	}

	messageHash, _, err := apitypes.TypedDataAndHash(signerData)
	return messageHash, err
}

type ChoicesMessage struct {
	Nonce        string `json:"nonce"`
	GameNumber   string `json:"gameNumber"`
	RoundNumber  string `json:"roundNumber"`
	NumCircles   string `json:"numCircles"`
	NumSquares   string `json:"numSquares"`
	NumTriangles string `json:"numTriangles"`
	Signature    string `json:"signature,omitempty"`
	Signer       string `json:"signer,omitempty"`
}
