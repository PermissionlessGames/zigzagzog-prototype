# Web3Context

The Web3Context provides wallet connection functionality and network configuration for the ZigZagZog game.

## Features

- MetaMask wallet connection
- Network detection and switching
- Contract instance creation
- Balance tracking
- Backward compatibility with previous ConfigContext

## Usage

### Import and use the context

```tsx
import { useWeb3 } from '@/contexts/Web3Context';

function MyComponent() {
  const { 
    isConnected, 
    account, 
    balance, 
    connect, 
    disconnect,
    contract,
    isCorrectNetwork,
    switchNetwork,
    currencySymbol
  } = useWeb3();

  // Use these values and functions in your component
}
```

### Connect wallet

```tsx
const { connect } = useWeb3();

// Handle connect button click
const handleConnect = async () => {
  await connect();
};
```

### Check network and switch if needed

```tsx
const { isCorrectNetwork, switchNetwork, networkName } = useWeb3();

// UI for wrong network
if (!isCorrectNetwork) {
  return (
    <div>
      <p>Wrong network detected.</p>
      <button onClick={switchNetwork}>
        Switch to {networkName}
      </button>
    </div>
  );
}
```

### Using the contract instance

```tsx
const { contract, isConnected } = useWeb3();

const callContractMethod = async () => {
  if (isConnected && contract) {
    try {
      const result = await contract.someMethod();
      // Handle result
    } catch (error) {
      console.error("Contract call failed", error);
    }
  }
};
```

## Configuration

Network configuration can be set using environment variables:

- `NEXT_PUBLIC_RPC_URL` - RPC URL for the network
- `NEXT_PUBLIC_CONTRACT_ADDRESS` - ZigZagZog contract address
- `NEXT_PUBLIC_CURRENCY_SYMBOL` - Currency symbol (default: TG7T)
- `NEXT_PUBLIC_CURRENCY_DECIMALS` - Currency decimals (default: 18)
- `NEXT_PUBLIC_NETWORK_NAME` - Network name (default: Game7 Testnet)
- `NEXT_PUBLIC_CHAIN_ID` - Chain ID (default: 13746)

If not provided, the context will use default values for Game7 Testnet.