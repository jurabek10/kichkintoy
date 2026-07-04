import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { cn } from '@/lib/utils';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** One arrow of the pager. The direction you can move glows in the brand colour
 *  on a white bordered circle; the direction you can't recedes into flat pill
 *  grey — so "where can I go" reads instantly, not just as a dimmed icon. */
function PagerArrow({
  icon,
  disabled,
  onPress,
}: {
  icon: IconName;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => (pressed ? { opacity: 0.55 } : undefined)}
      className={cn(
        'h-10 w-10 items-center justify-center rounded-full border',
        disabled ? 'border-transparent bg-pill' : 'border-border bg-card',
      )}>
      <Ionicons name={icon} size={20} color={disabled ? colors.textMuted : colors.primary} />
    </Pressable>
  );
}

/** A compact, centered page control shared by every paginated list. Renders
 *  nothing for a single page. `page` is zero-based; `label` is already
 *  translated (each screen keeps its own wording). */
export function Pager({
  page,
  totalPages,
  onPage,
  label,
  className,
}: {
  page: number;
  totalPages: number;
  onPage: (next: number) => void;
  label: string;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  return (
    <View className={cn('flex-row items-center justify-center gap-2', className)}>
      <PagerArrow icon="chevron-back" disabled={page === 0} onPress={() => onPage(page - 1)} />
      <View className="min-w-[88px] items-center rounded-full bg-pill px-4 py-2">
        <Text className="text-[13px] font-bold text-foreground">{label}</Text>
      </View>
      <PagerArrow
        icon="chevron-forward"
        disabled={page >= totalPages - 1}
        onPress={() => onPage(page + 1)}
      />
    </View>
  );
}
