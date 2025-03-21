'use client';

import { BrowserProvider, JsonRpcSigner, ethers, Contract } from "ethers";
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { ZigZagZogAbi__factory } from "@/contracts/types/factories/ZigZagZogAbi__factory";
import { ZigZagZogAbi } from "@/contracts/types/ZigZagZogAbi";

// Network configuration
interface NetworkConfig {
  rpcUrl: string;
  contractAddress: string;
  currencySymbol: string;
  currencyDecimals: number;
  networkName: string;
  chainId: number;
}

// Default configuration for Game7 testnet
const defaultConfig: NetworkConfig = {
  rpcUrl: "https://testnet.game7.io/",
  contractAddress: "0x230a2Bd1f6e1218406A52f38C1De66d816CDCA0A",
  currencySymbol: "TG7T",
  currencyDecimals: 18,
  networkName: "Game7 Testnet",
  chainId: 13746
};

// Environment variables that can override the defaults
const ENV = {
  RPC_URL: process.env.NEXT_PUBLIC_RPC_URL,
  CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
  CURRENCY_SYMBOL: process.env.NEXT_PUBLIC_CURRENCY_SYMBOL,
  CURRENCY_DECIMALS: process.env.NEXT_PUBLIC_CURRENCY_DECIMALS,
  NETWORK_NAME: process.env.NEXT_PUBLIC_NETWORK_NAME,
  CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID
};

// Build the final config using env vars if available, falling back to defaults
export const config: NetworkConfig = {
  rpcUrl: ENV.RPC_URL || defaultConfig.rpcUrl,
  contractAddress: ENV.CONTRACT_ADDRESS || defaultConfig.contractAddress,
  currencySymbol: ENV.CURRENCY_SYMBOL || defaultConfig.currencySymbol,
  currencyDecimals: ENV.CURRENCY_DECIMALS ? parseInt(ENV.CURRENCY_DECIMALS) : defaultConfig.currencyDecimals,
  networkName: ENV.NETWORK_NAME || defaultConfig.networkName,
  chainId: ENV.CHAIN_ID ? parseInt(ENV.CHAIN_ID) : defaultConfig.chainId
};

// Helper functions for currency formatting
export const formatCurrency = (amount: number | string): string => {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `${value} ${config.currencySymbol}`;
};

export const toWei = (amount: number): string => {
  return (amount * Math.pow(10, config.currencyDecimals)).toString();
};

export const fromWei = (amount: string): number => {
  return parseFloat(amount) / Math.pow(10, config.currencyDecimals);
};

// Web3 context interface
interface Web3ContextType extends NetworkConfig {
  isConnected: boolean;
  account: string | null;
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  contract: ZigZagZogAbi | null;
  balance: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  isCorrectNetwork: boolean;
  switchNetwork: () => Promise<void>;
}

// Create context with default values
const defaultWeb3Context: Web3ContextType = {
  ...config,
  isConnected: false,
  account: null,
  provider: null,
  signer: null,
  contract: null,
  balance: "0",
  connect: async () => {},
  disconnect: () => {},
  isCorrectNetwork: false,
  switchNetwork: async () => {}
};

export const Web3Context = createContext<Web3ContextType>(defaultWeb3Context);
export const useWeb3 = () => useContext(Web3Context);

// Provider component
interface Web3ProviderProps {
  children: ReactNode;
}

