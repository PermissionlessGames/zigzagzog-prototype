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
    currencySymbol,
    networkName
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
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
      >
        Connect Wallet
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {!isCorrectNetwork ? (
        <div className="flex flex-col items-end text-right">
          <div className="text-red-500 mb-2">Wrong network detected</div>
          <button 
            onClick={handleSwitchNetwork}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md"
          >
            Switch to {networkName}
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-end">
          <div className="text-sm font-mono">{formatAddress(account)}</div>
          <div className="text-xs">{balance} {currencySymbol}</div>
          <button 
            onClick={disconnect}
            className="mt-2 px-2 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded-md"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}