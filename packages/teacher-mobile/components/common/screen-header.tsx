import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/constants/theme';

type ScreenHeaderProps = {
  title: string;
  /** Show a back chevron on the left (for pushed screens). */
  back?: boolean;
  /** Optional trailing control (e.g. a "+" action), pinned to the right. */
  right?: ReactNode;
};

/** Plain (white) screen header used by tab roots and simple pushed screens. */
export function ScreenHeader({ title, back, right }: ScreenHeaderProps) {
  const router = useRouter();
  return (
    <View className="flex-row items-center gap-2 px-4 py-3">
      {back ? (
        <Pressable onPress={() => router.back()} hitSlop={8} className="-ml-2">
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
      ) : null}
      <Text className="flex-1 text-xl font-extrabold text-foreground">{title}</Text>
      {right}
    </View>
  );
}
