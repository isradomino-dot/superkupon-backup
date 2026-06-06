import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Stack, useLocalSearchParams } from "expo-router";

import { formatDiscount, formatExpiry, getCoupon } from "@/lib/api";
import type { Coupon } from "@/lib/types";
import { colors, radius, spacing, typography } from "@/lib/theme";

export default function CouponDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getCoupon(Number(id))
      .then(setCoupon)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand[500]} />
      </View>
    );
  }

  if (!coupon) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.textMuted }}>Kupon tidak ditemukan.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: coupon.merchant.name }} />

      <View style={styles.hero}>
        <Text style={styles.merchant}>{coupon.merchant.name.toUpperCase()}</Text>
        <Text style={styles.title}>{coupon.title}</Text>
        <Text style={styles.discount}>{formatDiscount(coupon)}</Text>
      </View>

      {!!coupon.description && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SYARAT & KETENTUAN</Text>
          <Text style={styles.body}>{coupon.description}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>RINGKASAN</Text>
        <Row label="Berlaku s/d" value={formatExpiry(coupon.expires_at)} />
        {coupon.min_spend != null && (
          <Row label="Min. belanja" value={`Rp ${coupon.min_spend.toLocaleString("id-ID")}`} />
        )}
        {coupon.max_discount != null && (
          <Row label="Maks. diskon" value={`Rp ${coupon.max_discount.toLocaleString("id-ID")}`} />
        )}
        {coupon.category && <Row label="Kategori" value={coupon.category.name} />}
        <Row label="Sumber" value={coupon.source_target} />
      </View>

      {!!coupon.code && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>KODE KUPON</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{coupon.code}</Text>
            <Pressable
              style={styles.copyBtn}
              onPress={async () => {
                await Clipboard.setStringAsync(coupon.code!);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              <Text style={styles.copyBtnText}>{copied ? "✓ Tersalin" : "Salin"}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {!!coupon.source_url && (
        <Pressable
          style={styles.cta}
          onPress={() => Linking.openURL(coupon.source_url!)}
        >
          <Text style={styles.ctaText}>Buka di {coupon.merchant.name}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    backgroundColor: colors.brand[500],
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  merchant: {
    fontSize: 11,
    color: "#fff",
    opacity: 0.9,
    fontWeight: "600",
    letterSpacing: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
  },
  discount: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    marginTop: spacing.sm,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.body,
    color: colors.text,
    lineHeight: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: {
    ...typography.body,
    color: colors.textMuted,
  },
  rowValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: "600",
  },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.brand[400],
    borderStyle: "dashed",
    backgroundColor: colors.brand[50],
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  codeText: {
    flex: 1,
    fontFamily: "monospace",
    fontSize: 18,
    fontWeight: "700",
    color: colors.brand[700],
    letterSpacing: 2,
  },
  copyBtn: {
    backgroundColor: colors.brand[500],
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  copyBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  cta: {
    backgroundColor: colors.brand[600],
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  ctaText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});
