import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { I18nProvider } from "@/i18n";
import { colors } from "@/lib/theme";

export default function RootLayout() {
  return (
    <I18nProvider>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.brand[500] },
            headerTintColor: "#fff",
            headerTitleStyle: { fontWeight: "700" },
            contentStyle: { backgroundColor: colors.bg },
            animation: "slide_from_right",
          }}
        >
          <Stack.Screen name="index" options={{ title: "SuperKupon" }} />
          <Stack.Screen name="merchant/[slug]" options={{ title: "Merchant" }} />
          <Stack.Screen name="coupon/[id]" options={{ title: "Detail Kupon" }} />
          <Stack.Screen name="search" options={{ title: "Pencarian" }} />
        </Stack>
      </SafeAreaProvider>
    </I18nProvider>
  );
}
