import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";

import { CouponCard } from "@/components/CouponCard";
import { getMerchant, listCoupons } from "@/lib/api";
import type { Coupon, Merchant } from "@/lib/types";
import { colors, radius, spacing, typography } from "@/lib/theme";

export default function MerchantScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const [m, c] = await Promise.all([
        getMerchant(slug),
        listCoupons({ merchant: slug, limit: 100 }),
      ]);
      setMerchant(m);
      setCoupons(c);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [slug]);

  if (loading && !merchant) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand[500]} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: merchant?.name ?? "Merchant" }} />
      <FlatList
        data={coupons}
        keyExtractor={(c) => String(c.id)}
        renderItem={({ item }) => <CouponCard coupon={item} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={load}
            tintColor={colors.brand[500]}
          />
        }
        ListHeaderComponent={
          merchant ? (
            <View style={styles.header}>
              <Text style={styles.title}>{merchant.name}</Text>
              <Text style={styles.subtitle}>
                {coupons.length} kupon aktif{merchant.website ? ` · ${merchant.website}` : ""}
              </Text>
            </View>
          ) : null
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    ...typography.h1,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