export const Web3Provider = ({ children }: Web3ProviderProps) => {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [contract, setContract] = useState<ZigZagZogAbi | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [balance, setBalance] = useState("0");
  const [chainId, setChainId] = useState<number | null>(null);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);

  // Check if MetaMask is available
  const isMetaMaskAvailable = () => {
    return typeof window !== "undefined" && window.ethereum !== undefined;
  };

  // Connect wallet
  const connect = useCallback(async () => {
    if (!isMetaMaskAvailable()) {
      alert("Please install MetaMask to use this application");
      return;
    }

    try {
      // Clear disconnected flag when user attempts to connect
      localStorage.removeItem('walletDisconnected');
      
      // Request accounts
      const ethereum = window.ethereum;
      if (!ethereum) {
        throw new Error("No Ethereum provider found. Please install MetaMask or another compatible wallet.");
      }
      
      await ethereum.request({ method: "eth_requestAccounts" });
      
      // Create provider and signer
      const provider = new ethers.BrowserProvider(ethereum);
      setProvider(provider);
      
      // Get signer and account
      const signer = await provider.getSigner();
      setSigner(signer);
      
      const address = await signer.getAddress();
      setAccount(address);
      setIsConnected(true);
      
      // Get contract instance
      const contract = ZigZagZogAbi__factory.connect(config.contractAddress, signer);
      setContract(contract);
      
      // Get account balance
      const balance = await provider.getBalance(address);
      setBalance(ethers.formatEther(balance));
      
      // Check network
      const network = await provider.getNetwork();
      const networkChainId = Number(network.chainId);
      setChainId(networkChainId);
      setIsCorrectNetwork(networkChainId === config.chainId);
    } catch (error) {
      console.error("Failed to connect wallet", error);
    }
  }, []);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    // MetaMask doesn't have a disconnect method in its API
    // The best we can do is clear our local state
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setContract(null);
    setIsConnected(false);
    setBalance("0");
    setChainId(null);
    
    // Store a flag in localStorage to prevent auto-connecting
    localStorage.setItem('walletDisconnected', 'true');
    
    // For better UX, reload the page after disconnect
    // This ensures a clean state
    window.location.reload();
  }, []);

  // Switch network
  const switchNetwork = async () => {
    if (!isMetaMaskAvailable() || !provider) return;
    
    const ethereum = window.ethereum;
    if (!ethereum) {
      throw new Error("No Ethereum provider found. Please install MetaMask or another compatible wallet.");
    }
    
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${config.chainId.toString(16)}` }],
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${config.chainId.toString(16)}`,
                chainName: config.networkName,
                rpcUrls: [config.rpcUrl],
                nativeCurrency: {
                  name: config.currencySymbol,
                  symbol: config.currencySymbol,
                  decimals: config.currencyDecimals,
                },
              },
            ],
          });
        } catch (addError) {
          console.error("Failed to add network", addError);
        }
      }
    }
  };

  // Event listeners for wallet changes
  useEffect(() => {
    if (!isMetaMaskAvailable()) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected their wallet
        disconnect();
      } else if (accounts[0] !== account) {
        // User switched accounts
        setAccount(accounts[0]);
        // Update balance for the new account
        if (provider) {
          provider.getBalance(accounts[0]).then((balance) => {
            setBalance(ethers.formatEther(balance));
          });
        }
      }
    };

    const handleChainChanged = (chainIdHex: string) => {
      // MetaMask requires page refresh on chain change
      window.location.reload();
    };

    const ethereum = window.ethereum;
    if (ethereum) {
      ethereum.on("accountsChanged", handleAccountsChanged);
      ethereum.on("chainChanged", handleChainChanged);
    }

    // Auto-connect if previously connected and not explicitly disconnected
    const checkConnection = async () => {
      const ethereum = window.ethereum;
      if (ethereum) {
        try {
          // Check if user manually disconnected in a previous session
          const wasDisconnected = localStorage.getItem('walletDisconnected') === 'true';
          
          if (!wasDisconnected) {
            const accounts = await ethereum.request({ method: "eth_accounts" });
            if (accounts.length > 0) {
              connect();
            }
          }
        } catch (error) {
          console.error("Failed to check connection", error);
        }
      }
    };
    
    checkConnection();

    // Cleanup
    return () => {
      if (ethereum) {
        ethereum.removeListener("accountsChanged", handleAccountsChanged);
        ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, [account, provider]);

  const contextValue: Web3ContextType = {
    ...config,
    isConnected,
    account,
    provider,
    signer,
    contract,
    balance,
    connect,
    disconnect,
    isCorrectNetwork,
    switchNetwork,
  };

  return (
    <Web3Context.Provider value={contextValue}>
      {children}
    </Web3Context.Provider>
  );
};

// For backward compatibility
export const ConfigContext = Web3Context;
export const useConfig = useWeb3;