import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import type { Child } from '@/constants/data';
import { colors } from '@/constants/theme';
import { useUnreadNotificationsCount } from '@/data/notifications';

/** Top bar: tappable child profile (opens the account hub) + notifications. */
export function HomeHeader({ child }: { child: Child }) {
  const unread = useUnreadNotificationsCount();
  const count = unread.data;

  return (
    <View className="flex-row items-center justify-between py-3">
      <Link href="/children" asChild>
        <Pressable hitSlop={8} className="flex-row items-center gap-2">
          <Avatar uri={child.photo} size={34} />
          <Text className="text-lg font-bold text-foreground">{child.name}</Text>
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
