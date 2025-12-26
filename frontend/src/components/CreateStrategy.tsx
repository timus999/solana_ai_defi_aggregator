"use client";
import React, { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useProgram } from "@/hooks/useProgram";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { ArrowLeft, Save, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { USDC_MINT } from "@/utils/constants";
import { BN, web3 } from "@coral-xyz/anchor";

type StrategyType = "Arbitrage" | "YieldFarming" | "Rebalancing" | "Custom";
const strategyTypeMapping: Record<StrategyType, string> = {
  Arbitrage: "arbitrage",
  YieldFarming: "yieldFarming",
  Rebalancing: "rebalancing",
  Custom: "custom",
};

export default function CreateStrategy() {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const { program } = useProgram();
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    strategyType: "Arbitrage" as StrategyType,
    inputToken: USDC_MINT.toString(),
    outputToken: "",
    minProfitBps: "50",
    maxSlippageBps: "100",
    executionInterval: "3600",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    if (!publicKey || !program) {
      setError("Please connect your wallet");
      return;
    }

    if (formData.name.length > 50) {
      setError("Name must be 50 characters or less");
      return;
    }

    if (formData.description.length > 200) {
      setError("Description must be 200 characters or less");
      return;
    }

    if (parseFloat(formData.price) <= 0) {
      setError("Price must be greater than 0");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const strategyId = new BN(Date.now());

      const [strategyPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("strategy"),
          publicKey.toBuffer(),
          strategyId.toArrayLike(Buffer, "le", 8),
        ],

        program.programId
      );

      const priceInLamports = parseFloat(formData.price) * 1e6;
      let strategyTypeEnum;
      switch (formData.strategyType) {
        case "Arbitrage":
          strategyTypeEnum = { arbitrage: {} };
          break;
        case "YieldFarming":
          strategyTypeEnum = { yieldFarming: {} };
          break;
        case "Rebalancing":
          strategyTypeEnum = { rebalancing: {} };
          break;
        case "Custom":
          strategyTypeEnum = { custom: {} };
          break;
      }

      const parameters = {
        inputToken: new PublicKey(formData.inputToken),
        outputToken: formData.outputToken
          ? new PublicKey(formData.outputToken)
          : PublicKey.default,
        minProfitBps: parseInt(formData.minProfitBps),
        maxSlippageBps: parseInt(formData.maxSlippageBps),
        executionInterval: new BN(parseInt(formData.executionInterval)),
      };

      const ix = await program.methods
        .createStrategy(
          strategyId,
          formData.name,
          formData.description,
          new BN(priceInLamports),
          strategyTypeEnum,
          parameters
        )
        .accounts({
          strategy: strategyPda,
          creator: publicKey,
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

      console.log("Strategy created:", tx);
      router.push("/strategies");
    } catch (err: any) {
      console.error("Error creating strategy:", err);
      setError(err.message || "Failed to create strategy");
    } finally {
      setLoading(false);
    }
  };

  if (!publicKey) {
    return (
      <div className="glass rounded-xl p-12 border border-gray-800 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Create Strategy</h2>
        <p className="text-gray-400">
          Connect your wallet to create a strategy
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/strategies">
          <button className="glass p-2 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white">Create New Strategy</h1>
          <p className="text-gray-400">
            Design and monetize your trading strategy
          </p>
        </div>
      </div>

      <div className="glass rounded-lg p-4 border border-blue-500/30 bg-blue-500/10">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-300">
            <p className="font-semibold text-white mb-1">How it works:</p>
            <ul className="space-y-1 text-gray-400">
              <li>• Define your strategy parameters and pricing</li>
              <li>• Other users can purchase your strategy</li>
              <li>• You earn USDC each time someone buys it</li>
              <li>
                • Buyers can execute the strategy manually or with AI agents
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="glass rounded-xl p-6 border border-gray-800 space-y-6">
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Basic Information</h2>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Strategy Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              maxLength={50}
              placeholder="e.g., SOL-USDC Arbitrage Pro"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.name.length}/50 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              maxLength={200}
              rows={4}
              placeholder="Describe your strategy, how it works, and expected returns..."
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.description.length}/200 characters
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Strategy Type *
              </label>
              <select
                name="strategyType"
                value={formData.strategyType}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="Arbitrage">⚡ Arbitrage</option>
                <option value="YieldFarming">🌾 Yield Farming</option>
                <option value="Rebalancing">⚖️ Rebalancing</option>
                <option value="Custom">🎯 Custom</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Price (USDC) *
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                min="0.01"
                step="0.01"
                placeholder="10.00"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-6 border-t border-gray-800">
          <h2 className="text-xl font-bold text-white">Strategy Parameters</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Input Token *
              </label>
              <input
                type="text"
                name="inputToken"
                value={formData.inputToken}
                onChange={handleInputChange}
                placeholder="Token mint address"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Default: USDC</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Output Token
              </label>
              <input
                type="text"
                name="outputToken"
                value={formData.outputToken}
                onChange={handleInputChange}
                placeholder="Optional - target token address"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Min Profit (basis points)
              </label>
              <input
                type="number"
                name="minProfitBps"
                value={formData.minProfitBps}
                onChange={handleInputChange}
                min="1"
                placeholder="50"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">50 bps = 0.5%</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Slippage (basis points)
              </label>
              <input
                type="number"
                name="maxSlippageBps"
                value={formData.maxSlippageBps}
                onChange={handleInputChange}
                min="1"
                placeholder="100"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">100 bps = 1%</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Execution Interval (seconds)
            </label>
            <input
              type="number"
              name="executionInterval"
              value={formData.executionInterval}
              onChange={handleInputChange}
              min="60"
              placeholder="3600"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">3600 seconds = 1 hour</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Creating...</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>Create Strategy</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
