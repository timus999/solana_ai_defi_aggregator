"use client";

import { useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";

// Import wallet adapter CSS
import "@solana/wallet-adapter-react-ui/styles.css";
import "./globals.css";
import WalletButton from "@/components/WalletButton";
import Link from "next/link";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get network from environment or default to devnet
  const network =
    (process.env.NEXT_PUBLIC_NETWORK as WalletAdapterNetwork) ||
    WalletAdapterNetwork.Devnet;

  // Get RPC endpoint
  const endpoint = useMemo(() => {
    if (process.env.NEXT_PUBLIC_RPC_URL) {
      return process.env.NEXT_PUBLIC_RPC_URL;
    }
    return clusterApiUrl(network);
  }, [network]);

  // Configure supported wallets
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
      new TorusWalletAdapter(),
    ],
    [network]
  );

  return (
    <html lang="en">
      <head>
        <title>AgentFlow Vault</title>
        <meta name="description" content="DeFi Vault powered by AI Agents" />
      </head>
      <body>
        <ConnectionProvider endpoint={endpoint}>
          <WalletProvider wallets={wallets} autoConnect>
            <WalletModalProvider>
              <div className="min-h-screen bg-linear-to-br from-gray-800 via-gray-500 to-gray-900">
                {/* Navigation Bar */}
                <nav className="pt-2">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                      {/* Logo */}
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-linear-to-br from-black-500 to-gray-600 rounded-lg" />
                        <span className="text-xl font-bold text-white">
                          AgentFlow
                        </span>
                      </div>

                      {/* Navigation Links */}
                      <div className="hidden md:flex  items-center space-x-14">
                        <Link
                          href="/"
                          className="text-gray-300 hover:text-white transition"
                        >
                          Dashboard
                        </Link>
                        <Link
                          href="/swap"
                          className="text-gray-300 hover:text-white transition"
                        >
                          Swap
                        </Link>
                        <Link
                          href="/withdraw"
                          className="text-gray-300 hover:text-white transition"
                        >
                          Withdraw
                        </Link>
                        <Link
                          href="/strategies"
                          className="text-gray-300 hover:text-white transition"
                        >
                          Strategies
                        </Link>
                      </div>

                      {/* Wallet Button - This will be created next */}
                      <WalletButton />
                    </div>
                  </div>
                </nav>

                {/* Main Content */}
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                  {children}
                </main>

                {/* Footer */}
                <footer className="border-t border-gray-800 mt-20">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="text-center text-gray-400">
                      <p>AgentFlow Vault - Powered by AI Agents on Solana</p>
                      <p className="text-sm mt-2">
                        Network:{" "}
                        <span className="text-purple-400">{network}</span>
                      </p>
                    </div>
                  </div>
                </footer>
              </div>
            </WalletModalProvider>
          </WalletProvider>
        </ConnectionProvider>
      </body>
    </html>
  );
}
