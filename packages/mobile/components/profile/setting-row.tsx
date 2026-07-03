import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';

import { cn } from '@/lib/utils';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Candy-accent tones for the row icon tile, mirroring the app palette. */
export type Tone = 'sky' | 'grape' | 'mint' | 'sunshine' | 'coral' | 'bubblegum';

const TONE: Record<Tone, { bg: string; ink: string }> = {
  sky: { bg: 'bg-sky', ink: '#3E8FE0' },
  grape: { bg: 'bg-grape', ink: '#7C5CD8' },
  mint: { bg: 'bg-mint', ink: '#46B06A' },
  sunshine: { bg: 'bg-sunshine', ink: '#F4A621' },
  coral: { bg: 'bg-coral', ink: '#E8674E' },
  bubblegum: { bg: 'bg-bubblegum', ink: '#EC5E92' },
};

/**
 * One tappable row in a settings group: a coloured icon tile, a label with an
 * optional hint, an optional trailing value, and a chevron. Rows stack inside a
 * rounded card; pass `last` to drop the divider on the final one.
 */
export function SettingRow({
  icon,
  tone,
  label,
  hint,
  value,
  onPress,
  last,
  danger,
}: {
  icon: IconName;
  tone: Tone;
  label: string;
  hint?: string;
  value?: string;
  onPress?: () => void;
  last?: boolean;
  danger?: boolean;
}) {
  const t = TONE[tone];
  return (
    <Pressable
      onPress={onPress}
      className={cn('flex-row items-center gap-3 bg-card px-4 py-3.5 active:bg-pill', !last && 'border-b border-border')}>
      <View className={cn('h-9 w-9 items-center justify-center rounded-xl', t.bg)}>
        <Ionicons name={icon} size={18} color={danger ? '#E8674E' : t.ink} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className={cn('text-[15px] font-semibold', danger ? 'text-coral-ink' : 'text-foreground')} numberOfLines={1}>
          {label}
        </Text>
        {hint ? (
          <Text className="mt-0.5 text-[12px] text-muted" numberOfLines={1}>
            {hint}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text className="max-w-[40%] text-[14px] text-muted" numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {onPress ? <Ionicons name="chevron-forward" size={18} color="#AEB4BE" /> : null}
    </Pressable>
  );
}

/** A small uppercase group heading above a settings card. */
export function SettingsGroupLabel({ children }: { children: string }) {
  return (
    <Text className="mb-2 ml-1 mt-5 text-[12px] font-bold uppercase tracking-wide text-muted">
      {children}
    </Text>
  );
}
