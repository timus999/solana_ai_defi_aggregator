"use client";
import React, { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useProgram } from "@/hooks/useProgram";
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import {
  getJupiterQuote,
  JupiterQuote,
  getJupiterSwapTransaction,
} from "@/utils/jupiter";
import {
  ArrowDownUp,
  TrendingDown,
  Zap,
  RefreshCw,
  Info,
  ChevronDown,
} from "lucide-react";

interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

const POPULAR_TOKENS: Token[] = [
  {
    address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
  },
  {
    address: "So11111111111111111111111111111111111111112",
    symbol: "SOL",
    name: "Solana",
    decimals: 9,
  },
  {
    address: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
  },
  {
    address: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
    symbol: "mSOL",
    name: "Marinade SOL",
    decimals: 9,
  },
];

export default function JupiterSwap() {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const { program } = useProgram();

  // Token selection
  const [fromToken, setFromToken] = useState<Token>(POPULAR_TOKENS[0]);
  const [toToken, setToToken] = useState<Token>(POPULAR_TOKENS[1]);
  const [amount, setAmount] = useState("");

  // Quote data
  const [quote, setQuote] = useState<JupiterQuote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Swap execution
  const [swapping, setSwapping] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);

  // Settings
  const [slippage, setSlippage] = useState(50); // 0.5% in bps
  const [showSettings, setShowSettings] = useState(false);

  // Auto-fetch quote when amount changes
  useEffect(() => {
    if (amount && parseFloat(amount) > 0) {
      const timer = setTimeout(() => {
        fetchQuote();
      }, 500); // Debounce
      return () => clearTimeout(timer);
    }
  }, [amount, fromToken, toToken, slippage]);

  const fetchQuote = async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    try {
      setLoadingQuote(true);
      setQuoteError(null);

      const amountInSmallestUnit = Math.floor(
        parseFloat(amount) * Math.pow(10, fromToken.decimals)
      );

      const result = await getJupiterQuote(
        fromToken.address,
        toToken.address,
        amountInSmallestUnit,
        slippage
      );

      setQuote(result);
    } catch (error) {
      console.error("Error fetching quote:", error);
      setQuoteError("Failed to get price quote");
    } finally {
      setLoadingQuote(false);
    }
  };

  const handleSwap = async () => {
    if (!publicKey || !program || !quote) return;

    try {
      setSwapping(true);
      setSwapError(null);

      // Get swap transaction from Jupiter

      const swapTransaction = await getJupiterSwapTransaction(
        quote,
        publicKey.toString()
      );

      if (!swapTransaction) {
        setSwapError("Failed to get swap transaction");
        return;
      }
      console.log("swap transaction:", swapTransaction);

      // Deserialize
      const tx = VersionedTransaction.deserialize(
        Buffer.from(swapTransaction, "base64")
      );

      // Send via wallet adapter
      if (!signTransaction) {
        throw new Error("Wallet adapter not connected");
      }
      const signedTx = await signTransaction(tx);
      const serializedTx = signedTx.serialize();
      const latestBlockhash = await connection.getLatestBlockhash();

      // Send and confirm transaction
      const txid = await connection.sendRawTransaction(serializedTx, {
        skipPreflight: true,
        preflightCommitment: "recent",
      });

      await connection.confirmTransaction({
        signature: txid,
        ...latestBlockhash,
      });
      alert("Swap successful! 🎉");
      setAmount("");
      setQuote(null);
    } catch (error: any) {
      console.error("Error executing swap:", error);
      setSwapError(error.message || "Failed to execute swap");
    } finally {
      setSwapping(false);
    }
  };

  const switchTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
  };

  const outputAmount = quote
    ? (parseInt(quote.outAmount) / Math.pow(10, toToken.decimals)).toFixed(6)
    : "0";

  const priceImpact = quote ? quote.priceImpactPct : 0;
  const rate =
    quote && parseFloat(amount) > 0
      ? parseFloat(outputAmount) / parseFloat(amount)
      : 0;

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-xl p-6 ">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-primary">Swap</h2>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg border hover:border-gray-300 transition-colors"
          >
            <Zap className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mb-6 glass rounded-lg p-4 ">
            <h3 className="text-sm font-bold text-primary mb-3">Settings</h3>
            <div>
              <label className="block text-sm text-primary mb-2">
                Slippage Tolerance
              </label>
              <div className="flex space-x-2 bg-gray-100 p-2 rounded-lg">
                {[10, 50, 100].map((bps) => (
                  <button
                    key={bps}
                    onClick={() => setSlippage(bps)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                      slippage === bps
                        ? "bg-blue-600 text-gray-200"
                        : "bg-white  text-primary hover:border-gray-600"
                    }`}
                  >
                    {bps / 100}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* From Token */}
        <div className="bg-white rounded-lg p-4  mb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-primary">From</span>
            <span className="text-sm text-gray-400">Balance: 0.00</span>
          </div>

          <div className="flex items-center space-x-3 border border-gray-200 p-2 rounded-lg">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              className="flex-1 bg-transparent text-2xl font-bold text-gray-400 outline-none"
            />

            <button className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors">
              <span className="font-semibold text-gray-400">
                {fromToken.symbol}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Switch Button */}
        <div className="flex justify-center -my-2 relative z-10">
          <button onClick={switchTokens} className="p-2 rounded-lg ">
            <ArrowDownUp className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* To Token */}
        <div className="rounded-lg p-4  mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-primary">To</span>
            <span className="text-sm text-gray-400">Balance: 0.00</span>
          </div>

          <div className="flex items-center space-x-3 border border-gray-200 p-2 rounded-lg">
            <input
              type="text"
              value={loadingQuote ? "Loading..." : outputAmount}
              readOnly
              placeholder="0.0"
              className="flex-1 bg-transparent text-2xl font-bold text-gray-400 outline-none"
            />

            <button className="flex items-center space-x-2 glass px-4 py-2 rounded-lg ">
              <span className="font-semibold text-gray-400">
                {toToken.symbol}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Price Info */}
        {quote && (
          <div className="rounded-lg p-4 mb-4 space-y-2 bg-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-primary">Rate</span>
              <span className="text-gray-400 font-semibold">
                1 {fromToken.symbol} = {rate.toFixed(6)} {toToken.symbol}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-primary">Price Impact</span>
              <span
                className={`font-semibold ${
                  Math.abs(priceImpact) < 1
                    ? "text-green-400"
                    : Math.abs(priceImpact) < 3
                    ? "text-yellow-400"
                    : "text-red-400"
                }`}
              >
                {priceImpact > 0 ? "+" : ""}
                {Number(priceImpact).toFixed(6)}%
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-primary">Minimum Received</span>
              <span className="text-gray-400">
                {(
                  parseInt(quote.otherAmountThreshold) /
                  Math.pow(10, toToken.decimals)
                ).toFixed(6)}{" "}
                {toToken.symbol}
              </span>
            </div>
          </div>
        )}

        {/* Route Info */}
        {quote && quote.routePlan && quote.routePlan.length > 0 && (
          <div className="bg-gray-100 rounded-lg p-4  mb-4">
            <div className="flex items-start space-x-2">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-400">
                <p className="font-semibold text-primary mb-1">
                  Best Route Found
                </p>
                <p>
                  Routing through {quote.routePlan.length} swap
                  {quote.routePlan.length > 1 ? "s" : ""} for best price
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Messages */}
        {quoteError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
            <p className="text-red-400 text-sm">{quoteError}</p>
          </div>
        )}

        {swapError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
            <p className="text-red-400 text-sm">{swapError}</p>
          </div>
        )}

        {/* Swap Button */}
        <button
          onClick={handleSwap}
          disabled={!quote || swapping || !publicKey}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-lg transition-all flex items-center justify-center space-x-2"
        >
          {!publicKey ? (
            <span>Connect Wallet</span>
          ) : swapping ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Swapping...</span>
            </>
          ) : !quote ? (
            <span>Enter Amount</span>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              <span>Swap</span>
            </>
          )}
        </button>

        {/* Powered by Jupiter */}
        <div className="mt-4 text-center">
          <p className="text-xs text-primary">
            Powered by{" "}
            <span className="text-gray-400 font-semibold">Jupiter</span> • Best
            prices guaranteed
          </p>
        </div>
      </div>
    </div>
  );
}
