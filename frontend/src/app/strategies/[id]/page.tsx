import StrategyDetailView from "@/components/StrategyDetailView";
export default async function StrategyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await params;
  return <StrategyDetailView strategyAddress={id} />;
}
