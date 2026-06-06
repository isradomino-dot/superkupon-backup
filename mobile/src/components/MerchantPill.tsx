import { Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";

import type { MerchantWithCount } from "@/lib/types";
import { colors, radius, spacing } from "@/lib/theme";

export function MerchantPill({ merchant }: { merchant: MerchantWithCount }) {
  return (
    <Link href={`/merchant/${merchant.slug}`} asChild>
      <Pressable style={styles.pill}>
        <Text style={styles.name}>{merchant.name}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{merchant.coupon_count}</Text>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "#fff",
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.bg,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
  },
  badgeText: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
