"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { getAccount, getAssociatedTokenAddress } from "@solana/spl-token";
import { useProgram } from "./useProgram";
import {
  USDC_MINT,
  VAULT_SEED,
  SHARE_MINT_SEED,
  VAULT_TOKEN_ACCOUNT_SEED,
  USER_SEED,
  formatTokenAmount,
  DECIMALS,
  REFRESH_RATE,
} from "@/utils/constants";
import type { VaultInfo, VaultState, UserBalance } from "@/types";

export function useVault() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { program } = useProgram();

  const [vaultInfo, setVaultInfo] = useState<VaultInfo | null>(null);
  const [userBalance, setUserBalance] = useState<UserBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Derive PDAs
  const derivePDAs = useCallback(async () => {
    if (!program) return null;

    try {
      const [vaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from(VAULT_SEED), USDC_MINT.toBuffer()],
        program.programId
      );

      const [shareMintPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from(SHARE_MINT_SEED), vaultPDA.toBuffer()],
        program.programId
      );

      const [vaultTokenAccountPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from(VAULT_TOKEN_ACCOUNT_SEED), vaultPDA.toBuffer()],
        program.programId
      );

      return {
        vault: vaultPDA,
        shareMint: shareMintPDA,
        vaultTokenAccount: vaultTokenAccountPDA,
      };
    } catch (err) {
      console.error("Error deriving PDAs:", err);
      return null;
    }
  }, [program]);

  // Fetch vault state
  const fetchVaultState = useCallback(async () => {
    if (!program) {
      setError("Program not initialized");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const pdas = await derivePDAs();
      if (!pdas) {
        throw new Error("Failed to derive PDAs");
      }

      // Fetch vault account
      const vaultAccount = await program.account.vault.fetch(pdas.vault);
      const vaultState = vaultAccount as unknown as VaultState;

      // Fetch vault token account balance
      const vaultTokenAccount = await getAccount(
        connection,
        pdas.vaultTokenAccount
      );

      // Calculate formatted values
      const totalAssets = formatTokenAmount(
        vaultState.totalAssets.toNumber(),
        DECIMALS.USDC
      );
      const totalShares = formatTokenAmount(
        vaultState.totalShares.toNumber(),
        DECIMALS.SHARES
      );

      // Calculate share price
      const sharePrice = totalShares > 0 ? totalAssets / totalShares : 1.0;

      // Get user's share balance if wallet connected
      let userShares = 0;
      let userValue = 0;
      if (publicKey) {
        try {
          const userShareAta = await getAssociatedTokenAddress(
            pdas.shareMint,
            publicKey
          );
          const userShareAccount = await getAccount(connection, userShareAta);
          userShares = formatTokenAmount(
            Number(userShareAccount.amount),
            DECIMALS.SHARES
          );
          userValue = userShares * sharePrice;
        } catch (err) {
          // User doesn't have shares yet
          console.log("User has no shares yet", err);
        }
      }

      const info: VaultInfo = {
        address: pdas.vault,
        tokenMint: vaultState.tokenMint,
        shareMint: vaultState.shareMint,
        totalAssets,
        totalShares,
        sharePrice,
        apy: 0, // TODO: Calculate from historical data
        tvl: totalAssets, // Assuming 1:1 USDC:USD
        userShares,
        userValue,
        strategyEnabled: vaultState.strategyEnabled,
      };

      setVaultInfo(info);
    } catch (err: any) {
      console.error("Error fetching vault state:", err);
      setError(err.message || "Failed to fetch vault data");
    } finally {
      setLoading(false);
    }
  }, [program, connection, publicKey, derivePDAs]);

  // Fetch user balances
  const fetchUserBalance = useCallback(async () => {
    if (!publicKey || !connection || !program) {
      setUserBalance(null);
      return;
    }

    try {
      const pdas = await derivePDAs();
      if (!pdas) {
        throw new Error("Failed to derive PDAs in fetchUserBalance");
      }

      // Get SOL balance
      const solBalance = await connection.getBalance(publicKey);
      const sol = solBalance / 1e9;

      // Get USDC balance
      let usdc = 0;
      try {
        const usdcAta = await getAssociatedTokenAddress(USDC_MINT, publicKey);
        const usdcAccount = await getAccount(connection, usdcAta);
        usdc = formatTokenAmount(Number(usdcAccount.amount), DECIMALS.USDC);
      } catch (err) {
        // User doesn't have USDC account yet
        console.log("User has no USDC account yet: ", err);
      }

      // Get user's share balance
      let userShares = 0;
      try {
        const userShareAta = await getAssociatedTokenAddress(
          pdas.shareMint,
          publicKey
        );
        const userShareAccount = await getAccount(connection, userShareAta);
        userShares = formatTokenAmount(
          Number(userShareAccount.amount),
          DECIMALS.SHARES
        );
      } catch (err) {
        // User doesn't have shares yet
        console.log("User has no shares yet in fetchUserBalance", err);
      }

      setUserBalance({
        usdc,
        sol,
        shares: userShares,
      });
    } catch (err) {
      console.error("Error fetching user balance:", err);
    }
  }, [publicKey, connection, program, derivePDAs]);

  // Fetch data on mount and at intervals
  useEffect(() => {
    fetchVaultState();
    fetchUserBalance();

    const interval = setInterval(() => {
      fetchVaultState();
      fetchUserBalance();
    }, REFRESH_RATE);

    return () => clearInterval(interval);
  }, [fetchVaultState, fetchUserBalance]);

  // Refetch function for manual updates
  const refetch = useCallback(() => {
    fetchVaultState();
    fetchUserBalance();
  }, [fetchVaultState, fetchUserBalance]);

  return {
    vaultInfo,
    userBalance,
    loading,
    error,
    refetch,
  };
}
