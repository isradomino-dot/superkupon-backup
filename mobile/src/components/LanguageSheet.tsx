import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { LOCALES, LOCALE_META, useI18n, type Locale } from "@/i18n";
import { colors, radius, spacing } from "@/lib/theme";

export function LanguageSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { locale, setLocale, t } = useI18n();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>{t("language.change")}</Text>
          {LOCALES.map((l) => (
            <Pressable
              key={l}
              style={[styles.row, l === locale && styles.rowActive]}
              onPress={() => {
                setLocale(l as Locale);
                onClose();
              }}
            >
              <Text style={styles.flag}>{LOCALE_META[l].flag}</Text>
              <Text style={styles.label}>{LOCALE_META[l].name}</Text>
              {l === locale && <Text style={styles.check}>✓</Text>}
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    padding: spacing.lg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    gap: spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  rowActive: {
    backgroundColor: colors.brand[50],
  },
  flag: {
    fontSize: 22,
  },
  label: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  check: {
    color: colors.brand[600],
    fontWeight: "700",
  },
});
