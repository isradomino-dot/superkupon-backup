import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { CouponCard } from "@/components/CouponCard";
import { SearchBar } from "@/components/SearchBar";
import { listCoupons } from "@/lib/api";
import type { Coupon } from "@/lib/types";
import { colors, spacing, typography } from "@/lib/theme";

export default function SearchScreen() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [results, setResults] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    listCoupons({ q, limit: 100 })
      .then(setResults)
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <FlatList
      data={results}
      keyExtractor={(c) => String(c.id)}
      renderItem={({ item }) => <CouponCard coupon={item} />}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={{ marginBottom: spacing.md }}>
          <SearchBar initial={q ?? ""} />
          {!!q && (
            <Text style={styles.summary}>
              {loading ? "Mencari..." : `${results.length} hasil untuk "${q}"`}
            </Text>
          )}
        </View>
      }
      ListEmptyComponent={
        !loading && q ? (
          <Text style={styles.empty}>Tidak ada kupon yang cocok.</Text>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  summary: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  empty: {
    textAlign: "center",
    color: colors.textMuted,
    padding: spacing.xl,
  },
});
