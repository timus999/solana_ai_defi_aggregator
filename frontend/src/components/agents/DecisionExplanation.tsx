import {
  DollarSign,
  Clock,
  TrendingUp,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Decision } from "@/types/agent";

export const DecisionExplanation: React.FC<{ decision: Decision }> = ({
  decision,
}) => {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          🤖 Agent Decision: {decision.decision.toUpperCase()}
        </h3>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            decision.decision === "execute"
              ? "bg-green-100 text-green-800"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {decision.decision === "execute" ? "EXECUTED" : "SKIPPED"}
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <Clock className="w-4 h-4" />
            Strategy: {decision.strategy} | Time:{" "}
            {formatTime(decision.timestamp)}
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            📊 Market Analysis
          </h4>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="bg-blue-50 p-3 rounded">
              <div className="text-gray-600">Jupiter Price</div>
              <div className="font-semibold">
                1 SOL = ${decision.marketAnalysis.jupiterPrice.toFixed(2)}
              </div>
            </div>
            <div className="bg-blue-50 p-3 rounded">
              <div className="text-gray-600">Orca Price</div>
              <div className="font-semibold">
                1 SOL = ${decision.marketAnalysis.orcaPrice.toFixed(2)}
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <div className="text-gray-600">Spread</div>
              <div className="font-semibold text-green-600">
                {decision.marketAnalysis.spread}% (
                {(decision.marketAnalysis.spread * 100).toFixed(0)} bps)
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-semibold mb-2">✅ Rules Check</h4>
          <div className="space-y-2 text-sm">
            {Object.entries(decision.rulesCheck).map(([key, passed]) => (
              <div key={key} className="flex items-center gap-2">
                {passed ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <span className={passed ? "text-green-700" : "text-red-700"}>
                  {key === "cooldown" &&
                    `Cooldown: 6m since last (>5m required)`}
                  {key === "dailyLoss" && `Daily Loss: $0 / $50 limit`}
                  {key === "confidence" &&
                    `Confidence: ${decision.confidence}% (>60% required)`}
                  {key === "riskLevel" && `Risk Level: Low`}
                  {key === "successRate" && `Success Rate: 87% (>50% required)`}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            💰 Expected Outcome
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-gray-600">Amount</div>
              <div className="font-semibold">
                ${decision.expectedOutcome.amount}
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-gray-600">Expected Profit</div>
              <div className="font-semibold text-green-600">
                ${decision.expectedOutcome.expectedProfit.toFixed(2)}
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-gray-600">Gas Cost</div>
              <div className="font-semibold">
                ~${decision.expectedOutcome.gasCost.toFixed(2)}
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <div className="text-gray-600">Net Profit</div>
              <div className="font-semibold text-green-600">
                ~${decision.expectedOutcome.netProfit.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">Confidence Score</div>
            <div className="font-semibold text-blue-600">
              {decision.confidence}%
            </div>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${decision.confidence}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
