import { useLocalSearchParams } from "expo-router";
import { StockHistoryScreen } from "@/features/finance/StockHistoryScreen";

export default function StockHistoryRoute() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const raw = Array.isArray(id) ? id[0] : id;
  const productId = raw ? parseInt(raw, 10) : 0;

  return <StockHistoryScreen productId={productId} />;
}
