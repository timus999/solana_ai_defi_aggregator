// "use client";

// import { useState } from "react";
// import { generateMockData } from "@/lib/mockData";
// import { Activity, Settings, TrendingUp, Target, Clock } from "lucide-react";
// import { AgentDashboard } from "@/components/agents/AgentDashboard";
// import { AgentActivityFeed } from "@/components/agents/AgentActivityFeed";
// import { AgentControlPanel } from "@/components/agents/AgentControlPanel";
// import { AgentPerformanceDashboard } from "@/components/agents/AgentPerformanceDashboard";
// import { DecisionExplanation } from "@/components/agents/DecisionExplanation";
// import { AuditTrail } from "@/components/agents/AuditTrail";

// export default function AgentsPage() {
//   const [activeTab, setActiveTab] = useState<
//     "dashboard" | "activity" | "control" | "performance" | "decision" | "audit"
//   >("dashboard");
//   const mockData = generateMockData();
//   const [selectedAgent] = useState(mockData.agents[0]);

//   const tabs = [
//     { id: "dashboard", label: "Dashboard", icon: Activity },
//     { id: "activity", label: "Activity Feed", icon: Activity },
//     { id: "control", label: "Control Panel", icon: Settings },
//     { id: "performance", label: "Performance", icon: TrendingUp },
//     { id: "decision", label: "Decisions", icon: Target },
//     { id: "audit", label: "Audit Trail", icon: Clock },
//   ];

//   return (
//     <div className="min-h-screen bg-gray-50 p-4">
//       <div className="max-w-7xl mx-auto">
//         <div className="mb-6">
//           <h1 className="text-3xl font-bold mb-2">AgentFlow AI Dashboard</h1>
//           <p className="text-gray-600">Manage your autonomous trading agents</p>
//         </div>

//         <div className="mb-6 bg-white rounded-lg shadow p-2">
//           <div className="flex gap-2 overflow-x-auto">
//             {tabs.map((tab) => {
//               const Icon = tab.icon;
//               return (
//                 <button
//                   key={tab.id}
//                   onClick={() => setActiveTab(tab.id as any)}
//                   className={`px-4 py-2 rounded-lg flex items-center gap-2 whitespace-nowrap transition-colors ${
//                     activeTab === tab.id
//                       ? "bg-blue-600 text-white"
//                       : "text-gray-700 hover:bg-gray-100"
//                   }`}
//                 >
//                   <Icon className="w-4 h-4" />
//                   {tab.label}
//                 </button>
//               );
//             })}
//           </div>
//         </div>

//         <div className="space-y-6">
//           {activeTab === "dashboard" && (
//             <AgentDashboard agents={mockData.agents} />
//           )}
//           {activeTab === "activity" && (
//             <AgentActivityFeed
//               agentId={selectedAgent.id}
//               activities={mockData.activityFeed}
//             />
//           )}
//           {activeTab === "control" && (
//             <AgentControlPanel
//               agent={selectedAgent}
//               onUpdate={(settings) => console.log("Updated:", settings)}
//             />
//           )}
//           {activeTab === "performance" && (
//             <AgentPerformanceDashboard
//               agent={selectedAgent}
//               chartData={mockData.performanceChart}
//             />
//           )}
//           {activeTab === "decision" && (
//             <DecisionExplanation decision={mockData.recentDecision} />
//           )}
//           {activeTab === "audit" && (
//             <AuditTrail executions={mockData.executions} />
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }
"use client";

import { useState, useEffect } from "react";
import { AgentDashboard } from "@/components/agents/AgentDashboard";
import { AgentActivityFeed } from "@/components/agents/AgentActivityFeed";
import { AgentControlPanel } from "@/components/agents/AgentControlPanel";
import { AgentPerformanceDashboard } from "@/components/agents/AgentPerformanceDashboard";
import { DecisionExplanation } from "@/components/agents/DecisionExplanation";
import { AuditTrail } from "@/components/agents/AuditTrail";
import { MockDataGenerator } from "@/lib/mockData2";
import { Activity, Settings, TrendingUp, Clock, Target } from "lucide-react";

type TabType =
  | "dashboard"
  | "activity"
  | "control"
  | "performance"
  | "decision"
  | "audit";

export default function AgentsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [mockData, setMockData] = useState<any>(
    MockDataGenerator.generateCompleteDataset()
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Simulate real-time updates every 30 seconds
    const interval = setInterval(() => {
      const newActivity = {
        id: MockDataGenerator.generateId("activity"),
        timestamp: Date.now(),
        type: MockDataGenerator.randomChoice([
          "analyzing",
          "waiting",
          "executing",
          "success",
        ]),
        message: "New activity detected",
        badge: "Live",
      };

      setMockData((prev: any) => ({
        ...prev,
        activityFeed: [newActivity, ...prev.activityFeed].slice(0, 20),
      }));
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (loading || !mockData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading agents...</p>
        </div>
      </div>
    );
  }

  const selectedAgent = mockData.agents[0];

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: Activity },
    { id: "activity", label: "Activity Feed", icon: Activity },
    { id: "control", label: "Control Panel", icon: Settings },
    { id: "performance", label: "Performance", icon: TrendingUp },
    { id: "decision", label: "Decisions", icon: Target },
    { id: "audit", label: "Audit Trail", icon: Clock },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6 mx-auto rounded-2xl ">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 gradient-text">
            AI Agent Dashboard
          </h1>
          <p className="text-gray-600">
            Monitor and control your autonomous trading agents
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white mb-6 rounded-lg shadow p-2 ">
          <div className="flex gap-2 overflow-x-auto ">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === "dashboard" && (
            <AgentDashboard agents={mockData.agents} />
          )}
          {activeTab === "activity" && (
            <AgentActivityFeed
              agentId={selectedAgent.id}
              activities={mockData.activityFeed}
            />
          )}
          {activeTab === "control" && (
            <AgentControlPanel
              agent={selectedAgent}
              onUpdate={(settings) => {
                console.log("Updated settings:", settings);
                // Here you would call your Solana program to update settings
              }}
            />
          )}
          {activeTab === "performance" && (
            <AgentPerformanceDashboard
              agent={selectedAgent}
              chartData={mockData.performanceChart}
            />
          )}
          {activeTab === "decision" && (
            <DecisionExplanation decision={mockData.decision} />
          )}
          {activeTab === "audit" && (
            <AuditTrail executions={mockData.executions} />
          )}
        </div>
      </div>
    </div>
  );
}
