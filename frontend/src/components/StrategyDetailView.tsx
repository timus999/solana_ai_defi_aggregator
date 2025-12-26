"use client";
import React, { useEffect, useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useProgram } from "@/hooks/useProgram";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";
import {
  ArrowLeft,
  ShoppingCart,
  TrendingUp,
  Users,
  Clock,
  Star,
  Play,
} from "lucide-react";
import { BN, web3 } from "@coral-xyz/anchor";
import Link from "next/link";
import { USDC_MINT } from "@/utils/constants";

interface StrategyDetail {
  publicKey: PublicKey;
  creator: PublicKey;
  strategyId: number;
  name: string;
  description: string;
  price: number;
  isActive: boolean;
  totalPurchases: number;
  totalExecutions: number;
  totalProfit: number;
  successRate: number;
  createdAt: number;
  strategyType: string;
  parameters: {
    inputToken: PublicKey;
    outputToken: PublicKey;
    minProfitBps: number;
    maxSlippageBps: number;
    executionInterval: BN;
  };
}

export default function StrategyDetailView({
  strategyAddress,
}: {
  strategyAddress: string;
}) {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const { program } = useProgram();
  const [strategy, setStrategy] = useState<StrategyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (program && strategyAddress) {
      fetchStrategy();
      checkPurchase();
    }
  }, [program, strategyAddress, publicKey]);

  const fetchStrategy = async () => {
    if (!program) return;

    try {
      setLoading(true);
      const strategyPubkey = new PublicKey(strategyAddress);
      const strategyAccount = await program.account.strategy.fetch(
        strategyPubkey
      );

      setStrategy({
        publicKey: strategyPubkey,
        creator: strategyAccount.creator,
        strategyId: strategyAccount.strategyId.toNumber(),
        name: strategyAccount.name,
        description: strategyAccount.description,
        price: strategyAccount.price.toNumber() / 1e6,
        isActive: strategyAccount.isActive,
        totalPurchases: strategyAccount.totalPurchases.toNumber(),
        totalExecutions: strategyAccount.totalExecutions.toNumber(),
        totalProfit: strategyAccount.totalProfit.toNumber() / 1e6,
        successRate: strategyAccount.successRate / 100,
        createdAt: strategyAccount.createdAt.toNumber(),
        strategyType: Object.keys(strategyAccount.strategyType)[0],
        parameters: strategyAccount.parameters,
      });
    } catch (error) {
      console.error("Error fetching strategy:", error);
      setError("Strategy not found");
    } finally {
      setLoading(false);
    }
  };

  const checkPurchase = async () => {
    if (!program || !publicKey || !strategyAddress) return;

    try {
      const strategyPubkey = new PublicKey(strategyAddress);
      const [userStrategyPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("user_strategy"),
          publicKey.toBuffer(),
          strategyPubkey.toBuffer(),
        ],
        program.programId
      );

      await program.account.userStrategy.fetch(userStrategyPda);
      setHasPurchased(true);
    } catch (error) {
      setHasPurchased(false);
    }
  };

  const handleBuy = async () => {
    if (!publicKey || !program || !strategy) {
      setError("Please connect your wallet");
      return;
    }

    try {
      setBuying(true);
      setError(null);

      const [userStrategyPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("user_strategy"),
          publicKey.toBuffer(),
          strategy.publicKey.toBuffer(),
        ],
        program.programId
      );

      const buyerTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        publicKey
      );
      const creatorTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        strategy.creator
      );

      const ix = await program.methods
        .buyStrategy()
        .accounts({
          strategy: strategy.publicKey,
          userStrategy: userStrategyPda,
          buyer: publicKey,
          creator: strategy.creator,
          buyerTokenAccount,
          creatorTokenAccount,
          systemProgram: SystemProgram.programId,
        } as any)
        .transaction();

      const tx = new web3.Transaction().add(ix);

      tx.feePayer = publicKey;
      tx.recentBlockhash = (
        await connection.getLatestBlockhash("finalized")
      ).blockhash;

      if (!signTransaction) {
        throw new Error("Wallet not connected");
      }

      const signedTx = await signTransaction(tx);
      const sig = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(sig, "confirmed");

      console.log("Strategy purchased:", tx);
      setHasPurchased(true);
      await fetchStrategy();
    } catch (err: any) {
      console.error("Error buying strategy:", err);
      setError(err.message || "Failed to purchase strategy");
    } finally {
      setBuying(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="glass rounded-xl p-8 border border-gray-800 animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/3 mb-4" />
          <div className="h-4 bg-gray-700 rounded w-2/3 mb-8" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-700 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !strategy) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="glass rounded-xl p-12 border border-gray-800 text-center">
          <p className="text-gray-400">{error || "Strategy not found"}</p>
          <Link href="/strategies">
            <button className="mt-4 text-blue-400 hover:text-blue-300">
              Back to Marketplace
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/strategies">
          <button className="glass p-2 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white">{strategy.name}</h1>
          <p className="text-gray-400">{strategy.strategyType}</p>
        </div>

        <div className="flex items-center space-x-2 text-yellow-400">
          <Star className="w-6 h-6 fill-current" />
          <span className="text-xl font-bold">
            {strategy.successRate.toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="glass rounded-lg p-4 border border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Purchases</span>
            <Users className="w-4 h-4 text-gray-500" />
          </div>
          <p className="text-2xl font-bold text-white">
            {strategy.totalPurchases}
          </p>
        </div>

        <div className="glass rounded-lg p-4 border border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Executions</span>
            <Play className="w-4 h-4 text-gray-500" />
          </div>
          <p className="text-2xl font-bold text-white">
            {strategy.totalExecutions}
          </p>
        </div>

        <div className="glass rounded-lg p-4 border border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total Profit</span>
            <TrendingUp className="w-4 h-4 text-gray-500" />
          </div>
          <p
            className={`text-2xl font-bold ${
              strategy.totalProfit >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            ${Math.abs(strategy.totalProfit).toFixed(0)}
          </p>
        </div>

        <div className="glass rounded-lg p-4 border border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Created</span>
            <Clock className="w-4 h-4 text-gray-500" />
          </div>
          <p className="text-sm font-bold text-white">
            {new Date(strategy.createdAt * 1000).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="glass rounded-xl p-6 border border-gray-800">
        <h2 className="text-xl font-bold text-white mb-4">Description</h2>
        <p className="text-gray-300 leading-relaxed">{strategy.description}</p>
      </div>

      <div className="glass rounded-xl p-6 border border-gray-800">
        <h2 className="text-xl font-bold text-white mb-4">
          Strategy Parameters
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-400 mb-1">Min Profit</p>
            <p className="text-white font-medium">
              {(strategy.parameters.minProfitBps / 100).toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">Max Slippage</p>
            <p className="text-white font-medium">
              {(strategy.parameters.maxSlippageBps / 100).toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">Execution Interval</p>
            <p className="text-white font-medium">
              {Number(strategy.parameters.executionInterval) / 3600}h
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">Input Token</p>
            <p className="text-white font-medium text-xs">
              {strategy.parameters.inputToken.toString().slice(0, 8)}...
            </p>
          </div>
        </div>
      </div>

      <div className="glass rounded-xl p-6 border border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400 mb-1">Price</p>
            <p className="text-3xl font-bold text-white">
              {strategy.price} USDC
            </p>
          </div>

          {hasPurchased ? (
            <div className="text-center">
              <div className="bg-green-500/20 border border-green-500/30 text-green-400 px-6 py-3 rounded-lg font-semibold">
                ✓ Purchased
              </div>
              <Link href="/strategies/my-strategies">
                <button className="mt-2 text-sm text-blue-400 hover:text-blue-300">
                  View in My Strategies
                </button>
              </Link>
            </div>
          ) : (
            <button
              onClick={handleBuy}
              disabled={buying || !publicKey}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-8 py-3 rounded-lg transition-all flex items-center space-x-2"
            >
              {buying ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Buying...</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5" />
                  <span>Buy Strategy</span>
                </>
              )}
            </button>
          )}
        </div>

        {error && (
          <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
