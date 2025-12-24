"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { shortenAddress } from "@/utils/constants";

export default function WalletButton() {
  const { publicKey, connected } = useWallet();

  return (
    <div className="flex items-center space-x-4">
      {connected && publicKey && (
        <div className="hidden md:block">
          <div className="text-sm text-gray-400">Connected as</div>
          <div className="text-white font-mono text-sm">
            {shortenAddress(publicKey.toString())}
          </div>
        </div>
      )}

      <WalletMultiButton className="bg-red-600! hover:bg-gray-700! rounded-lg! transition! px-4! py-2!" />
    </div>
  );
}
