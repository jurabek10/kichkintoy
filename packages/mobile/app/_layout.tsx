import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

import '../global.css';
import '@/i18n';
import { Loader } from '@/components/ui/loader';
import { AuthProvider, useAuth } from '@/lib/auth';
import { queryClient } from '@/lib/query';
import { useRealtimeNotifications } from '@/lib/use-realtime-notifications';

function RootNavigator() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  useRealtimeNotifications(session);

  // Redirect between the auth screen and the app based on the session.
  useEffect(() => {
    if (loading) return;
    const onAuthScreen = segments[0] === 'login' || segments[0] === 'signup';
    if (!session && !onAuthScreen) router.replace('/login');
    else if (session && onAuthScreen) router.replace('/(tabs)');
  }, [session, loading, segments, router]);

  if (loading) {
    return (
      <View className="flex-1 bg-background">
        <Loader />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="children" options={{ presentation: 'modal' }} />
      <Stack.Screen name="profile-settings" />
      <Stack.Screen name="admission-documents" />
      <Stack.Screen name="find-center" />
      <Stack.Screen name="language" options={{ presentation: 'modal' }} />
      <Stack.Screen name="feature/[key]" />
      <Stack.Screen name="report/[id]" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="notice/[id]" />
      <Stack.Screen name="album/[id]" />
      <Stack.Screen name="meals" />
      <Stack.Screen name="attendance" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RootNavigator />
        <StatusBar style="dark" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
