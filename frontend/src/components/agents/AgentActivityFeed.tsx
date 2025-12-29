import { ActivityItem } from "@/types/agent";
import { Activity } from "lucide-react";
export const AgentActivityFeed: React.FC<{
  agentId: string;
  activities: ActivityItem[];
}> = ({ activities }) => {
  const getBadgeColor = (type: ActivityItem["type"]) => {
    const colors = {
      analyzing: "bg-blue-100 text-blue-800",
      waiting: "bg-yellow-100 text-yellow-800",
      executing: "bg-purple-100 text-purple-800",
      success: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      skipped: "bg-gray-100 text-gray-800",
    };
    return colors[type];
  };

  const getIcon = (type: ActivityItem["type"]) => {
    const icons = {
      analyzing: "⚡",
      waiting: "⏱️",
      executing: "🔄",
      success: "✅",
      failed: "❌",
      skipped: "⏭️",
    };
    return icons[type];
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5" />
        Real-Time Activity Feed
      </h3>
      <div className="space-y-3">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
          >
            <span className="text-2xl">{getIcon(activity.type)}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-500">
                  {formatTime(activity.timestamp)}
                </span>
                {activity.badge && (
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${getBadgeColor(
                      activity.type
                    )}`}
                  >
                    {activity.badge}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-700">{activity.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
