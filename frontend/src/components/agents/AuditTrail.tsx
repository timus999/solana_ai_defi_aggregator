import { Execution } from "@/types/agent";

export const AuditTrail: React.FC<{ executions: Execution[] }> = ({
  executions,
}) => {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getStatusIcon = (status: Execution["status"]) => {
    const icons = {
      success: { icon: "✅", color: "text-green-600" },
      failed: { icon: "❌", color: "text-red-600" },
      skipped: { icon: "⏭️", color: "text-yellow-600" },
    };
    return icons[status];
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">📜 Execution History</h3>
      <div className="space-y-3">
        {executions.map((execution) => {
          const statusIcon = getStatusIcon(execution.status);
          return (
            <div
              key={execution.id}
              className="border-l-4 border-gray-300 pl-4 py-2"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-gray-500">
                  {formatTime(execution.timestamp)}
                </span>
                <span className={statusIcon.color}>{statusIcon.icon}</span>
                <span className="font-medium">
                  {execution.action} {execution.strategyName}
                </span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                {execution.status === "success" && (
                  <>
                    <div>
                      Profit:{" "}
                      <span className="text-green-600 font-medium">
                        +${execution.profit.toFixed(2)}
                      </span>{" "}
                      | Gas: ${execution.gas.toFixed(2)}
                    </div>
                    {execution.txHash && (
                      <div className="text-blue-600">
                        TX: {execution.txHash}...
                      </div>
                    )}
                  </>
                )}
                {execution.status === "failed" && (
                  <>
                    <div>Error: {execution.reason}</div>
                    {execution.txHash && (
                      <div className="text-blue-600">
                        TX: {execution.txHash}...
                      </div>
                    )}
                  </>
                )}
                {execution.status === "skipped" && (
                  <div>Reason: {execution.reason}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <button className="mt-4 w-full py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
        Load More
      </button>
    </div>
  );
};
