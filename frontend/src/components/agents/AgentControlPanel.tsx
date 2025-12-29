import { Agent, AgentSettings } from "@/types/agent";
import { useState } from "react";
import { Settings } from "lucide-react";

export const AgentControlPanel: React.FC<{
  agent: Agent;
  onUpdate: (settings: AgentSettings) => void;
}> = ({ agent, onUpdate }) => {
  const [settings, setSettings] = useState(agent.settings);

  const handleSave = () => {
    onUpdate(settings);
    alert("Settings saved successfully!");
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">
        AGENT SETTINGS: {agent.name}
      </h3>

      <div className="space-y-6">
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            ⚙️ Execution Parameters
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Check Interval (seconds)
              </label>
              <input
                type="number"
                value={settings.checkInterval}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    checkInterval: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Max Position ($)
              </label>
              <input
                type="number"
                value={settings.maxPosition}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxPosition: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Daily Loss Limit ($)
              </label>
              <input
                type="number"
                value={settings.dailyLossLimit}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    dailyLossLimit: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Cooldown Period (min)
              </label>
              <input
                type="number"
                value={settings.cooldownPeriod}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    cooldownPeriod: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h4 className="font-medium mb-3">🎚️ Risk Management</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                Risk Level
              </label>
              <div className="flex gap-3">
                {(["low", "medium", "high"] as const).map((level) => (
                  <label
                    key={level}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="riskLevel"
                      value={level}
                      checked={settings.riskLevel === level}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          riskLevel: e.target.value as any,
                        })
                      }
                      className="w-4 h-4"
                    />
                    <span className="capitalize">{level}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Confidence Min (%)
                </label>
                <input
                  type="number"
                  value={settings.confidenceMin}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      confidenceMin: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Max Slippage (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.maxSlippage}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      maxSlippage: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Min Profit (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.minProfit}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      minProfit: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h4 className="font-medium mb-3">🔔 Notifications</h4>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4" />
              <span className="text-sm">Email on large profits (&gt;$50)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4" />
              <span className="text-sm">SMS on errors</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4" />
              <span className="text-sm">
                Discord webhook for all executions
              </span>
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            onClick={handleSave}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            💾 Save Changes
          </button>
          <button
            onClick={() => setSettings(agent.settings)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            🔄 Reset to Default
          </button>
        </div>
      </div>
    </div>
  );
};
