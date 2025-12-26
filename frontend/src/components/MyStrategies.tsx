"use client";
import React, { useEffect, useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useProgram } from "@/hooks/useProgram";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { BN, web3 } from "@coral-xyz/anchor";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import {
  Play,
  Edit,
  TrendingUp,
  Clock,
  DollarSign,
  BarChart3,
  Settings,
  X,
} from "lucide-react";
import { USDC_MINT } from "@/utils/constants";

interface UserStrategy {
  publicKey: PublicKey;
  strategyPubkey: PublicKey;
  owner: PublicKey;
  purchasedAt: number;
  timesExecuted: number;
  totalProfit: number;
  strategy: {
    name: string;
    description: string;
    strategyType: string;
    successRate: number;
    totalExecutions: number;
    isActive: boolean;
    creator: PublicKey;
    price: number;
  };
}

export default function MyStrategies() {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const { program } = useProgram();

  const [myStrategies, setMyStrategies] = useState<UserStrategy[]>([]);
  const [createdStrategies, setCreatedStrategies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"purchased" | "created">(
    "purchased"
  );

  // Execute modal
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<UserStrategy | null>(
    null
  );
  const [executeAmount, setExecuteAmount] = useState("");
  const [executing, setExecuting] = useState(false);

  // Update modal
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateStrategy, setUpdateStrategy] = useState<any>(null);
  const [updatePrice, setUpdatePrice] = useState("");
  const [updateActive, setUpdateActive] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (publicKey && program) {
      fetchMyStrategies();
      fetchCreatedStrategies();
    }
  }, [publicKey, program]);

  const fetchMyStrategies = async () => {
    if (!publicKey || !program) return;

    try {
      setLoading(true);

      // Fetch all UserStrategy accounts where owner is current user
      const userStrategyAccounts = await program.account.userStrategy.all([
        {
          memcmp: {
            offset: 8, // After discriminator
            bytes: publicKey.toBase58(),
          },
        },
      ]);

      // Fetch full strategy details for each
      const strategiesWithDetails = await Promise.all(
        userStrategyAccounts.map(async (us) => {
          try {
            const strategyAccount = await program.account.strategy.fetch(
              us.account.strategy
            );

            return {
              publicKey: us.publicKey,
              strategyPubkey: us.account.strategy,
              owner: us.account.owner,
              purchasedAt: us.account.purchasedAt.toNumber(),
              timesExecuted: us.account.timesExecuted.toNumber(),
              totalProfit: us.account.totalProfit.toNumber() / 1e6,
              strategy: {
                name: strategyAccount.name,
                description: strategyAccount.description,
                strategyType: Object.keys(strategyAccount.strategyType)[0],
                successRate: strategyAccount.successRate / 100,
                totalExecutions: strategyAccount.totalExecutions.toNumber(),
                isActive: strategyAccount.isActive,
                creator: strategyAccount.creator,
                price: strategyAccount.price.toNumber() / 1e6,
              },
            };
          } catch (error) {
            console.error("Error fetching strategy details:", error);
            return null;
          }
        })
      );

      setMyStrategies(
        strategiesWithDetails.filter((s) => s !== null) as UserStrategy[]
      );
    } catch (error) {
      console.error("Error fetching my strategies:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCreatedStrategies = async () => {
    if (!publicKey || !program) return;

    try {
      // Fetch strategies created by current user
      const strategies = await program.account.strategy.all([
        {
          memcmp: {
            offset: 8, // After discriminator
            bytes: publicKey.toBase58(),
          },
        },
      ]);

      const formatted = strategies.map((s) => ({
        publicKey: s.publicKey,
        creator: s.account.creator,
        name: s.account.name,
        description: s.account.description,
        price: s.account.price.toNumber() / 1e6,
        isActive: s.account.isActive,
        totalPurchases: s.account.totalPurchases.toNumber(),
        totalExecutions: s.account.totalExecutions.toNumber(),
        totalProfit: s.account.totalProfit.toNumber() / 1e6,
        successRate: s.account.successRate / 100,
        strategyType: Object.keys(s.account.strategyType)[0],
      }));

      setCreatedStrategies(formatted);
    } catch (error) {
      console.error("Error fetching created strategies:", error);
    }
  };

  const handleExecute = async () => {
    if (!publicKey || !program || !selectedStrategy || !executeAmount) return;

    try {
      setExecuting(true);

      const amount = new BN(parseFloat(executeAmount) * 1e6);

      // Derive execution PDA
      const [executionPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("execution"),
          selectedStrategy.strategyPubkey.toBuffer(),
          Buffer.from(
            selectedStrategy.strategy.totalExecutions
              .toString()
              .padStart(8, "0")
          ),
        ],
        program.programId
      );

      // For now, simplified - you'd need to add all vault accounts
      const ix = await program.methods
        .executeStrategy(amount)
        .accounts({
          executor: publicKey,
          strategy: selectedStrategy.strategyPubkey,
          userStrategy: selectedStrategy.publicKey,
          execution: executionPda,
          // Add vault accounts here
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

      console.log("Strategy executed:", tx);
      alert("Strategy executed successfully!");

      // Refresh
      await fetchMyStrategies();
      setShowExecuteModal(false);
      setExecuteAmount("");
    } catch (error: any) {
      console.error("Error executing strategy:", error);
      alert(error.message || "Failed to execute strategy");
    } finally {
      setExecuting(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!publicKey || !program || !updateStrategy) return;

    try {
      setUpdating(true);

      const newPrice = updatePrice ? parseFloat(updatePrice) * 1e6 : null;

      const ix = await program.methods
        .updateStrategyStatus(updateActive, newPrice ? new BN(newPrice) : null)
        .accounts({
          strategy: updateStrategy.publicKey,
          creator: publicKey,
        })
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

      console.log("Strategy updated:", tx);
      alert("Strategy updated successfully!");

      // Refresh
      await fetchCreatedStrategies();
      setShowUpdateModal(false);
    } catch (error: any) {
      console.error("Error updating strategy:", error);
      alert(error.message || "Failed to update strategy");
    } finally {
      setUpdating(false);
    }
  };

  if (!publicKey) {
    return (
      <div className="glass rounded-xl p-12 border border-gray-800 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">My Strategies</h2>
        <p className="text-gray-400">
          Connect your wallet to view your strategies
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">My Strategies</h1>
        <p className="text-gray-400">
          Manage your purchased and created strategies
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 glass rounded-lg p-1 border border-gray-800 w-fit">
        <button
          onClick={() => setActiveTab("purchased")}
          className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
            activeTab === "purchased"
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Purchased ({myStrategies.length})
        </button>
        <button
          onClick={() => setActiveTab("created")}
          className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
            activeTab === "created"
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Created ({createdStrategies.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="glass rounded-lg p-6 border border-gray-800 animate-pulse"
            >
              <div className="h-6 bg-gray-700 rounded w-3/4 mb-4" />
              <div className="h-4 bg-gray-700 rounded w-full mb-2" />
              <div className="h-4 bg-gray-700 rounded w-5/6" />
            </div>
          ))}
        </div>
      ) : activeTab === "purchased" ? (
        myStrategies.length === 0 ? (
          <div className="glass rounded-lg p-12 border border-gray-800 text-center">
            <p className="text-gray-400">
              You haven&apos;t purchased any strategies yet
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myStrategies.map((userStrategy) => (
              <div
                key={userStrategy.publicKey.toString()}
                className="glass rounded-lg p-6 border border-gray-800"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">
                      {userStrategy.strategy.name}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {userStrategy.strategy.strategyType}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 mb-1">
                      Success Rate
                    </div>
                    <div className="text-lg font-bold text-green-400">
                      {userStrategy.strategy.successRate.toFixed(0)}%
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-gray-800">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Executions</p>
                    <p className="font-semibold text-white">
                      {userStrategy.timesExecuted}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Your Profit</p>
                    <p
                      className={`font-semibold ${
                        userStrategy.totalProfit >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      ${userStrategy.totalProfit.toFixed(2)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedStrategy(userStrategy);
                    setShowExecuteModal(true);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Execute Strategy</span>
                </button>
              </div>
            ))}
          </div>
        )
      ) : createdStrategies.length === 0 ? (
        <div className="glass rounded-lg p-12 border border-gray-800 text-center">
          <p className="text-gray-400">
            You haven&apos;t created any strategies yet
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {createdStrategies.map((strategy) => (
            <div
              key={strategy.publicKey.toString()}
              className="glass rounded-lg p-6 border border-gray-800"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">
                    {strategy.name}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {strategy.strategyType}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setUpdateStrategy(strategy);
                    setUpdatePrice(strategy.price.toString());
                    setUpdateActive(strategy.isActive);
                    setShowUpdateModal(true);
                  }}
                  className="glass p-2 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors"
                >
                  <Settings className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4 pb-4 border-b border-gray-800">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Sales</p>
                  <p className="font-semibold text-white">
                    {strategy.totalPurchases}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Executions</p>
                  <p className="font-semibold text-white">
                    {strategy.totalExecutions}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Revenue</p>
                  <p className="font-semibold text-green-400">
                    ${(strategy.totalPurchases * strategy.price).toFixed(0)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <p
                    className={`text-sm font-semibold ${
                      strategy.isActive ? "text-green-400" : "text-gray-400"
                    }`}
                  >
                    {strategy.isActive ? "Active" : "Inactive"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Price</p>
                  <p className="text-lg font-bold text-white">
                    {strategy.price} USDC
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Execute Modal */}
      {showExecuteModal && selectedStrategy && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-xl p-6 border border-gray-800 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Execute Strategy</h2>
              <button
                onClick={() => setShowExecuteModal(false)}
                className="glass p-2 rounded-lg border border-gray-800 hover:border-gray-700"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-white mb-2">
                {selectedStrategy.strategy.name}
              </h3>
              <p className="text-sm text-gray-400">
                {selectedStrategy.strategy.description}
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount (USDC)
              </label>
              <input
                type="number"
                value={executeAmount}
                onChange={(e) => setExecuteAmount(e.target.value)}
                placeholder="100"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              onClick={handleExecute}
              disabled={executing || !executeAmount}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-all"
            >
              {executing ? "Executing..." : "Execute Strategy"}
            </button>
          </div>
        </div>
      )}

      {/* Update Modal */}
      {showUpdateModal && updateStrategy && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-xl p-6 border border-gray-800 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Update Strategy</h2>
              <button
                onClick={() => setShowUpdateModal(false)}
                className="glass p-2 rounded-lg border border-gray-800 hover:border-gray-700"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Price (USDC)
                </label>
                <input
                  type="number"
                  value={updatePrice}
                  onChange={(e) => setUpdatePrice(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-between glass rounded-lg p-4 border border-gray-800">
                <span className="text-white font-medium">Active Status</span>
                <button
                  onClick={() => setUpdateActive(!updateActive)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    updateActive ? "bg-blue-600" : "bg-gray-700"
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      updateActive ? "transform translate-x-6" : ""
                    }`}
                  />
                </button>
              </div>
            </div>

            <button
              onClick={handleUpdateStatus}
              disabled={updating}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {updating ? "Updating..." : "Update Strategy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
