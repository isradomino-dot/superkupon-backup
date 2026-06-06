import { useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { CouponCard } from "@/components/CouponCard";
import { MerchantPill } from "@/components/MerchantPill";
import { SearchBar } from "@/components/SearchBar";
import { listCoupons, listMerchants } from "@/lib/api";
import type { Coupon, MerchantWithCount } from "@/lib/types";
import { colors, radius, spacing, typography } from "@/lib/theme";

export default function HomeScreen() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [merchants, setMerchants] = useState<MerchantWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, m] = await Promise.all([
        listCoupons({ limit: 60 }),
        listMerchants(),
      ]);
      setCoupons(c);
      setMerchants(m);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <FlatList
      data={coupons}
      keyExtractor={(c) => String(c.id)}
      renderItem={({ item }) => <CouponCard coupon={item} />}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.brand[500]} />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>Kupon Digital Indonesia</Text>
            <Text style={styles.heroSubtitle}>
              Shopee · DANA · OVO · Tix ID · Tokopedia — aggregated tiap jam.
            </Text>
            <View style={{ marginTop: spacing.md }}>
              <SearchBar />
            </View>
          </View>

          {merchants.length > 0 && (
            <View style={{ marginTop: spacing.lg }}>
              <Text style={styles.sectionLabel}>MERCHANT</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.merchantRow}
              >
                {merchants.map((m) => (
                  <MerchantPill key={m.slug} merchant={m} />
                ))}
              </ScrollView>
            </View>
          )}

          <View style={{ marginTop: spacing.lg }}>
            <Text style={styles.sectionLabel}>KUPON TERBARU</Text>
          </View>
        </View>
      }
      ListEmptyComponent={
        !loading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {error ? "Gagal terhubung ke backend" : "Belum ada kupon"}
            </Text>
            <Text style={styles.emptyHint}>
              {error
                ? "Pastikan backend FastAPI jalan & set apiBase di app.json."
                : "Trigger scrape: POST /admin/scrape-all"}
            </Text>
          </View>
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
  header: {
    marginBottom: spacing.md,
  },
  hero: {
    backgroundColor: colors.brand[500],
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
  },
  heroSubtitle: {
    fontSize: 13,
    color: "#fff",
    opacity: 0.9,
    marginTop: spacing.xs,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  merchantRow: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  empty: {
    padding: spacing.xl,
    alignItems: "center",
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.text,
    textAlign: "center",
  },
  emptyHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
  },
});
