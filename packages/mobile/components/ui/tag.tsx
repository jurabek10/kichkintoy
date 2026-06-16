import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { Text, View } from 'react-native';

import { cn } from '@/lib/utils';

type TagProps = {
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  /** Background utility, e.g. "bg-coral". */
  className?: string;
  /** Text-colour utility, e.g. "text-coral-ink". */
  textClassName?: string;
};

/** Small rounded label pill with a leading icon (feed kinds, statuses). */
export function Tag({ label, icon, iconColor, className, textClassName }: TagProps) {
  return (
    <View className={cn('flex-row items-center gap-1 self-start rounded-full px-2 py-1', className)}>
      <Ionicons name={icon} size={13} color={iconColor} />
      <Text className={cn('text-xs font-bold', textClassName)}>{label}</Text>
    </View>
  );
}
