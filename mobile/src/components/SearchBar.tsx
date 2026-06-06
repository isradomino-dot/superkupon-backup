import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import { colors, radius, spacing } from "@/lib/theme";

export function SearchBar({ initial = "" }: { initial?: string }) {
  const [q, setQ] = useState(initial);

  const submit = () => {
    if (q.trim()) {
      router.push({ pathname: "/search", params: { q: q.trim() } });
    }
  };

  return (
    <View style={styles.row}>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Cari kupon, merchant, atau kode..."
        placeholderTextColor={colors.textMuted}
        onSubmitEditing={submit}
        returnKeyType="search"
        style={styles.input}
      />
      <Pressable style={styles.button} onPress={submit}>
        <Text style={styles.buttonText}>Cari</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    backgroundColor: colors.brand[500],
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});
