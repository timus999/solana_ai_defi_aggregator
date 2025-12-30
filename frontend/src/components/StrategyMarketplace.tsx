"use client";
import React, { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useProgram } from "@/hooks/useProgram";
import { PublicKey } from "@solana/web3.js";
import {
  Store,
  TrendingUp,
  Users,
  Star,
  Filter,
  Search,
  Plus,
} from "lucide-react";
import Link from "next/link";

interface Strategy {
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
  strategyType: "Arbitrage" | "YieldFarming" | "Rebalancing" | "Custom";
}

type FilterType = "all" | "popular" | "profitable" | "new";
type SortType = "price" | "purchases" | "profit" | "success";

export default function StrategyMarketplace() {
  const { publicKey } = useWallet();
  const { program } = useProgram();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [filteredStrategies, setFilteredStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [sort, setSort] = useState<SortType>("purchases");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (program) {
      fetchStrategies();
    }
  }, [program]);

  useEffect(() => {
    applyFilters();
  }, [strategies, filter, sort, searchQuery]);

  const fetchStrategies = async () => {
    if (!program) return;

    try {
      setLoading(true);

      // Fetch all strategy accounts
      const strategyAccounts = await program.account.strategy.all();

      const strategiesList: Strategy[] = strategyAccounts.map((acc: any) => ({
        publicKey: acc.publicKey,
        creator: acc.account.creator,
        strategyId: acc.account.strategyId.toNumber(),
        name: acc.account.name,
        description: acc.account.description,
        price: acc.account.price.toNumber() / 1e6, // Convert to USDC
        isActive: acc.account.isActive,
        totalPurchases: acc.account.totalPurchases.toNumber(),
        totalExecutions: acc.account.totalExecutions.toNumber(),
        totalProfit: acc.account.totalProfit.toNumber() / 1e6,
        successRate: acc.account.successRate / 100, // Convert to percentage
        createdAt: acc.account.createdAt.toNumber(),
        strategyType: Object.keys(acc.account.strategyType)[0] as any,
      }));

      setStrategies(strategiesList.filter((s) => s.isActive));
    } catch (error) {
      console.error("Error fetching strategies:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...strategies];

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply filter
    switch (filter) {
      case "popular":
        filtered = filtered.filter((s) => s.totalPurchases >= 5);
        break;
      case "profitable":
        filtered = filtered.filter((s) => s.totalProfit > 0);
        break;
      case "new":
        const weekAgo = Date.now() / 1000 - 7 * 24 * 60 * 60;
        filtered = filtered.filter((s) => s.createdAt > weekAgo);
        break;
    }

    // Apply sort
    filtered.sort((a, b) => {
      switch (sort) {
        case "price":
          return a.price - b.price;
        case "purchases":
          return b.totalPurchases - a.totalPurchases;
        case "profit":
          return b.totalProfit - a.totalProfit;
        case "success":
          return b.successRate - a.successRate;
        default:
          return 0;
      }
    });

    setFilteredStrategies(filtered);
  };

  const getStrategyTypeIcon = (type: Strategy["strategyType"]) => {
    switch (type) {
      case "Arbitrage":
        return "⚡";
      case "YieldFarming":
        return "🌾";
      case "Rebalancing":
        return "⚖️";
      case "Custom":
        return "🎯";
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(2);
  };

  if (!publicKey) {
    return (
      <div className="glass rounded-xl p-12 border border-gray-800 text-center">
        <Store className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">
          Strategy Marketplace
        </h2>
        <p className="text-gray-400">
          Connect your wallet to browse and purchase strategies
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">
            Strategy Marketplace
          </h1>
          <p className="text-gray-500">
            Discover and purchase trading strategies from the community
          </p>
        </div>

        <Link href="/strategies/create">
          <button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold px-6 py-3 rounded-lg transition-all flex items-center space-x-2">
            <Plus className="w-5 h-5" />
            <span>Create Strategy</span>
          </button>
        </Link>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-green-50 rounded-lg p-4 ">
          <div className="flex items-center justify-between mb-2">
            <span className="text-primary text-sm">Total Strategies</span>
            <Store className="w-4 h-4 text-gray-500" />
          </div>
          <p className="text-2xl font-bold text-primary">{strategies.length}</p>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 ">
          <div className="flex items-center justify-between mb-2">
            <span className="text-primary text-sm">Total Purchases</span>
            <Users className="w-4 h-4 text-gray-500" />
          </div>
          <p className="text-2xl font-bold text-primary">
            {strategies.reduce((sum, s) => sum + s.totalPurchases, 0)}
          </p>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4 ">
          <div className="flex items-center justify-between mb-2">
            <span className="text-primary text-sm">Total Profit</span>
            <TrendingUp className="w-4 h-4 text-gray-500" />
          </div>
          <p className="text-2xl font-bold text-green-400">
            $
            {formatNumber(
              strategies.reduce((sum, s) => sum + s.totalProfit, 0)
            )}
          </p>
        </div>

        <div className="rounded-lg p-4 bg-red-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-primary text-sm">Avg Success Rate</span>
            <Star className="w-4 h-4 text-gray-500" />
          </div>
          <p className="text-2xl font-bold text-primary">
            {strategies.length > 0
              ? (
                  strategies.reduce((sum, s) => sum + s.successRate, 0) /
                  strategies.length
                ).toFixed(1)
              : 0}
            %
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="rounded-lg p-4 bg-white">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search strategies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-gray-100 w-full pl-10 pr-4 py-2 rounded-lg text-primary placeholder-gray-400 focus:outline-none"
            />
          </div>

          {/* Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterType)}
              className="px-4 py-2 bg-blue-500 rounded-lg text-white font-bold"
            >
              <option value="all">All Strategies</option>
              <option value="popular">Popular</option>
              <option value="profitable">Profitable</option>
              <option value="new">New</option>
            </select>
          </div>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortType)}
            className="px-4 py-2 rounded-lg text-white bg-purple-500 font-bold"
          >
            <option value="purchases">Most Purchased</option>
            <option value="profit">Highest Profit</option>
            <option value="success">Success Rate</option>
            <option value="price">Price: Low to High</option>
          </select>
        </div>
      </div>

      {/* Strategy Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-lg p-6 bg-gray-200 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
              <div className="h-4 bg-gray-200 rounded w-full mb-2" />
              <div className="h-4 bg-gray-200 rounded w-5/6" />
            </div>
          ))}
        </div>
      ) : filteredStrategies.length === 0 ? (
        <div className="bg-white rounded-lg p-12">
          <p className="text-gray-400">
            No strategies found. Try adjusting your filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStrategies.map((strategy) => (
            <StrategyCard
              key={strategy.publicKey.toString()}
              strategy={strategy}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StrategyCard({ strategy }: { strategy: Strategy }) {
  const getStrategyTypeIcon = (type: Strategy["strategyType"]) => {
    switch (type) {
      case "Arbitrage":
        return "⚡";
      case "YieldFarming":
        return "🌾";
      case "Rebalancing":
        return "⚖️";
      case "Custom":
        return "🎯";
    }
  };

  return (
    <Link href={`/strategies/${strategy.publicKey.toString()}`}>
      <div className="bg-white rounded-lg p-6 cursor-pointer group hover:bg-blue-50 card-hover">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="text-3xl">
              {getStrategyTypeIcon(strategy.strategyType)}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-700 group-hover:text-blue-400 transition-colors">
                {strategy.name}
              </h3>
              <p className="text-sm text-gray-500">{strategy.strategyType}</p>
            </div>
          </div>

          <div className="flex items-center space-x-1 text-orange-600">
            <Star className="w-4 h-4 fill-current" />
            <span className="text-sm font-semibold">
              {strategy.successRate.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-400 text-sm mb-4 line-clamp-2">
          {strategy.description}
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4 pb-4 border-b border-gray-800">
          <div>
            <p className="text-xs text-gray-500 mb-1">Purchases</p>
            <p className="text-sm font-semibold text-gray-400">
              {strategy.totalPurchases}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Executions</p>
            <p className="text-sm font-semibold text-gray-400">
              {strategy.totalExecutions}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Profit</p>
            <p
              className={`text-sm font-semibold ${
                strategy.totalProfit >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              ${Math.abs(strategy.totalProfit).toFixed(0)}
            </p>
          </div>
        </div>

        {/* Price & CTA */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Price</p>
            <p className="text-xl font-bold text-primary">
              {strategy.price} USDC
            </p>
          </div>

          <button className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors">
            Buy Now
          </button>
        </div>
      </div>
    </Link>
  );
}
