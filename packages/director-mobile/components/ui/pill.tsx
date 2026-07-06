import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { Pressable, Text } from 'react-native';

import { colors } from '@/constants/theme';

type PillProps = {
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  onPress?: () => void;
};

/** Outlined action chip (e.g. the per-child "Memories" / "Add center"). */
export function Pill({ label, icon, onPress }: PillProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5">
      <Ionicons name={icon} size={14} color={colors.textSecondary} />
      <Text className="text-[13px] font-semibold text-muted">{label}</Text>
    </Pressable>
  );
}
