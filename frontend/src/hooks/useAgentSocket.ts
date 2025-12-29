import { useEffect, useState } from "react";

interface WebSocketMessage {
  type: "execution" | "status_change" | "activity" | "performance_update";
  data: any;
}

export const useAgentWebSocket = (agentId: string) => {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);

  useEffect(() => {
    // In production, connect to your WebSocket server
    // const ws = new WebSocket('wss://your-api.com/agents/' + agentId);

    // For demo, simulate WebSocket with setInterval
    const interval = setInterval(() => {
      const mockMessage: WebSocketMessage = {
        type: "activity",
        data: {
          timestamp: Date.now(),
          message: "Simulated real-time activity",
          type: "analyzing",
        },
      };

      setMessages((prev) => [...prev, mockMessage].slice(-50));
    }, 5000);

    setConnected(true);

    return () => {
      clearInterval(interval);
      setConnected(false);
    };
  }, [agentId]);

  return { connected, messages };
};
