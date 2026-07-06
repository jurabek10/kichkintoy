import { ScrollView, Text, Pressable } from 'react-native';

import { cn } from '@/lib/utils';

export type FilterOption<T extends string> = { value: T; label: string };

/**
 * Horizontal row of selectable pills — the mobile stand-in for a web table's
 * status/segment filters. One option is always active; scrolls if it overflows.
 */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 px-4 py-3">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            className={cn(
              'rounded-full px-4 py-2',
              active ? 'bg-primary' : 'bg-card border border-border',
            )}>
            <Text className={cn('text-[13px] font-semibold', active ? 'text-white' : 'text-muted')}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
