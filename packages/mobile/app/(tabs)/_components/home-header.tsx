import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import type { Child } from '@/constants/data';
import { colors } from '@/constants/theme';

/** Top bar: tappable child profile (opens the account hub) + notifications. */
export function HomeHeader({ child }: { child: Child }) {
  return (
    <View className="flex-row items-center justify-between py-3">
      <Link href="/children" asChild>
        <Pressable hitSlop={8} className="flex-row items-center gap-2">
          <Avatar uri={child.photo} size={34} />
          <Text className="text-lg font-bold text-foreground">{child.name}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </Pressable>
      </Link>
      <Pressable hitSlop={8}>
        <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
      </Pressable>
    </View>
  );
}
