"use client";

import { useMemo } from "react";
import { AnchorProvider, Program, Idl } from "@coral-xyz/anchor";
import {
  AnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import { PROGRAM_ID } from "@/utils/constants";
import { PublicKey } from "@solana/web3.js";
import idl from "../idl/solana_ai_defi_aggregator.json";
import { SolanaAiDefiAggregator } from "../idl/solana_ai_defi_aggregator";

export function useProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const provider = useMemo(() => {
    if (!wallet.publicKey) {
      // Return a read-only provider when wallet is not connected
      return new AnchorProvider(
        connection,
        {
          publicKey: PublicKey.default,
          signTransaction: async () => {
            throw new Error("Wallet not connected");
          },
          signAllTransactions: async () => {
            throw new Error("Wallet not connected");
          },
        },
        {
          commitment: "confirmed",
        }
      );
    }

    return new AnchorProvider(connection, wallet as AnchorWallet, {
      commitment: "confirmed",
    });
  }, [connection, wallet]);

  const program = useMemo(() => {
    try {
      return new Program<SolanaAiDefiAggregator>(
        idl as SolanaAiDefiAggregator,
        { connection }
      );
    } catch (error) {
      console.error("Error creating program:", error);
    }
  }, [connection]);

  return { program, provider, connection };
}
