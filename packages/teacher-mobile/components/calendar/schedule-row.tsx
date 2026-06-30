import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import type { EventItem, ScheduleItem } from '@/data/calendar';
import { parseIsoDate, weekdayShort } from '@/lib/date';
import { cn } from '@/lib/utils';

type IconName = ComponentProps<typeof Ionicons>['name'];

const MUTED = '#8A8F99';

/** Audience → leading icon + colour. The glyph says who the event is for, so
 *  the colour isn't carrying the meaning alone. */
const AUDIENCE: Record<string, { bg: string; ink: string; icon: IconName }> = {
  center: { bg: 'bg-sky', ink: '#3E8FE0', icon: 'business-outline' },
  class: { bg: 'bg-grape', ink: '#7C5CD8', icon: 'people-outline' },
  child: { bg: 'bg-mint', ink: '#46B06A', icon: 'happy-outline' },
};

/** The date anchor on the left of every row: big day number over weekday. */
function DateBlock({ date, lang }: { date: string; lang: string }) {
  const { day } = parseIsoDate(date);
  return (
    <View className="w-11 items-center">
      <Text className="text-lg font-extrabold leading-5 text-foreground">{day}</Text>
      <Text className="text-[10px] font-semibold uppercase text-muted" numberOfLines={1}>
        {weekdayShort(date, lang)}
      </Text>
    </View>
  );
}

/** Join the non-empty pieces of an event's context with a middle dot. */
function eventSubtitle(item: EventItem, allDayLabel: string): string {
  const time = item.allDay ? allDayLabel : item.timeLabel;
  return [time, item.scopeLabel, item.locationText].filter(Boolean).join(' · ');
}

/** One minimalist agenda row — borderless, separated by a hairline. Days already
 *  past are dimmed. Events are tappable through to their detail; birthdays are
 *  informational and stay put. */
export function ScheduleRow({
  item,
  lang,
  last,
}: {
  item: ScheduleItem;
  lang: string;
  last: boolean;
}) {
  const { t } = useTranslation('app');
  const rootClass = cn('flex-row items-center gap-3 py-3', !last && 'border-b border-border');
  const rootStyle = item.isPast ? { opacity: 0.4 } : undefined;

  if (item.kind === 'birthday') {
    return (
      <View style={rootStyle} className={rootClass}>
        <DateBlock date={item.date} lang={lang} />
        <View
          className={cn(
            'rounded-full border-2',
            item.isOwnChild ? 'border-coral-ink' : 'border-transparent',
          )}>
          <Avatar uri={item.photoUrl} size={38} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-[15px] font-bold text-foreground" numberOfLines={2}>
            {t('schedule.birthday', { name: item.childName })}
          </Text>
          <Text className="mt-0.5 text-xs font-semibold text-sunshine-ink">
            {t('schedule.turns', { age: item.turningAge })}
            {item.isOwnChild ? ` · ${t('schedule.yourChild')}` : ''}
          </Text>
        </View>
        <Text className="text-xl">🎂</Text>
      </View>
    );
  }

  const subtitle = eventSubtitle(item, t('schedule.allDay'));
  const cancelled = item.status === 'cancelled';

  return (
    <Link href={{ pathname: '/event/[id]', params: { id: item.id } }} asChild>
      <Pressable style={rootStyle} className={rootClass}>
        <DateBlock date={item.date} lang={lang} />
        <View
          className={cn(
            'h-[38px] w-[38px] items-center justify-center rounded-full',
            AUDIENCE[item.audienceType]?.bg ?? 'bg-pill',
          )}>
          <Ionicons
            name={AUDIENCE[item.audienceType]?.icon ?? 'calendar-outline'}
            size={19}
            color={AUDIENCE[item.audienceType]?.ink ?? MUTED}
          />
        </View>
        <View className="min-w-0 flex-1">
          <Text
            className={cn(
              'text-[15px] font-bold',
              cancelled ? 'text-muted line-through' : 'text-foreground',
            )}
            numberOfLines={2}>
            {item.title}
          </Text>
          {subtitle ? (
            <Text className="mt-0.5 text-xs text-muted" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {cancelled ? (
          <View className="rounded-full bg-coral px-2 py-0.5">
            <Text className="text-[10px] font-semibold text-coral-ink">
              {t('schedule.cancelled')}
            </Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={18} color={MUTED} />
        )}
      </Pressable>
    </Link>
  );
}
