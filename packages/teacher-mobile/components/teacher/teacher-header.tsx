import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useUnreadNotificationsCount } from '@/data/notifications';
import { useAuth } from '@/lib/auth';

/** Top bar: tappable teacher identity (opens the account hub) + notifications. */
export function TeacherHeader() {
  const { session } = useAuth();
  const unread = useUnreadNotificationsCount();
  const count = unread.data;

  const fullName = session?.user.fullName ?? '';
  const initial = fullName.trim().charAt(0).toUpperCase() || '·';

  return (
    <View className="flex-row items-center justify-between py-3">
      <Link href="/children" asChild>
        <Pressable hitSlop={8} className="flex-row items-center gap-2">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-header-blue">
            <Text className="text-base font-extrabold text-white">{initial}</Text>
          </View>
          <Text className="text-lg font-bold text-foreground">{fullName}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </Pressable>
      </Link>
      <Link href="/notifications" asChild>
        <Pressable hitSlop={8} className="relative h-10 w-10 items-center justify-center">
          <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
          {count > 0 ? (
            <View className="absolute right-0 top-0 min-w-5 items-center justify-center rounded-full bg-coral-ink px-1.5 py-0.5">
              <Text className="text-[10px] font-extrabold text-white">{count > 99 ? '99+' : count}</Text>
            </View>
          ) : null}
        </Pressable>
      </Link>
    </View>
  );
}
