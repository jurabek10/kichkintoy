import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ChildSwitcherSheet } from '@/components/home/child-switcher-sheet';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import type { Child } from '@/constants/data';
import { colors } from '@/constants/theme';
import { useUnreadNotificationsCount } from '@/data/notifications';
import { useParentChildren } from '@/data/profile';

/**
 * Top bar, Kidsnote-style: the selected kid's photo + name opens the kid
 * switcher (siblings may attend different kindergartens); My Page and
 * notifications sit on the right.
 */
export function HomeHeader({ child }: { child: Child }) {
  const unread = useUnreadNotificationsCount();
  const count = unread.data;
  const [switcherOpen, setSwitcherOpen] = useState(false);
  // The child's photo may be a media asset; listChildren resolves it correctly
  // (reports.parentChildren returns the raw asset id, which isn't a URL).
  const { data: editableChildren = [] } = useParentChildren();
  const editable = editableChildren.find((c) => c.id === child.id);

  return (
    <View className="flex-row items-center justify-between py-3">
      <Pressable
        hitSlop={8}
        onPress={() => setSwitcherOpen(true)}
        className="flex-row items-center gap-2">
        <ProfileAvatar
          avatarMediaAssetId={editable?.photoMediaAssetId ?? null}
          photoUrl={editable?.photoUrl ?? null}
          name={child.name}
          size={34}
          fallbackClassName="bg-sky"
          fallbackTextClassName="text-sky-ink"
        />
        <Text className="text-lg font-bold text-foreground">{child.name}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
      </Pressable>
      <View className="flex-row items-center gap-1">
        <Link href="/children" asChild>
          <Pressable hitSlop={8} className="h-10 w-10 items-center justify-center">
            <Ionicons name="person-circle-outline" size={26} color={colors.textPrimary} />
          </Pressable>
        </Link>
        <Link href="/notifications" asChild>
          <Pressable hitSlop={8} className="relative h-10 w-10 items-center justify-center">
            <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
            {count > 0 ? (
              <View className="absolute right-0 top-0 min-w-5 items-center justify-center rounded-full bg-coral-ink px-1.5 py-0.5">
                <Text className="text-[10px] font-extrabold text-white">
                  {count > 99 ? '99+' : count}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </Link>
      </View>

      <ChildSwitcherSheet open={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </View>
  );
}
