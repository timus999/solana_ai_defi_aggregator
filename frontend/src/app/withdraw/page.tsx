"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useVault } from "@/hooks/useVault";
import { useWithdraw } from "@/hooks/useWithdraw";
import { formatNumber, formatCurrency } from "@/utils/constants";
import Link from "next/link";

export default function WithdrawPage() {
  const { connected } = useWallet();
  const { vaultInfo, loading } = useVault();
  const { withdraw, withdrawing, error: withdrawError } = useWithdraw();

  const [percentage, setPercentage] = useState(50);
  const [showSuccess, setShowSuccess] = useState(false);

  const userShares = vaultInfo?.userShares || 0;
  const sharesToWithdraw = (userShares * percentage) / 100;
  const usdcToReceive = sharesToWithdraw * (vaultInfo?.sharePrice || 1);
  const isValid = userShares > 0 && percentage > 0;

  const handleWithdraw = async () => {
    if (!isValid) return;

    try {
      await withdraw(sharesToWithdraw);
      setShowSuccess(true);
      setPercentage(50);

      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error("Withdraw failed:", err);
    }
  };

  const presetPercentages = [25, 50, 75, 100];

  if (!connected) {
    return <NotConnected />;
  }

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (userShares === 0) {
    return <NoShares />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Back Button */}
      <Link
        href="/"
        className="inline-flex items-center text-gray-400 hover:text-white transition"
      >
        <span className="mr-2">←</span>
        Back to Dashboard
      </Link>

      {/* Success Message */}
      {showSuccess && (
        <div className="glass rounded-xl p-4 border border-green-500/50 bg-green-500/10 animate-slide-down">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">✅</div>
            <div>
              <div className="text-green-400 font-semibold">
                Withdrawal Successful!
              </div>
              <div className="text-gray-400 text-sm">
                USDC has been sent to your wallet
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Card */}
      <div className="glass rounded-2xl p-8 border border-gray-800 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Withdraw</h1>
          <div className="text-4xl">💸</div>
        </div>

        {/* Your Position */}
        <div className="p-4 bg-black/30 rounded-xl">
          <div className="text-gray-400 text-sm mb-2">Your Position</div>
          <div className="flex items-baseline space-x-2">
            <div className="text-3xl font-bold text-white">
              {formatNumber(userShares, 2)}
            </div>
            <div className="text-gray-500">shares</div>
          </div>
          <div className="text-gray-400 text-sm mt-1">
            ≈ {formatCurrency(vaultInfo?.userValue || 0)}
          </div>
        </div>

        {/* Percentage Slider */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-gray-400 text-sm">Withdraw Amount</label>
            <div className="text-2xl font-bold text-white">{percentage}%</div>
          </div>

          {/* Custom Slider */}
          <div className="relative">
            <input
              type="range"
              min="0"
              max="100"
              value={percentage}
              onChange={(e) => setPercentage(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #4b5563 0%, #4b5563 ${percentage}%, #1f2937 ${percentage}%, #1f2937 100%)`,
              }}
            />
          </div>

          {/* Preset Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {presetPercentages.map((preset) => (
              <button
                key={preset}
                onClick={() => setPercentage(preset)}
                className={`py-2 px-4 rounded-lg text-sm font-semibold transition ${
                  percentage === preset
                    ? "bg-gray-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {preset}%
              </button>
            ))}
          </div>
        </div>

        {/* You Will Receive */}
        <div className="p-4 bg-black/30 rounded-xl border border-gray-800 space-y-3">
          <div className="text-gray-400 text-sm">You will receive</div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Shares to burn</span>
              <span className="text-white font-semibold">
                {formatNumber(sharesToWithdraw, 2)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-400">USDC amount</span>
              <span className="text-white font-semibold">
                {formatNumber(usdcToReceive, 2)} USDC
              </span>
            </div>

            <div className="pt-2 border-t border-gray-800">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">USD value</span>
                <span className="text-xl font-bold text-white">
                  {formatCurrency(usdcToReceive)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Remaining Position */}
        {percentage < 100 && (
          <div className="p-4 bg-black/20 rounded-xl border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">After withdrawal</div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Remaining shares</span>
              <span className="text-white">
                {formatNumber(userShares - sharesToWithdraw, 2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Remaining value</span>
              <span className="text-white">
                {formatCurrency(
                  (userShares - sharesToWithdraw) * (vaultInfo?.sharePrice || 1)
                )}
              </span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {withdrawError && (
          <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl">
            <div className="text-red-400 text-sm">{withdrawError}</div>
          </div>
        )}

        {/* Withdraw Button */}
        <button
          onClick={handleWithdraw}
          disabled={!isValid || withdrawing}
          className={`w-full py-4 rounded-xl font-semibold text-lg transition-all transform ${
            isValid && !withdrawing
              ? "bg-gray-700 hover:bg-gray-600 text-white hover:scale-[1.02] active:scale-[0.98]"
              : "bg-gray-800 text-gray-500 cursor-not-allowed"
          }`}
        >
          {withdrawing ? (
            <span className="flex items-center justify-center space-x-2">
              <LoadingSpinner />
              <span>Withdrawing...</span>
            </span>
          ) : (
            "Withdraw USDC"
          )}
        </button>

        {/* Info */}
        <div className="text-xs text-gray-500 text-center space-y-1">
          <div>No withdrawal fees • Instant processing</div>
          <div>Shares are burned permanently</div>
        </div>
      </div>

      {/* Warning */}
      {percentage === 100 && (
        <div className="glass rounded-xl p-4 border border-yellow-500/50 bg-yellow-500/10">
          <div className="flex items-start space-x-3">
            <div className="text-xl">⚠️</div>
            <div>
              <div className="text-yellow-400 font-semibold mb-1">
                Complete Withdrawal
              </div>
              <div className="text-gray-400 text-sm">
                You&apos;re withdrawing 100% of your position. You&apos;ll no
                longer earn yield from this vault.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="w-5 h-5 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="glass rounded-2xl p-8 border border-gray-800 animate-shimmer h-96" />
    </div>
  );
}

function NotConnected() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="glass rounded-2xl p-12 border border-gray-800 text-center">
        <div className="text-6xl mb-4">🔌</div>
        <div className="text-2xl font-bold text-white mb-2">
          Wallet Not Connected
        </div>
        <div className="text-gray-400 mb-6">
          Please connect your wallet to withdraw funds
        </div>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}

function NoShares() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="glass rounded-2xl p-12 border border-gray-800 text-center">
        <div className="text-6xl mb-4">📭</div>
        <div className="text-2xl font-bold text-white mb-2">
          No Shares to Withdraw
        </div>
        <div className="text-gray-400 mb-6">
          You need to deposit first before you can withdraw
        </div>
        <Link
          href="/deposit"
          className="inline-block px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition"
        >
          Make a Deposit
        </Link>
      </div>
    </div>
  );
}
