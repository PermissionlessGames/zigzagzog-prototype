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
    contractAddress: "0x5297c340941065ab3f4253f92DA21749751813D4",
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