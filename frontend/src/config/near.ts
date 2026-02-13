/**
 * NEAR Contract Configuration
 * 
 * HARDCODED FOR MAINNET RELEASE
 */

// Network configuration
export const NETWORK_ID = "mainnet";

// Contract ID
export const CONTRACT_ID = "keepalive.near";

// RPC URL
export const NODE_URL = "https://rpc.mainnet.near.org";

export const WALLET_URL = "https://wallet.near.org";
export const HELPER_URL = "https://helper.mainnet.near.org";
export const EXPLORER_URL = "https://explorer.near.org";

// Time constants (in milliseconds)
export const TIME_CONSTANTS = {
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
    WEEK: 7 * 24 * 60 * 60 * 1000,
    MONTH: 30 * 24 * 60 * 60 * 1000,
};

// Default heartbeat interval (30 days)
export const DEFAULT_HEARTBEAT_INTERVAL = TIME_CONSTANTS.MONTH;

// NEAR denomination
export const YOCTO_NEAR = "1000000000000000000000000"; // 10^24

// Storage deposit for contracts
export const STORAGE_DEPOSIT = "0.1"; // NEAR

// Gas limits
export const GAS_LIMIT = {
    DEFAULT: "30000000000000", // 30 TGas
    HIGH: "100000000000000", // 100 TGas
};
