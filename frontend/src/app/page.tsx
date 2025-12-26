"use client";
import { useWallet } from "@solana/wallet-adapter-react";
import VaultDashboard from "@/components/VaultDashboard";
import Portfolio from "@/components/Portfolio";
import TransactionHistory from "@/components/TransactionHistory";
import Link from "next/link";

export default function Home() {
  const { connected, publicKey } = useWallet();

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-12">
        <h1 className="text-5xl font-bold gradient-text">AgentFlow Vault</h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          AI-powered DeFi vault with automated strategies on Solana
        </p>

        {!connected && (
          <div className="mt-6">
            <div className="text-gray-500 text-sm mb-3">
              Connect your wallet to get started
            </div>
          </div>
        )}
      </div>

      {/* Dashboard or Welcome */}
      {connected && publicKey ? (
        <div className="space-y-6">
          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Column - Portfolio (takes 2 columns on large screens) */}
            <div className="lg:col-span-2">
              <Portfolio />
            </div>

            {/* Right Column - Quick Actions & Vault Stats */}
            <div className="space-y-6 lg:col-span-2">
              <VaultDashboard />

              {/* Quick Action Buttons */}
              <div className="glass rounded-xl p-6 border border-gray-800">
                <h3 className="text-lg font-bold text-white mb-4">
                  Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <Link href="/deposit">
                    <button className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-500 hover:to-green-500 text-white font-semibold py-3 rounded-lg transition-all">
                      Deposit
                    </button>
                  </Link>
                  <Link href="/withdraw">
                    <button className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-all">
                      Withdraw
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Transaction History - Full Width */}
          <TransactionHistory />
        </div>
      ) : (
        <WelcomeScreen />
      )}
    </div>
  );
}

function WelcomeScreen() {
  return (
    <div className="glass rounded-xl p-12 border border-gray-800 text-center">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Icon */}
        <div className="text-6xl mb-4">🤖</div>

        {/* Title */}
        <h2 className="text-3xl font-bold text-white">Welcome to AgentFlow</h2>

        {/* Description */}
        <p className="text-gray-400 text-lg">
          A next-generation DeFi vault that uses AI agents to optimize your
          yields and execute strategies automatically on Solana.
        </p>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <FeatureCard
            icon="💰"
            title="High Yields"
            description="Maximize returns with automated strategies"
          />
          <FeatureCard
            icon="🤖"
            title="AI Agents"
            description="Smart agents execute strategies 24/7"
          />
          <FeatureCard
            icon="🔒"
            title="Secure"
            description="Non-custodial, your keys your crypto"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mt-12 pt-8 border-t border-gray-800">
          <div>
            <div className="text-2xl font-bold text-white">12.5%</div>
            <div className="text-gray-400 text-sm">Average APY</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">$0</div>
            <div className="text-gray-400 text-sm">Total Value Locked</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">0</div>
            <div className="text-gray-400 text-sm">Active Users</div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 text-gray-500 text-sm">
          👆 Connect your wallet above to start earning
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="glass rounded-lg p-6 border border-gray-800">
      <div className="text-3xl mb-3">{icon}</div>
      <div className="text-white font-semibold mb-2">{title}</div>
      <div className="text-gray-400 text-sm">{description}</div>
    </div>
  );
}
