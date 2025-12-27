// Market Monitors
// Real-time price feeds and market data
//
//

import { Connection, PublicKey } from "@solana/web3.js";
import type { MarketData } from "../core/strategy-engine-core.ts";
import fetch from "node-fetch";

// Jupiter Price Monitors

export class JupiterPriceMonitor {
  private cache: Map<string, { data: MarketData; timestamp: number }> =
    new Map();
  private cacheDuration: number = 5000; // 5 seconds

  async getPrice(
    inputMint: PublicKey,
    outputMint: PublicKey,
    amount: number = 1_000_000 // 1 usdc in lamports
  ): Promise<MarketData> {
    const cacheKey = `${inputMint.toString()}-${outputMint.toString()}`;

    // Check cache
    //
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return cached.data;
    }

    try {
      // Fetch quote from Jupiter
      const response = await fetch(
        `https://api.jup.ag/swap/v1/quote?cluster=devnet&slippageBps=50` +
          `&swapMode=ExactIn&restrictIntermediateTokens=true&maxAccounts=64&instructionVersion=V1&` +
          `inputMint=${inputMint.toString()}&` +
          `outputMint=${outputMint.toString()}&` +
          `amount=${amount}`,
        {
          method: "GET",
          headers: {
            "x-api-key": process.env.JUPITER_API_KEY!,
          },
        }
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Jupiter API error ${response.status}: ${text}`);
      }
      const quote: any = await response.json();

      // calcuolate price
      const outputAmount = parseInt(quote.outAmount);
      const price = outputAmount / amount;

      // Get price impact
      const priceImpact = quote.priceImpact || 0;

      const marketData: MarketData = {
        inputToken: inputMint,
        outputToken: outputMint,
        price,
        volume24h: 0,
        liquidityUsd: 0,
        priceChange24h: priceImpact,
        timestamp: Date.now(),
      };

      this.cache.set(cacheKey, { data: marketData, timestamp: Date.now() });

      return marketData;
    } catch (error) {
      console.error(`Error fetching Jupiter price: ${error}`);
      throw error;
    }
  }

  async getMultiplePrices(
    pairs: Array<{ inputMint: PublicKey; outputMint: PublicKey }>
  ): Promise<MarketData[]> {
    const promises = pairs.map((pair) =>
      this.getPrice(pair.inputMint, pair.outputMint)
    );
    return Promise.all(promises);
  }

  clearCache(): void {
    this.cache.clear();
  }
}

// MulitDex Price Monitor
// Compare prices across multiple DEXs
//
export class MultiDexPriceMonitor {
  private jupiterMonitor: JupiterPriceMonitor;

  constructor() {
    this.jupiterMonitor = new JupiterPriceMonitor();
  }
  async getPriceAcrossDexes(
    inputMint: PublicKey,
    outputMint: PublicKey
  ): Promise<{
    best: MarketData;
    worst: MarketData;
    spread: number;
    spreadBps: number;
  }> {
    // Get Jupiter price ( which aggregates multiple DEXs)
    const jupiterPrice = await this.jupiterMonitor.getPrice(
      inputMint,
      outputMint
    );

    // In production, check:
    // Orca directly
    // Raydium directly
    // Meteora directly
    // For now Jupiter aggregates all of these
    //

    // for demo purposes, simulate small variations
    const prices = [jupiterPrice];

    const best = prices.reduce((max, p) => (p.price > max.price ? p : max));
    // const worst = prices.reduce((min, p) => (p.price < min.price ? p : min));
    let worst: MarketData = {
      inputToken: inputMint,
      outputToken: outputMint,
      price: 0.05,
      volume24h: 0,
      liquidityUsd: 0,
      priceChange24h: best.priceChange24h,
      timestamp: Date.now(),
    };

    const spread = best.price - worst.price;
    const spreadBps = (spread / worst.price) * 10000;
    return { best, worst, spread, spreadBps };
  }
}

// Portfolio Monitor
// Track user's token holdings
//
export class PortfolioMonitor {
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  async getTokenBalance(owner: PublicKey, mint: PublicKey): Promise<number> {
    try {
      const { getAssociatedTokenAddress, getAccount } = await import(
        "@solana/spl-token"
      );

      const ata = await getAssociatedTokenAddress(mint, owner);
      const account = await getAccount(this.connection, ata);

      return Number(account.amount);
    } catch (error) {
      console.error("Error fetching token balance:", error);
      return 0;
    }
  }

  async getPortfolio(
    owner: PublicKey,
    mints: PublicKey[]
  ): Promise<Map<string, number>> {
    const balances = new Map<string, number>();

    for (const mint of mints) {
      const balance = await this.getTokenBalance(owner, mint);
      balances.set(mint.toString(), balance);
    }

    return balances;
  }

  async getPortfolioValue(
    owner: PublicKey,
    mints: PublicKey[],
    priceMonitor: JupiterPriceMonitor,
    usdcMint: PublicKey
  ): Promise<number> {
    const portfolio = await this.getPortfolio(owner, mints);
    let totalValue = 0;

    for (const [mintStr, balance] of portfolio.entries()) {
      if (balance === 0) continue;

      const mint = new PublicKey(mintStr);

      // If it's USDC, value is 1:1
      if (mint.equals(usdcMint)) {
        totalValue += balance / 1e6;
      } else {
        // get price in USDC
        const marketData = await priceMonitor.getPrice(mint, usdcMint, balance);
        totalValue += (balance * marketData.price) / 1e6;
      }
    }

    return totalValue;
  }
}

// APY Monitor
// Tracks yields across protocols
//
export class APYMonitor {
  private cache: Map<string, { apy: number; timestamp: number }> = new Map();

  async getPoolAPY(poolAddress: PublicKey): Promise<number> {
    const cached = this.cache.get(poolAddress.toString());

    if (cached && Date.now() - cached.timestamp < 60000) {
      return cached.apy;
    }

    try {
      // In production, fetch from:
      // - Kamino: https://api.kamino.finance/strategies
      // - Orca: https://api.orca.so/v1/pools
      // - Raydium: https://api.raydium.io/v2/main/farm/info

      // For now, return mock data
      //
      const mockAPY = Math.random() * 20 + 5; // 5 - 25%

      this.cache.set(poolAddress.toString(), {
        apy: mockAPY,
        timestamp: Date.now(),
      });

      return mockAPY;
    } catch (error) {
      console.error("Error fetching APY: ", error);
      return 0;
    }
  }

  async getBestYieldOppurtunity(
    pools: PublicKey[]
  ): Promise<{ pool: PublicKey; apy: number } | null> {
    if (pools.length === 0) return null;
    const apys = await Promise.all(
      pools.map(async (pool) => ({
        pool,
        apy: await this.getPoolAPY(pool),
      }))
    );

    return apys.reduce((best, current) =>
      current.apy > best.apy ? current : best
    );
  }
}

// Market conditions analyzer
// Analyze overall market conditions
//
export class MarketConditionsAnalyzer {
  private priceMonitor: JupiterPriceMonitor;

  constructor(priceMonitor: JupiterPriceMonitor) {
    this.priceMonitor = priceMonitor;
  }

  async analyzeVolatility(
    inputMint: PublicKey,
    outputMint: PublicKey,
    samples: number = 5
  ): Promise<{
    volatility: number;
    trend: "up" | "down" | "sideways";
    confidence: number;
  }> {
    const prices: number[] = [];

    // samples prices over time
    for (let i = 0; i < samples; i++) {
      const marketData = await this.priceMonitor.getPrice(
        inputMint,
        outputMint
      );
      prices.push(marketData.price);
      if (i < samples - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // wait 1 second
      }
    }

    // Calculate volatility ( standard deviation )
    const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const variance =
      prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;

    const volatility = Math.sqrt(variance);

    // Determine trend
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const change = (lastPrice! - firstPrice!) / firstPrice!;

    let trend: "up" | "down" | "sideways";
    if (change > 0.01) trend = "up";
    else if (change < -0.01) trend = "down";
    else trend = "sideways";

    // Calculate confidence based on consistency
    const trendConsistency = prices.reduce((count, price, i) => {
      if (i === 0) return count;
      const localTrend = price > prices[i - 1]! ? "up" : "down";
      return localTrend === trend ? count + 1 : count;
    }, 0);

    const confidence = (trendConsistency / (samples - 1)) * 100;

    return { volatility, trend, confidence };
  }

  async isGoodTimeToTrade(
    inputMint: PublicKey,
    outputMint: PublicKey
  ): Promise<{ shouldTrade: boolean; reason: string }> {
    const conditions = await this.analyzeVolatility(inputMint, outputMint);

    // Don't trade in high volatility
    // if (conditions.volatility > 0.05) {
    //   return {
    //     shouldTrade: false,
    //     reason: "Market too volatile",
    //   };

    // Don't trade with low confidence
    // if (conditions.confidence < 60) {
    //   return {
    //     shouldTrade: false,
    //     reason: "Trend confidence too low",
    //   };
    // }

    return {
      shouldTrade: true,
      reason: "Market conditions favorable",
    };
  }
}

export default {
  JupiterPriceMonitor,
  MultiDexPriceMonitor,
  PortfolioMonitor,
  APYMonitor,
  MarketConditionsAnalyzer,
};
