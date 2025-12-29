import { Agent } from "@/types/agent";
import { Pause, Play, Settings, TrendingUp } from "lucide-react";

export const AgentDashboard: React.FC<{ agents: Agent[] }> = ({ agents }) => {
  const toggleAgent = (agentId: string) => {
    alert(`Toggling agent ${agentId}`);
  };

  return (
    <div className="space-y-4 rounded-3xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">MY AGENTS</h2>
        <button className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-700 hover:text-gray-300 transition-colors">
          + Create
        </button>
      </div>

      {agents.map((agent) => (
        <div key={agent.id} className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🤖</span>
              <div>
                <h3 className="font-bold text-lg">{agent.name}</h3>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      agent.status === "running"
                        ? "bg-green-500"
                        : agent.status === "paused"
                        ? "bg-yellow-500"
                        : "bg-gray-500"
                    }`}
                  />
                  <span className="text-sm text-gray-600 capitalize">
                    {agent.status}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => toggleAgent(agent.id)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                agent.status === "running"
                  ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                  : "bg-green-100 text-green-700 hover:bg-green-200"
              }`}
            >
              {agent.status === "running" ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {agent.status === "running" ? "Pause" : "Resume"}
            </button>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-xs text-gray-600 mb-1">
                Today&apos;s Profit
              </div>
              <div
                className={`text-xl font-bold ${
                  agent.performance.todayProfit >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {agent.performance.todayProfit >= 0 ? "+" : ""}$
                {agent.performance.todayProfit.toFixed(2)}
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-xs text-gray-600 mb-1">Executions</div>
              <div className="text-xl font-bold">
                {agent.performance.executions}
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-xs text-gray-600 mb-1">Success Rate</div>
              <div className="text-xl font-bold text-blue-600">
                {agent.performance.successRate}%
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-xs text-gray-600 mb-1">Total Profit</div>
              <div className="text-xl font-bold text-green-600">
                ${agent.performance.totalProfit.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <h4 className="font-medium mb-2 text-sm">
              📋 Strategies ({agent.strategies.length})
            </h4>
            <div className="space-y-2">
              {agent.strategies.map((strategy) => (
                <div
                  key={strategy.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-700">• {strategy.name}</span>
                  <span className="text-green-600 font-medium">
                    +${strategy.profit.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg mb-4">
            <div className="text-sm font-medium mb-1">🎯 Current Action:</div>
            <div className="text-sm text-gray-700">{agent.currentAction}</div>
          </div>

          <div className="flex gap-2">
            <button className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </button>
            <button className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Details
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
