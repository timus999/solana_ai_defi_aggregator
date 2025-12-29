import { useState, useEffect } from "react";
import { MockDataGenerator, ActivityItem } from "@/lib/mockData2";
//
//
// Real-time activity hook with simulated updates
export const useRealtimeActivity = (agentId: string) => {
  const [activities, setActivities] = useState<ActivityItem[]>(
    MockDataGenerator.generateActivityFeed(5)
  );

  useEffect(() => {
    // Initial load is now handled by useState initialization.

    // Simulate real-time updates every 30 seconds
    const interval = setInterval(() => {
      const newActivity: ActivityItem = {
        id: MockDataGenerator.generateId("activity"),
        timestamp: Date.now(),
        type: MockDataGenerator.randomChoice<ActivityItem["type"]>([
          "analyzing",
          "waiting",
          "executing",
          "success",
        ]),
        message: MockDataGenerator.randomChoice([
          "Analyzing USDC-SOL spread...",
          "Trade executed successfully",
          "Waiting for better opportunity",
          "Monitoring market conditions",
        ]),
        badge: "Live",
      };

      setActivities((prev) => [newActivity, ...prev].slice(0, 20));
    }, 30000);

    return () => clearInterval(interval);
  }, [agentId]);

  return activities;
};
