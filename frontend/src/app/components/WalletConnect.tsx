import { useWeb3 } from "@/contexts/Web3Context";
import { useCallback } from "react";

export default function WalletConnect() {
  const { 
    isConnected, 
    account, 
    balance, 
    connect, 
    disconnect, 
    isCorrectNetwork, 
    switchNetwork, 
    currencySymbol
  } = useWeb3();

  const handleConnect = useCallback(async () => {
    await connect();
  }, [connect]);

  const handleSwitchNetwork = useCallback(async () => {
    await switchNetwork();
  }, [switchNetwork]);

  const formatAddress = (address: string | null) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!isConnected) {
    return (
      <button onClick={handleConnect}>
        Connect Wallet
      </button>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <button onClick={handleSwitchNetwork}>
        Switch Network
      </button>
    );
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
      <div className="wallet-info">
        <div>{formatAddress(account)}</div>
        <div style={{ fontSize: '0.8rem' }}>{balance} {currencySymbol}</div>
      </div>
      <button onClick={disconnect}>
        Disconnect
      </button>
    </div>
  );
}