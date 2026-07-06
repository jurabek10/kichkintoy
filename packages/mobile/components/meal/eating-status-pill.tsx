import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { eatingStatusKey, type MealEatingStatus } from '@/data/meals';
import { cn } from '@/lib/utils';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** How the child ate, colour-coded so a parent reads it at a glance: a clean
 *  plate is mint, a picked-at one sunshine, an untouched one coral. */
const TONE: Record<Exclude<MealEatingStatus, 'notRecorded'>, { bg: string; text: string; icon: IconName; color: string }> = {
  ateAll: { bg: 'bg-mint', text: 'text-mint-ink', icon: 'checkmark-circle', color: '#46B06A' },
  ateMost: { bg: 'bg-mint', text: 'text-mint-ink', icon: 'checkmark-circle-outline', color: '#46B06A' },
  ateSome: { bg: 'bg-sunshine', text: 'text-sunshine-ink', icon: 'ellipse-outline', color: '#F4A621' },
  didNotEat: { bg: 'bg-coral', text: 'text-coral-ink', icon: 'close-circle', color: '#E8674E' },
};

/** The parent's headline signal — "how did my child eat". Renders nothing when
 *  nothing was recorded (there is no news to report). */
export function EatingStatusPill({ status, size = 'sm' }: { status: MealEatingStatus; size?: 'sm' | 'md' }) {
  const { t } = useTranslation('meals');
  if (status === 'notRecorded') return null;
  const tone = TONE[status];
  const iconSize = size === 'md' ? 15 : 13;

  return (
    <View className={cn('flex-row items-center gap-1 self-start rounded-full', tone.bg, size === 'md' ? 'px-3 py-1.5' : 'px-2.5 py-1')}>
      <Ionicons name={tone.icon} size={iconSize} color={tone.color} />
      <Text className={cn('font-bold', tone.text, size === 'md' ? 'text-[13px]' : 'text-[11px]')}>
        {t(eatingStatusKey(status))}
      </Text>
    </View>
  );
}
