"use client";

import { useState, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { BN, web3 } from "@coral-xyz/anchor";
import { useProgram } from "./useProgram";
import {
  USDC_MINT,
  VAULT_SEED,
  SHARE_MINT_SEED,
  VAULT_TOKEN_ACCOUNT_SEED,
  toTokenAmount,
  DECIMALS,
  ERROR_MESSAGES,
} from "@/utils/constants";

export function useWithdraw() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const { program } = useProgram();

  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const withdraw = useCallback(
    async (shares: number) => {
      if (!publicKey || !program || !signTransaction) {
        setError(ERROR_MESSAGES.WALLET_NOT_CONNECTED);
        throw new Error(ERROR_MESSAGES.WALLET_NOT_CONNECTED);
      }

      setWithdrawing(true);
      setError(null);

      try {
        // Derive PDAs
        const [vault] = PublicKey.findProgramAddressSync(
          [Buffer.from(VAULT_SEED), USDC_MINT.toBuffer()],
          program.programId
        );

        const [shareMint] = PublicKey.findProgramAddressSync(
          [Buffer.from(SHARE_MINT_SEED), vault.toBuffer()],
          program.programId
        );

        const [vaultTokenAccount] = PublicKey.findProgramAddressSync(
          [Buffer.from(VAULT_TOKEN_ACCOUNT_SEED), vault.toBuffer()],
          program.programId
        );

        // Get or create user's USDC account
        const userTokenAccount = await getOrCreateAssociatedTokenAccount(
          connection,
          publicKey as any,
          USDC_MINT,
          publicKey
        );

        // Get user's share account
        const userShareAccountAddress = await PublicKey.findProgramAddress(
          [
            publicKey.toBuffer(),
            TOKEN_PROGRAM_ID.toBuffer(),
            shareMint.toBuffer(),
          ],
          ASSOCIATED_TOKEN_PROGRAM_ID
        );

        // Convert shares to token units
        const sharesBN = new BN(toTokenAmount(shares, DECIMALS.SHARES));

        console.log("Withdrawing:", {
          shares,
          sharesBN: sharesBN.toString(),
          vault: vault.toString(),
          userTokenAccount: userTokenAccount.address.toString(),
        });

        // Execute withdrawal
        const ix = await program.methods
          .withdraw(sharesBN)
          .accounts({
            user: publicKey,
            vault: vault,
            userTokenAccount: userTokenAccount.address,
            vaultTokenAccount: vaultTokenAccount,
            userShareAccount: userShareAccountAddress[0],
            shareMint: shareMint,
            tokenProgram: TOKEN_PROGRAM_ID,
          } as any)
          .transaction();
        const tx = new web3.Transaction().add(ix);

        tx.feePayer = publicKey;
        tx.recentBlockhash = (
          await connection.getLatestBlockhash("finalized")
        ).blockhash;

        const signedTx = await signTransaction(tx);
        const sig = await connection.sendRawTransaction(signedTx.serialize());
        await connection.confirmTransaction(sig, "confirmed");

        console.log("Withdrawal successful:", tx);
        return tx;
      } catch (err: any) {
        console.error("Withdrawal error:", err);
        const errorMsg = err.message || ERROR_MESSAGES.TRANSACTION_FAILED;
        setError(errorMsg);
        throw err;
      } finally {
        setWithdrawing(false);
      }
    },
    [publicKey, program, connection, signTransaction]
  );

  return {
    withdraw,
    withdrawing,
    error,
  };
}
