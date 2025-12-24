"use client";
import React, { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { getAccount, getAssociatedTokenAddress } from "@solana/spl-token";
import { useVault } from "@/hooks/useVault";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  PieChart,
  RefreshCw,
} from "lucide-react";
import { USDC_MINT, formatTokenAmount, DECIMALS } from "@/utils/constants";

interface Position {
  token: string;
  mint: PublicKey;
  amount: number;
  value: number;
  percentage: number;
  priceChange24h: number;
}

export default function Portfolio() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { vaultInfo, userBalance, loading: vaultLoading, refetch } = useVault();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalProfit, setTotalProfit] = useState(0);
  const [profitPercentage, setProfitPercentage] = useState(0);

  useEffect(() => {
    if (publicKey && vaultInfo) {
      fetchPositions();
    }
  }, [publicKey, vaultInfo]);

  const fetchPositions = async () => {
    if (!vaultInfo || !publicKey) return;

    try {
      setLoading(true);
      const positionsList: Position[] = [];

      // USDC Position (from user balance)
      if (userBalance?.usdc && userBalance.usdc > 0) {
        positionsList.push({
          token: "USDC",
          mint: USDC_MINT,
          amount: userBalance.usdc,
          value: userBalance.usdc, // 1:1 with USD
          percentage: 0, // Will calculate after
          priceChange24h: 0.01, // Stable
        });
      }

      // Vault Shares Position (converted to USDC value)
      if (vaultInfo.userShares > 0) {
        positionsList.push({
          token: "Vault Shares",
          mint: vaultInfo.shareMint,
          amount: vaultInfo.userShares,
          value: vaultInfo.userValue,
          percentage: 0,
          priceChange24h: calculateVaultAPY(), // Use vault APY
        });
      }

      // SOL Position
      if (userBalance?.sol && userBalance.sol > 0) {
        // Fetch SOL price (mock for now - integrate with Jupiter or Pyth)
        const solPrice = 100; // TODO: Fetch real price
        positionsList.push({
          token: "SOL",
          mint: new PublicKey("So11111111111111111111111111111111111111112"),
          amount: userBalance.sol,
          value: userBalance.sol * solPrice,
          percentage: 0,
          priceChange24h: 5.2, // TODO: Fetch real 24h change
        });
      }

      // Calculate percentages
      const totalValue = positionsList.reduce((sum, p) => sum + p.value, 0);
      positionsList.forEach((p) => {
        p.percentage = totalValue > 0 ? (p.value / totalValue) * 100 : 0;
      });

      setPositions(positionsList);

      // Calculate simple P&L (vault shares value vs initial deposit)
      // This is simplified - you'd want to track actual deposits over time
      const vaultProfit = vaultInfo.userValue - vaultInfo.userShares;
      setTotalProfit(vaultProfit);
      setProfitPercentage(
        vaultInfo.userShares > 0
          ? (vaultProfit / vaultInfo.userShares) * 100
          : 0
      );
    } catch (error) {
      console.error("Error fetching positions:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateVaultAPY = (): number => {
    // Calculate based on share price change
    // If share price > 1.0, there's yield
    if (!vaultInfo) return 0;
    return (vaultInfo.sharePrice - 1.0) * 100;
  };

  const totalValue = positions.reduce((sum, p) => sum + p.value, 0);

  if (!publicKey) {
    return (
      <div className="glass rounded-xl p-6 border border-gray-800">
        <h2 className="text-xl font-bold text-white mb-4">Portfolio</h2>
        <p className="text-gray-400">Connect your wallet to view portfolio</p>
      </div>
    );
  }

  if (vaultLoading || loading) {
    return (
      <div className="glass rounded-xl p-6 border border-gray-800">
        <h2 className="text-xl font-bold text-white mb-4">Portfolio</h2>
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-gray-700/30 rounded" />
          <div className="h-32 bg-gray-700/30 rounded" />
          <div className="h-40 bg-gray-700/30 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Total Value Card */}
      <div className="glass rounded-xl p-6 border border-gray-800 bg-gradient-to-br from-blue-600/20 to-purple-600/20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg text-gray-300">Total Portfolio Value</h2>
          <button
            onClick={() => {
              refetch();
              fetchPositions();
            }}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-4xl font-bold text-white mb-2">
            $
            {totalValue.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>

          {vaultInfo && vaultInfo.userShares > 0 && (
            <div className="flex items-center space-x-2">
              {totalProfit >= 0 ? (
                <>
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  <span className="text-green-400 font-medium">
                    +${totalProfit.toFixed(2)} ({profitPercentage.toFixed(2)}%)
                  </span>
                </>
              ) : (
                <>
                  <TrendingDown className="w-5 h-5 text-red-400" />
                  <span className="text-red-400 font-medium">
                    ${totalProfit.toFixed(2)} ({profitPercentage.toFixed(2)}%)
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {vaultInfo && (
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-700">
            <div>
              <p className="text-sm text-gray-400 mb-1">Vault Shares</p>
              <p className="font-semibold text-white">
                {vaultInfo.userShares.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Share Price</p>
              <p className="font-semibold text-white">
                ${vaultInfo.sharePrice.toFixed(4)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Vault Value</p>
              <p className="font-semibold text-white">
                ${vaultInfo.userValue.toFixed(2)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Positions */}
      <div className="glass rounded-xl p-6 border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Your Positions</h3>
          <PieChart className="w-5 h-5 text-gray-400" />
        </div>

        {positions.length === 0 ? (
          <p className="text-gray-400 text-center py-8">
            No positions yet. Make your first deposit!
          </p>
        ) : (
          <div className="space-y-3">
            {positions.map((position) => (
              <div
                key={position.token}
                className="flex items-center justify-between p-4 glass rounded-lg border border-gray-800 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-200 flex items-center justify-center text-white font-bold">
                    {position.token[0]}
                  </div>

                  <div>
                    <p className="font-medium text-white">{position.token}</p>
                    <p className="text-sm text-gray-400">
                      {position.amount.toFixed(
                        position.token === "USDC" ? 2 : 4
                      )}{" "}
                      {position.token}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-medium text-white">
                    ${position.value.toFixed(2)}
                  </p>
                  <div className="flex items-center justify-end space-x-2 text-sm">
                    {position.priceChange24h >= 0 ? (
                      <>
                        <TrendingUp className="w-4 h-4 text-green-400" />
                        <span className="text-green-400">
                          +{position.priceChange24h.toFixed(2)}%
                        </span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-4 h-4 text-red-400" />
                        <span className="text-red-400">
                          {position.priceChange24h.toFixed(2)}%
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-right ml-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-200 h-2 rounded-full"
                        style={{ width: `${position.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-400 w-12">
                      {position.percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass rounded-lg p-4 border border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-400">APY</p>
            <Percent className="w-4 h-4 text-gray-500" />
          </div>
          <p className="text-2xl font-bold text-white">
            {vaultInfo?.apy.toFixed(2) || "0.00"}%
          </p>
        </div>

        <div className="glass rounded-lg p-4 border border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-400">Total P&L</p>
            <DollarSign className="w-4 h-4 text-gray-500" />
          </div>
          <p
            className={`text-2xl font-bold ${
              totalProfit >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {totalProfit >= 0 ? "+" : ""}${Math.abs(totalProfit).toFixed(2)}
          </p>
        </div>

        <div className="glass rounded-lg p-4 border border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-400">Positions</p>
            <PieChart className="w-4 h-4 text-gray-500" />
          </div>
          <p className="text-2xl font-bold text-white">{positions.length}</p>
        </div>
      </div>
    </div>
  );
}
