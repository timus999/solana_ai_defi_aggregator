"use client";

import { useVault } from "@/hooks/useVault";
import { formatNumber, formatCurrency } from "@/utils/constants";

export default function VaultDashboard() {
  const { vaultInfo, userBalance, loading, error } = useVault();

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorDisplay error={error} />;
  }

  if (!vaultInfo) {
    return <NoVaultData />;
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Value Locked */}
        <StatCard
          title="Total Value Locked"
          value={formatCurrency(vaultInfo.tvl)}
          subtitle={`${formatNumber(vaultInfo.totalAssets, 2)} USDC`}
          icon="💰"
        />

        {/* Share Price */}
        <StatCard
          title="Share Price"
          value={`${formatNumber(vaultInfo.sharePrice, 6)} USDC`}
          subtitle={`${formatNumber(vaultInfo.totalShares, 2)} total shares`}
          icon="📊"
        />

        {/* APY */}
        <StatCard
          title="Current APY"
          value={`${formatNumber(vaultInfo.apy, 2)}%`}
          subtitle={
            vaultInfo.strategyEnabled ? "Strategy active" : "Strategy paused"
          }
          icon="📈"
        />
      </div>

      {/* User Position */}
      {userBalance && (
        <div className="glass rounded-xl p-6 border border-gray-800">
          <h2 className="text-2xl font-bold text-white mb-6">Your Position</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Your Shares */}
            <div>
              <div className="text-gray-400 text-sm mb-2">Your Shares</div>
              <div className="text-3xl font-bold text-white">
                {formatNumber(vaultInfo.userShares, 2)}
              </div>
              <div className="text-gray-400 text-sm mt-1">
                ≈ {formatCurrency(vaultInfo.userValue)}
              </div>
            </div>

            {/* Your Balances */}
            <div>
              <div className="text-gray-400 text-sm mb-2">Wallet Balance</div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">USDC</span>
                  <span className="text-white font-semibold">
                    {formatNumber(userBalance.usdc, 2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">SOL</span>
                  <span className="text-white font-semibold">
                    {formatNumber(userBalance.sol, 4)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-6">
            <a
              href="/deposit"
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition text-center"
            >
              Deposit
            </a>
            <a
              href="/withdraw"
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition border border-gray-700 text-center"
            >
              Withdraw
            </a>
          </div>
        </div>
      )}

      {/* Vault Info */}
      <div className="glass rounded-xl p-6 border border-gray-800">
        <h2 className="text-2xl font-bold text-white mb-6">
          Vault Information
        </h2>

        <div className="space-y-4">
          <InfoRow
            label="Vault Address"
            value={vaultInfo.address.toString()}
            mono
          />
          <InfoRow
            label="Token Mint"
            value={vaultInfo.tokenMint.toString()}
            mono
          />
          <InfoRow
            label="Share Mint"
            value={vaultInfo.shareMint.toString()}
            mono
          />
          <InfoRow
            label="Strategy Status"
            value={vaultInfo.strategyEnabled ? "✅ Enabled" : "⏸️ Paused"}
          />
        </div>
      </div>

      {/* Recent Activity - Placeholder */}
      <div className="glass rounded-xl p-6 border border-gray-800">
        <h2 className="text-2xl font-bold text-white mb-6">Recent Activity</h2>
        <div className="text-gray-400 text-center py-8">
          No recent transactions
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
}) {
  return (
    <div className="glass rounded-xl p-6 border border-gray-800 card-hover">
      <div className="flex items-start justify-between mb-4">
        <div className="text-gray-400 text-sm">{title}</div>
        <div className="text-2xl">{icon}</div>
      </div>
      <div className="text-3xl font-bold text-white mb-2">{value}</div>
      <div className="text-gray-400 text-sm">{subtitle}</div>
    </div>
  );
}

// Info Row Component
function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
      <span className="text-gray-400">{label}</span>
      <span className={`text-white ${mono ? "font-mono text-xs" : ""}`}>
        {mono ? `${value.slice(0, 8)}...${value.slice(-8)}` : value}
      </span>
    </div>
  );
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="glass rounded-xl p-6 border border-gray-800 animate-shimmer h-32"
          />
        ))}
      </div>
      <div className="glass rounded-xl p-6 border border-gray-800 animate-shimmer h-64" />
    </div>
  );
}

// Error Display
function ErrorDisplay({ error }: { error: string }) {
  return (
    <div className="glass rounded-xl p-6 border border-red-900/50 bg-red-900/10">
      <div className="flex items-center space-x-3">
        <div className="text-3xl">⚠️</div>
        <div>
          <div className="text-red-400 font-semibold mb-1">
            Error Loading Vault
          </div>
          <div className="text-gray-400 text-sm">{error}</div>
        </div>
      </div>
    </div>
  );
}

// No Vault Data
function NoVaultData() {
  return (
    <div className="glass rounded-xl p-12 border border-gray-800 text-center">
      <div className="text-6xl mb-4">🏦</div>
      <div className="text-2xl font-bold text-white mb-2">No Vault Data</div>
      <div className="text-gray-400 mb-6">
        The vault has not been initialized yet.
      </div>
      <div className="text-sm text-gray-500">
        Make sure your Program ID is correct in .env.local
      </div>
    </div>
  );
}
