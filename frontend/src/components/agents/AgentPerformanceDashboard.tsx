import { Agent } from "@/types/agent";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
  LineChart,
} from "recharts";
export const AgentPerformanceDashboard: React.FC<{
  agent: Agent;
  chartData: any[];
}> = ({ agent, chartData }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4 text-primary">
        AGENT PERFORMANCE: {agent.name}
      </h3>

      <div className="mb-6">
        <h4 className="font-medium mb-3 text-gray-500">
          📊 Overview (Last 7 Days)
        </h4>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="profit"
              stroke="#3b82f6"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mb-6">
        <h4 className="font-medium mb-3 text-gray-500">📈 Statistics</h4>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Total Profit</div>
            <div className="text-2xl font-bold text-green-600">
              ${agent.performance.totalProfit}
            </div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Success Rate</div>
            <div className="text-2xl font-bold text-blue-600">
              {agent.performance.successRate}%
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Avg Profit</div>
            <div className="text-2xl font-bold text-purple-600">
              ${agent.performance.avgProfit}
            </div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Best Trade</div>
            <div className="text-2xl font-bold text-yellow-600">
              ${agent.performance.bestTrade}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h4 className="font-medium mb-3 text-gray-500">
          🎯 Strategy Breakdown
        </h4>
        <div className="space-y-3">
          {agent.strategies.map((strategy) => (
            <div key={strategy.id} className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-400">
                    {strategy.name}
                  </span>
                  <span className="text-sm text-green-600 font-medium">
                    +${strategy.profit.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${strategy.successRate}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600">
                    {strategy.successRate}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-medium mb-3 text-gray-500">⏱️ Activity Heatmap</h4>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex gap-2 text-xs mb-2">
            <span className="w-12"></span>
            {["00", "06", "12", "18", "24"].map((hour) => (
              <span key={hour} className="flex-1 text-center text-gray-600">
                {hour}
              </span>
            ))}
          </div>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => (
            <div key={day} className="flex gap-2 items-center mb-1">
              <span className="text-xs w-12 text-gray-600">{day}</span>
              <div className="flex-1 flex gap-1">
                {Array.from({ length: 24 }, (_, hour) => {
                  const active = hour >= 8 && hour <= 20 && i < 5;
                  return (
                    <div
                      key={hour}
                      className={`flex-1 h-6 rounded ${
                        active ? "bg-blue-500" : "bg-gray-200"
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
          <p className="text-xs text-gray-600 mt-2">
            (More active during market hours)
          </p>
        </div>
      </div>
    </div>
  );
};
