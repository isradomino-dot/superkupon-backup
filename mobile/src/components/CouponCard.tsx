import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { Link } from "expo-router";

import type { Coupon } from "@/lib/types";
import { formatDiscount, formatExpiry } from "@/lib/api";
import { colors, radius, spacing, typography } from "@/lib/theme";

export function CouponCard({ coupon }: { coupon: Coupon }) {
  return (
    <Link href={`/coupon/${coupon.id}`} asChild>
      <Pressable style={styles.card}>
        <View style={styles.header}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.merchant}>{coupon.merchant.name.toUpperCase()}</Text>
            <Text numberOfLines={2} style={styles.title}>
              {coupon.title}
            </Text>
          </View>
          <View style={styles.discountBadge}>
            <Text style={styles.discountLabel}>DISKON</Text>
            <Text style={styles.discountValue}>{formatDiscount(coupon)}</Text>
          </View>
        </View>

        {!!coupon.description && (
          <Text numberOfLines={2} style={styles.description}>
            {coupon.description}
          </Text>
        )}

        <View style={styles.footer}>
          <Text style={styles.expiry}>⏰ {formatExpiry(coupon.expires_at)}</Text>
          {coupon.category && (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>{coupon.category.name}</Text>
            </View>
          )}
        </View>

        {!!coupon.code && <CodeRow code={coupon.code} />}
      </Pressable>
    </Link>
  );
}

function CodeRow({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <View style={styles.codeRow}>
      <Text style={styles.codeText}>{code}</Text>
      <Pressable
        style={styles.copyBtn}
        onPress={async () => {
          await Clipboard.setStringAsync(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        <Text style={styles.copyBtnText}>{copied ? "✓ Tersalin" : "Salin"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  header: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
  },
  merchant: {
    ...typography.caption,
    color: colors.brand[600],
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.xs,
  },
  discountBadge: {
    backgroundColor: colors.brand[50],
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignItems: "flex-end",
    minWidth: 70,
  },
  discountLabel: {
    fontSize: 9,
    color: colors.brand[600],
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  discountValue: {
    fontSize: 13,
    color: colors.brand[700],
    fontWeight: "700",
  },
  description: {
    ...typography.body,
    color: colors.textMuted,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  expiry: {
    ...typography.caption,
    color: colors.textMuted,
  },
  categoryPill: {
    backgroundColor: colors.bg,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  categoryText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.brand[400],
    borderStyle: "dashed",
    backgroundColor: colors.brand[50],
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  codeText: {
    flex: 1,
    fontFamily: "monospace",
    fontSize: 14,
    fontWeight: "700",
    color: colors.brand[700],
    letterSpacing: 1,
  },
  copyBtn: {
    backgroundColor: colors.brand[500],
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  copyBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
});
