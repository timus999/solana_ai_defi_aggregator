import { Agent } from "@/types/agent";
import { useState } from "react";
export const useAgentStatus = (agentId: string) => {
  const [status, setStatus] = useState<Agent["status"]>("running");

  const toggleStatus = () => {
    setStatus((prev) => (prev === "running" ? "paused" : "running"));
  };

  return { status, toggleStatus };
};
