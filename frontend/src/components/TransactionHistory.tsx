"use client";
import React, { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, ParsedTransactionWithMeta } from "@solana/web3.js";
import { useProgram } from "@/hooks/useProgram";
import {
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  ExternalLink,
  Repeat,
} from "lucide-react";
import { formatTokenAmount, DECIMALS } from "@/utils/constants";

interface Transaction {
  signature: string;
  type: "deposit" | "withdraw" | "swap" | "strategy" | "initialize";
  amount?: number;
  token: string;
  timestamp: number;
  status: "success" | "failed";
  details?: {
    fromToken?: string;
    toToken?: string;
    amountIn?: number;
    amountOut?: number;
    strategy?: string;
  };
}

export default function TransactionHistory() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { program } = useProgram();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (publicKey && program) {
      fetchTransactions();
    }
  }, [publicKey, program]);

  const fetchTransactions = async () => {
    if (!publicKey) return;

    try {
      setLoading(true);

      // Fetch transaction signatures for the user
      const signatures = await connection.getSignaturesForAddress(publicKey, {
        limit: 20,
      });

      const txs: Transaction[] = [];

      for (const sig of signatures) {
        try {
          const tx = await connection.getParsedTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
            commitment: "confirmed",
          });

          if (!tx || !tx.meta) continue;

          // Parse transaction to determine type
          const txData = parseTransaction(tx, sig.signature, sig.blockTime);
          if (txData) {
            txs.push(txData);
          }
        } catch (error) {
          console.error(`Error parsing transaction ${sig.signature}:`, error);
        }
      }

      setTransactions(txs);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const parseTransaction = (
    tx: ParsedTransactionWithMeta,
    signature: string,
    blockTime: number | null | undefined
  ): Transaction | null => {
    const instructions = tx.transaction.message.instructions;
    const logs = tx.meta?.logMessages || [];

    // Check program interactions
    for (const ix of instructions) {
      const programId = "programId" in ix ? ix.programId.toString() : "";

      // Check if it's your vault program
      if (program && programId === program.programId.toString()) {
        return parseVaultInstruction(
          ix,
          logs,
          signature,
          blockTime,
          tx.meta?.err
        );
      }

      // Check for Jupiter swap
      if (
        programId.includes("JUP") ||
        logs.some((log) => log.includes("Jupiter"))
      ) {
        return parseSwapTransaction(logs, signature, blockTime, tx.meta?.err);
      }
    }

    return null;
  };

  const parseVaultInstruction = (
    instruction: any,
    logs: string[],
    signature: string,
    blockTime: number | null | undefined,
    error: any
  ): Transaction | null => {
    // Parse instruction data to determine type
    const data = instruction.data;

    // Check logs for instruction type
    let type: Transaction["type"] = "deposit";
    let amount = 0;

    if (logs.some((log) => log.toLowerCase().includes("initialize"))) {
      type = "initialize";
    } else if (logs.some((log) => log.toLowerCase().includes("deposit"))) {
      type = "deposit";
      // Try to extract amount from logs
      const amountMatch = logs
        .find((log) => log.includes("amount"))
        ?.match(/(\d+)/);
      if (amountMatch) {
        amount = formatTokenAmount(parseInt(amountMatch[1]), DECIMALS.USDC);
      }
    } else if (logs.some((log) => log.toLowerCase().includes("withdraw"))) {
      type = "withdraw";
      const amountMatch = logs
        .find((log) => log.includes("amount"))
        ?.match(/(\d+)/);
      if (amountMatch) {
        amount = formatTokenAmount(parseInt(amountMatch[1]), DECIMALS.USDC);
      }
    } else if (
      logs.some(
        (log) =>
          log.toLowerCase().includes("strategy") ||
          log.toLowerCase().includes("execute")
      )
    ) {
      type = "strategy";
    }

    return {
      signature,
      type,
      amount,
      token: "USDC",
      timestamp: blockTime ? blockTime * 1000 : Date.now(),
      status: error ? "failed" : "success",
    };
  };

  const parseSwapTransaction = (
    logs: string[],
    signature: string,
    blockTime: number | null | undefined,
    error: any
  ): Transaction | null => {
    // Try to parse Jupiter swap details from logs
    let amountIn = 0;
    let amountOut = 0;
    const fromToken = "USDC";
    const toToken = "Unknown";

    // Look for swap details in logs
    logs.forEach((log) => {
      if (log.includes("Swap")) {
        const inMatch = log.match(/(?:input|in)[:\s]+(\d+)/i);
        const outMatch = log.match(/(?:output|out)[:\s]+(\d+)/i);

        if (inMatch)
          amountIn = formatTokenAmount(parseInt(inMatch[1]), DECIMALS.USDC);
        if (outMatch) amountOut = parseInt(outMatch[1]) / 1e9; // Assuming SOL decimals
      }
    });

    return {
      signature,
      type: "swap",
      token: fromToken,
      timestamp: blockTime ? blockTime * 1000 : Date.now(),
      status: error ? "failed" : "success",
      details: {
        fromToken,
        toToken,
        amountIn,
        amountOut,
      },
    };
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getIcon = (type: Transaction["type"]) => {
    switch (type) {
      case "deposit":
        return <ArrowDownRight className="w-5 h-5 text-green-400" />;
      case "withdraw":
        return <ArrowUpRight className="w-5 h-5 text-red-400" />;
      case "swap":
        return <Repeat className="w-5 h-5 text-blue-400" />;
      case "strategy":
        return <Clock className="w-5 h-5 text-purple-400" />;
      case "initialize":
        return <RefreshCw className="w-5 h-5 text-yellow-400" />;
    }
  };

  const getTypeLabel = (type: Transaction["type"]) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  if (!publicKey) {
    return (
      <div className="glass rounded-xl p-6 border border-gray-800">
        <h2 className="text-xl font-bold text-white mb-4">
          Recent Transactions
        </h2>
        <p className="text-gray-400">
          Connect your wallet to view transaction history
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-6 border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Recent Transactions</h2>
        <button
          onClick={fetchTransactions}
          disabled={loading}
          className="text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse flex items-center space-x-4 p-4 glass rounded-lg border border-gray-800"
            >
              <div className="w-10 h-10 bg-gray-700 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-700 rounded w-1/4" />
                <div className="h-3 bg-gray-700 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No transactions yet</p>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div
              key={tx.signature}
              className="flex items-center justify-between p-4 glass rounded-lg border border-gray-800 hover:border-gray-700 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="p-2 glass rounded-full border border-gray-800">
                  {getIcon(tx.type)}
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-white">
                      {getTypeLabel(tx.type)}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        tx.status === "success"
                          ? "bg-green-500/20 text-green-400 border border-green-500/30"
                          : "bg-red-500/20 text-red-400 border border-red-500/30"
                      }`}
                    >
                      {tx.status}
                    </span>
                  </div>

                  {tx.type === "swap" && tx.details ? (
                    <p className="text-sm text-gray-400">
                      {tx.details.amountIn?.toFixed(2)} {tx.details.fromToken} →{" "}
                      {tx.details.amountOut?.toFixed(4)} {tx.details.toToken}
                    </p>
                  ) : tx.amount && tx.amount > 0 ? (
                    <p className="text-sm text-gray-400">
                      {tx.amount.toFixed(2)} {tx.token}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400">View details</p>
                  )}

                  <p className="text-xs text-gray-500">
                    {formatTime(tx.timestamp)}
                  </p>
                </div>
              </div>

              <a
                href={`https://solscan.io/tx/${tx.signature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
