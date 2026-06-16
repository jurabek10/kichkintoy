import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import '../global.css';
import '@/i18n';

export default function RootLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="children" options={{ presentation: 'modal' }} />
        <Stack.Screen name="profile-settings" />
        <Stack.Screen name="admission-documents" />
        <Stack.Screen name="find-center" />
        <Stack.Screen name="language" options={{ presentation: 'modal' }} />
        <Stack.Screen name="feature/[key]" />
        <Stack.Screen name="report/[id]" />
        <Stack.Screen name="notice/[id]" />
        <Stack.Screen name="album/[id]" />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
