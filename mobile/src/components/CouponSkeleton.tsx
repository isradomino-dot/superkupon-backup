import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { colors, radius, spacing } from "@/lib/theme";

export function CouponSkeleton() {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.card, { opacity }]}>
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={[styles.bar, { width: 70, height: 10 }]} />
          <View style={[styles.bar, { width: "85%", height: 14 }]} />
        </View>
        <View style={[styles.badge]} />
      </View>
      <View style={{ gap: 6, marginTop: spacing.md }}>
        <View style={[styles.bar, { width: "100%" }]} />
        <View style={[styles.bar, { width: "65%" }]} />
      </View>
      <View style={styles.codeBox} />
    </Animated.View>
  );
}

export function CouponSkeletonList({ count = 4 }: { count?: number }) {
  return (
    <View style={{ gap: spacing.md }}>
      {Array.from({ length: count }).map((_, i) => (
        <CouponSkeleton key={i} />
      ))}
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
    gap: spacing.sm,
  },
  header: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderStyle: "dashed",
  },
  badge: {
    width: 64,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: "#e5e7eb",
  },
  bar: {
    height: 10,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
  },
  codeBox: {
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#e5e7eb",
    marginTop: spacing.sm,
  },
});
