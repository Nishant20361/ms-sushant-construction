import { useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { CatalogueHeader } from "./components/CatalogueHeader";
import { CartToast } from "./components/CartToast";
import { ProductGrid } from "./components/ProductGrid";
import { useAddToCartFeedback } from "./hooks/useAddToCartFeedback";
import { PRODUCT_PAGE_SIZE, useProducts } from "./hooks/useProducts";
import { publicApi } from "@/services/publicApi";
import { queryKeys } from "@/services/queryKeys";
import type { ProductSort } from "@/types/api";
import { theme } from "@/theme";

export default function CategoryProductsScreen() {
  const { slug = "" } = useLocalSearchParams<{ slug: string }>();
  const [sort, setSort] = useState<ProductSort>("newest");
  const [inStock, setInStock] = useState(false);
  const params = useMemo(() => ({ category: slug, sort, inStock: inStock || undefined, limit: PRODUCT_PAGE_SIZE }), [inStock, slug, sort]);
  const query = useProducts(params, Boolean(slug));
  const categories = useQuery({ queryKey: queryKeys.categories, queryFn: ({ signal }) => publicApi.getCategories(signal), staleTime: 30 * 60 * 1000 });
  const categoryName = categories.data?.categories.find((category) => category.slug === slug)?.name || slug.replace(/-/g, " ");
  const cart = useAddToCartFeedback();
  return <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: theme.colors.background }}><ProductGrid products={query.products} total={query.total} loading={query.isPending} error={query.isError} refreshing={query.isRefetching && !query.isFetchingNextPage} fetchingNext={query.isFetchingNextPage} hasNext={Boolean(query.hasNextPage)} onRefresh={() => void query.refetch()} onRetry={() => void query.refetch()} onEndReached={() => void query.fetchNextPage()} onAdd={cart.addProduct} emptyMessage="No products are available in this category right now." header={<CatalogueHeader title={categoryName} subtitle="Products in this category" sort={sort} inStock={inStock} onSort={setSort} onInStock={setInStock} />} /><CartToast message={cart.message} /></SafeAreaView>;
}
