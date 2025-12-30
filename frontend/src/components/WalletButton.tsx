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
          <div className="text-sm text-gray-400 font-bold">Connected as</div>
          <div className="text-indigo-500 font-mono text-sm font-bold">
            {shortenAddress(publicKey.toString())}
          </div>
        </div>
      )}

      <WalletMultiButton className="text-black!  hover:bg-gray-700! rounded-lg! transition! px-4! py-2!" />
    </div>
  );
}
