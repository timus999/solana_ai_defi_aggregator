import { useState, useEffect } from "react";
import { MockDataGenerator } from "@/lib/mockData2";

export const useAgentData = (agentId?: string) => {
  const [data, setData] = useState<ReturnType<
    typeof MockDataGenerator.generateCompleteDataset
  > | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    const fetchData = async () => {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 500));
      const mockData = MockDataGenerator.generateCompleteDataset();
      setData(mockData);
      setLoading(false);
    };

    fetchData();
  }, [agentId]);

  const refreshData = () => {
    setLoading(true);
    const mockData = MockDataGenerator.generateCompleteDataset();
    setData(mockData);
    setLoading(false);
  };

  return { data, loading, refreshData };
};
