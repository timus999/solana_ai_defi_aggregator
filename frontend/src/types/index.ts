import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

// ============================================
// Vault State
// ============================================

export interface VaultState {
  authority: PublicKey;
  tokenMint: PublicKey;
  shareMint: PublicKey;
  totalAssets: BN;
  totalShares: BN;
  bump: number;
  strategyEnabled: boolean;
  performanceFeeBps: number;
}

// ============================================
// User State
// ============================================

export interface UserState {
  user: PublicKey;
  totalVolume: BN;
  swaps: BN;
  bump: number;
}

// ============================================
// Global State
// ============================================

export interface GlobalState {
  authority: PublicKey;
  feeRate: number;
  bump: number;
}

// ============================================
// Vault Info (formatted for UI)
// ============================================

export interface VaultInfo {
  address: PublicKey;
  tokenMint: PublicKey;
  shareMint: PublicKey;
  totalAssets: number; // Formatted (e.g., 1000.00 USDC)
  totalShares: number; // Formatted
  sharePrice: number; // Price of 1 share
  apy: number; // Annual Percentage Yield (if available)
  tvl: number; // Total Value Locked in USD
  userShares: number; // User's share balance
  userValue: number; // User's position value
  strategyEnabled: boolean;
}

// ============================================
// Transaction Types
// ============================================

export type TransactionType = "deposit" | "withdraw" | "swap" | "strategy";

export interface Transaction {
  signature: string;
  type: TransactionType;
  amount: number;
  timestamp: number;
  status: "success" | "failed" | "pending";
  token?: string;
}

// ============================================
// User Balance
// ============================================

export interface UserBalance {
  usdc: number;
  sol: number;
  shares: number;
}

// ============================================
// Strategy Types
// ============================================

export enum StrategyType {
  JupiterSwap = "jupiterSwap",
  Rebalance = "rebalance",
  Yield = "yield",
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  type: StrategyType;
  performance: StrategyPerformance;
  enabled: boolean;
}

export interface StrategyPerformance {
  totalExecutions: number;
  successRate: number;
  averageReturn: number;
  lastExecution?: number;
}

// ============================================
// Form Data
// ============================================

export interface DepositFormData {
  amount: number;
  token: "USDC" | "SOL";
}

export interface WithdrawFormData {
  shares: number;
  percentage: number; // 0-100
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface TransactionResponse {
  signature: string;
  confirmed: boolean;
}

// ============================================
// UI State
// ============================================

export interface LoadingState {
  deposit: boolean;
  withdraw: boolean;
  vault: boolean;
  balance: boolean;
}

export interface ErrorState {
  message: string | null;
  code?: string;
}

// ============================================
// Notification Types
// ============================================

export type NotificationType = "success" | "error" | "info" | "warning";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
}

// ============================================
// PDA Account Types
// ============================================

export interface PDAAccounts {
  globalState: PublicKey;
  vault: PublicKey;
  vaultTokenAccount: PublicKey;
  shareMint: PublicKey;
  userState: PublicKey;
  feeVault: PublicKey;
}

// ============================================
// Helper Types
// ============================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

// ============================================
// Wallet Context Types
// ============================================

export interface WalletContextState {
  connected: boolean;
  publicKey: PublicKey | null;
  connecting: boolean;
  disconnecting: boolean;
}
