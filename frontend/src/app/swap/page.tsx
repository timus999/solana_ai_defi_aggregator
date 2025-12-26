import JupiterSwap from "@/components/JupiterSwap";

export default function SwapPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold gradient-text">Swap</h1>
        <p className="text-gray-400">Best prices powered by Jupiter</p>
      </div>

      <JupiterSwap />
    </div>
  );
}
