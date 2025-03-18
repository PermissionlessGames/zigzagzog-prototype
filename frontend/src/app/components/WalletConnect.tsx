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
      <button 
        onClick={handleConnect}
        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
      >
        Connect Wallet
      </button>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <button 
        onClick={handleSwitchNetwork}
        className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded-md transition-colors"
      >
        Switch Network
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col items-end text-right">
        <div className="text-sm font-mono">{formatAddress(account)}</div>
        <div className="text-xs text-gray-300">{balance} {currencySymbol}</div>
      </div>
      <button 
        onClick={disconnect}
        className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
      >
        Disconnect
      </button>
    </div>
  );
}