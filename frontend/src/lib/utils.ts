import { Agent } from "@/types/agent";
export const formatCurrency = (
  amount: number,
  decimals: number = 2
): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
};

export const formatPercentage = (
  value: number,
  decimals: number = 2
): string => {
  return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;
};

export const formatTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

export const calculateROI = (profit: number, investment: number): number => {
  return (profit / investment) * 100;
};

export const calculateSharpeRatio = (
  returns: number[],
  riskFreeRate: number = 0.02
): number => {
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdDev = Math.sqrt(
    returns.reduce((sq, n) => sq + Math.pow(n - avgReturn, 2), 0) /
      returns.length
  );
  return (avgReturn - riskFreeRate) / stdDev;
};

export const truncateAddress = (address: string, chars: number = 4): string => {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};

export const getRiskColor = (risk: "low" | "medium" | "high"): string => {
  const colors = {
    low: "text-green-600 bg-green-100",
    medium: "text-yellow-600 bg-yellow-100",
    high: "text-red-600 bg-red-100",
  };
  return colors[risk];
};

export const getStatusColor = (status: Agent["status"]): string => {
  const colors = {
    running: "text-green-600 bg-green-100",
    paused: "text-yellow-600 bg-yellow-100",
    stopped: "text-gray-600 bg-gray-100",
  };
  return colors[status];
};
