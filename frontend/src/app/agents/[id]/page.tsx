"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { MockDataGenerator } from "@/lib/mockData2";
import { AgentPerformanceDashboard } from "@/components/agents/AgentPerformanceDashboard";
import { AgentActivityFeed } from "@/components/agents/AgentActivityFeed";
import { AuditTrail } from "@/components/agents/AuditTrail";
import { Play, Pause, Settings, Trash2 } from "lucide-react";

export default function AgentDetailPage() {
  const params = useParams();
  const [agent, setAgent] = useState<any>(() => {
    const agentId = params.id as string;
    if (agentId) {
      const mockAgent = MockDataGenerator.generateAgent("arbitrage", 0);
      mockAgent.id = agentId;
      return mockAgent;
    }
    return null;
  });

  const [executions] = useState<any[]>(() => {
    const agentId = params.id as string;
    if (agentId) {
      return MockDataGenerator.generateExecutions(50, agentId);
    }
    return [];
  });

  const [activities] = useState<any[]>(() =>
    MockDataGenerator.generateActivityFeed(20)
  );
  const [performanceData] = useState<any[]>(() =>
    MockDataGenerator.generatePerformanceChart(7)
  );

  if (!agent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const toggleAgent = () => {
    setAgent((prev: any) => ({
      ...prev,
      status: prev.status === "running" ? "paused" : "running",
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-4xl">🤖</span>
              <div>
                <h1 className="text-2xl font-bold">{agent.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      agent.status === "running"
                        ? "bg-green-500"
                        : "bg-yellow-500"
                    }`}
                  />
                  <span className="text-sm text-gray-600 capitalize">
                    {agent.status}
                  </span>
                  <span className="text-sm text-gray-400">•</span>
                  <span className="text-sm text-gray-600">
                    Agent ID: {agent.id}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={toggleAgent}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  agent.status === "running"
                    ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                    : "bg-green-100 text-green-700 hover:bg-green-200"
                }`}
              >
                {agent.status === "running" ? (
                  <>
                    <Pause className="w-4 h-4" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Resume
                  </>
                )}
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <button className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Total Profit</div>
              <div className="text-2xl font-bold text-green-600">
                ${agent.performance.totalProfit.toFixed(2)}
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Success Rate</div>
              <div className="text-2xl font-bold text-blue-600">
                {agent.performance.successRate}%
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Executions</div>
              <div className="text-2xl font-bold text-purple-600">
                {agent.performance.executions}
              </div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Avg Profit</div>
              <div className="text-2xl font-bold text-yellow-600">
                ${agent.performance.avgProfit.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <AgentPerformanceDashboard
              agent={agent}
              chartData={performanceData}
            />
          </div>
          <div className="space-y-6">
            <AgentActivityFeed agentId={agent.id} activities={activities} />
            <AuditTrail executions={executions.slice(0, 10)} />
          </div>
        </div>
      </div>
    </div>
  );
}
