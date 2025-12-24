import { PublicKey, clusterApiUrl } from "@solana/web3.js";

// =================================
// Network Configuration
// =================================

export const NETWORK = process.env.NEXT_PUBLIC_NETWORK || "devnet";

export const RPC_ENDPOINT =
  NETWORK === "mainnet-beta"
    ? process.env.NEXT_PUBLIC_RPC_ENDPOINT || clusterApiUrl("mainnet-beta")
    : NETWORK === "testnet"
    ? clusterApiUrl("devnet")
    : clusterApiUrl("testnet");

// =================================
// Programs IDs
// =================================

export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || "11111111111111111111111111111111"
);

// =================================
// Token Mints
// =================================

// USDC Mint (Devnet)
export const USDC_MINT = new PublicKey(
  "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr" // Devnet USDC
);

// SOL Wrapped Mint (if needed)
export const SOL_MINT = new PublicKey(
  "So11111111111111111111111111111111111111112"
);

// =================================
// PDA Seeds
// =================================

export const GLOBAL_STATE_SEED = "global_state";
export const VAULT_SEED = "vault";
export const VAULT_TOKEN_ACCOUNT_SEED = "vault_token_account";
export const SHARE_MINT_SEED = "share_mint";
export const USER_SEED = "user";
export const FEE_VAULT_SEED = "fee_vault";

// =================================
// UI Constants
// =================================

export const DECIMALS = {
  USDC: 6,
  SOL: 9,
  SHARES: 6,
};

export const MIN_DEPOSIT = 0.1; // Minimum 0.1 USDC
export const MAX_SLIPPAGE = 1; // 1% defualt MAX_SLIPPAGE

// =================================
// Transaction Settings
// =================================

export const COMMITMENT = "confirmed";
export const PREFLIGHT_COMMITMENT = "processed";

// =================================
// Display Settings
// =================================
export const THEME = {
  PRIMARY: "#374151", // gray-700
  SECONDARY: "#4b5563", // gray-600
  ACCENT: "#6b7280", // gray-500
  BACKGROUND: "#000000",
  GRADIENT_START: "#000000",
  GRADIENT_END: "#1f2937",
};
export const REFRESH_RATE = 10000000000000; // Refresh every 10 seconds

export const formatNumber = (num: number, decimals: number = 2): string => {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

export const formatCurrency = (num: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
};

export const formatTokenAmount = (amount: number, decimals: number): number => {
  return amount / Math.pow(10, decimals);
};

export const toTokenAmount = (amount: number, decimals: number): number => {
  return Math.floor(amount * Math.pow(10, decimals));
};

// ============================================
// Helper Functions
// ============================================

export const shortenAddress = (address: string, chars = 4): string => {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// ============================================
// Error Messages
// ============================================

export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: "Please connect your wallet",
  INSUFFICIENT_BALANCE: "Insufficient balance",
  TRANSACTION_FAILED: "Transaction failed. Please try again.",
  UNKNOWN_ERROR: "An unknown error occurred",
  PROGRAM_NOT_FOUND: "Program not found. Check your Program ID.",
  NETWORK_ERROR: "Network error. Please check your connection.",
};

// ============================================
// Success Messages
// ============================================

export const SUCCESS_MESSAGES = {
  DEPOSIT_SUCCESS: "Deposit successful!",
  WITHDRAW_SUCCESS: "Withdrawal successful!",
  TRANSACTION_CONFIRMED: "Transaction confirmed",
};
