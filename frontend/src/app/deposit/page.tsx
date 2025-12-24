"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useVault } from "@/hooks/useVault";
import { formatNumber, formatCurrency, MIN_DEPOSIT } from "@/utils/constants";
import Link from "next/link";
import { useDeposit } from "@/hooks/useDeposit";

export default function DepositPage() {
  const { connected } = useWallet();
  const { vaultInfo, userBalance, loading } = useVault();
  const { deposit, depositing, error: depositError } = useDeposit();

  const [amount, setAmount] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const amountNum = parseFloat(amount) || 0;
  const sharesReceived = vaultInfo
    ? amountNum / vaultInfo.sharePrice
    : amountNum;
  const isValid =
    amountNum >= MIN_DEPOSIT && userBalance && amountNum <= userBalance.usdc;

  const handleDeposit = async () => {
    if (!isValid) return;

    try {
      await deposit(amountNum);
      setShowSuccess(true);
      setAmount("");

      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error("Deposit failed: ", err);
    }
  };

  const setMaxAmount = () => {
    if (userBalance) {
      setAmount(userBalance.usdc.toString());
    }
  };

  if (!connected) {
    return <NotConnected />;
  }

  if (loading) {
    return <LoadingSkeleton />;
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
                Deposit Successful!
              </div>
              <div className="text-gray-400 text-sm">
                Your shares have been minted
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Card */}
      <div className="glass rounded-2xl p-8 border border-gray-800 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Deposit</h1>
          <div className="text-4xl">💰</div>
        </div>

        {/* Current Stats */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-black/30 rounded-xl">
          <div>
            <div className="text-gray-400 text-sm">Share Price</div>
            <div className="text-white font-semibold">
              {vaultInfo
                ? `${formatNumber(vaultInfo.sharePrice, 6)} USDC`
                : "-"}
            </div>
          </div>
          <div>
            <div className="text-gray-400 text-sm">Your Balance</div>
            <div className="text-white font-semibold">
              {userBalance ? `${formatNumber(userBalance.usdc, 2)} USDC` : "-"}
            </div>
          </div>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-gray-400 text-sm">Amount to Deposit</label>
            <button
              onClick={setMaxAmount}
              className="text-xs text-gray-500 hover:text-gray-300 transition"
            >
              MAX
            </button>
          </div>

          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-black/50 border border-gray-700 rounded-xl px-6 py-4 text-2xl text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 transition"
              step="0.01"
              min={MIN_DEPOSIT}
            />
            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 text-lg">
              USDC
            </div>
          </div>

          {amount && (
            <div className="text-sm text-gray-400">
              ≈ {formatCurrency(amountNum)}
            </div>
          )}
        </div>

        {/* You Will Receive */}
        <div className="p-4 bg-black/30 rounded-xl border border-gray-800">
          <div className="text-gray-400 text-sm mb-2">You will receive</div>
          <div className="flex items-baseline space-x-2">
            <div className="text-3xl font-bold text-white">
              {formatNumber(sharesReceived, 2)}
            </div>
            <div className="text-gray-500">shares</div>
          </div>
          <div className="text-gray-500 text-sm mt-1">
            Current value:{" "}
            {formatCurrency(sharesReceived * (vaultInfo?.sharePrice || 1))}
          </div>
        </div>

        {/* Error Message */}
        {depositError && (
          <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl">
            <div className="text-red-400 text-sm">{depositError}</div>
          </div>
        )}

        {/* Deposit Button */}
        <button
          onClick={handleDeposit}
          disabled={!isValid || depositing}
          className={`w-full py-4 rounded-xl font-semibold text-lg transition-all transform ${
            isValid && !depositing
              ? "bg-gray-700 hover:bg-gray-600 text-white hover:scale-[1.02] active:scale-[0.98]"
              : "bg-gray-800 text-gray-500 cursor-not-allowed"
          }`}
        >
          {depositing ? (
            <span className="flex items-center justify-center space-x-2">
              <LoadingSpinner />
              <span>Depositing...</span>
            </span>
          ) : (
            "Deposit USDC"
          )}
        </button>

        {/* Info */}
        <div className="text-xs text-gray-500 text-center space-y-1">
          <div>Minimum deposit: {MIN_DEPOSIT} USDC</div>
          <div>No deposit fees • Instant minting</div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InfoCard
          icon="⚡"
          title="Instant"
          description="Shares minted immediately"
        />
        <InfoCard icon="🔒" title="Secure" description="Non-custodial vault" />
        <InfoCard
          icon="📈"
          title="Growing"
          description="Earn yield automatically"
        />
      </div>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="glass rounded-xl p-4 border border-gray-800 text-center">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-white font-semibold text-sm mb-1">{title}</div>
      <div className="text-gray-500 text-xs">{description}</div>
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
          Please connect your wallet to deposit funds
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
