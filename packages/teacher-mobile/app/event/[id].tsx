import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Loader } from '@/components/ui/loader';
import { useCalendarEvent, useMarkEventSeen, type EventDetail } from '@/data/calendar';
import { cn } from '@/lib/utils';

type IconName = ComponentProps<typeof Ionicons>['name'];

const PRIMARY = '#3B8FF3';
const PRIMARY_INK = '#2C6FD6';
const MUTED = '#8A8F99';

/** Primary identity header — the calendar feature colour. */
function Header({ title }: { title: string }) {
  const router = useRouter();
  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: PRIMARY }}>
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="flex-1 text-center text-lg font-bold text-white">{title}</Text>
        <View className="w-6" />
      </View>
    </SafeAreaView>
  );
}

/** One labelled fact in the event's info card. */
function InfoRow({
  icon,
  label,
  value,
  last,
}: {
  icon: IconName;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View className={cn('flex-row items-center gap-3 px-4 py-3', !last && 'border-b border-border')}>
      <View className="h-9 w-9 items-center justify-center rounded-full bg-sky">
        <Ionicons name={icon} size={17} color={PRIMARY_INK} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[11px] font-semibold uppercase text-muted">{label}</Text>
        <Text className="text-[15px] font-semibold text-foreground">{value}</Text>
      </View>
    </View>
  );
}

function audienceValue(event: EventDetail, wholeCenter: string): string {
  return event.audienceType === 'center' ? wholeCenter : event.scopeLabel;
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation('app');
  const { data: event, isPending } = useCalendarEvent(String(id), i18n.language);
  const markSeen = useMarkEventSeen(String(id));

  if (isPending) {
    return (
      <View className="flex-1 bg-background">
        <Header title={t('schedule.detail.title')} />
        <Loader />
      </View>
    );
  }

  if (!event) {
    return (
      <View className="flex-1 bg-background">
        <Header title={t('schedule.detail.title')} />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-sm text-muted">{t('schedule.detail.notFound')}</Text>
        </View>
      </View>
    );
  }

  const cancelled = event.status === 'cancelled';
  const seen = event.seenByMe || markSeen.isPending;

  return (
    <View className="flex-1 bg-background">
      <Header title={t('schedule.detail.title')} />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Title + status */}
        <View className="px-4 pb-1 pt-5">
          {cancelled ? (
            <View className="mb-2 self-start rounded-full bg-coral px-3 py-1">
              <Text className="text-xs font-bold text-coral-ink">{t('schedule.cancelled')}</Text>
            </View>
          ) : event.status === 'completed' ? (
            <View className="mb-2 self-start rounded-full bg-pill px-3 py-1">
              <Text className="text-xs font-semibold text-muted">
                {t('schedule.detail.completed')}
              </Text>
            </View>
          ) : null}
          <Text
            className={cn(
              'text-2xl font-extrabold leading-8',
              cancelled ? 'text-muted line-through' : 'text-foreground',
            )}>
            {event.title}
          </Text>
        </View>

        {/* Facts */}
        <View className="mx-4 mt-4 overflow-hidden rounded-2xl border border-border bg-card">
          <InfoRow
            icon="calendar-outline"
            label={t('schedule.detail.when')}
            value={`${event.dateLabel} · ${event.weekdayLabel}`}
          />
          <InfoRow
            icon="time-outline"
            label={t('schedule.detail.time')}
            value={event.allDay ? t('schedule.allDay') : event.timeLabel}
          />
          {event.locationText ? (
            <InfoRow
              icon="location-outline"
              label={t('schedule.detail.location')}
              value={event.locationText}
            />
          ) : null}
          {audienceValue(event, t('schedule.detail.wholeCenter')) ? (
            <InfoRow
              icon="people-outline"
              label={t('schedule.detail.audience')}
              value={audienceValue(event, t('schedule.detail.wholeCenter'))}
            />
          ) : null}
          <InfoRow
            icon="person-outline"
            label={t('schedule.detail.organizer')}
            value={event.organizerName}
            last
          />
        </View>

        {/* Description */}
        {event.description ? (
          <View className="mx-4 mt-4 rounded-2xl border border-border bg-card p-4">
            <Text className="mb-1.5 text-[11px] font-semibold uppercase text-muted">
              {t('schedule.detail.detailsLabel')}
            </Text>
            <Text className="text-[15px] leading-6 text-foreground">{event.description}</Text>
          </View>
        ) : null}

        {/* Cancellation reason */}
        {cancelled && event.cancellationReason ? (
          <View className="mx-4 mt-4 rounded-2xl bg-coral p-4">
            <Text className="mb-1 text-xs font-bold text-coral-ink">
              {t('schedule.detail.cancelledTitle')}
            </Text>
            <Text className="text-sm leading-5 text-foreground">{event.cancellationReason}</Text>
          </View>
        ) : null}

        {/* Acknowledge — the one thing a parent does with an event */}
        {!cancelled ? (
          <Pressable
            onPress={() => markSeen.mutate()}
            disabled={seen}
            className={cn(
              'mx-4 mb-8 mt-5 flex-row items-center justify-center gap-1.5 rounded-full py-3',
              seen ? 'bg-segment' : 'bg-primary',
            )}>
            <Ionicons
              name={seen ? 'checkmark-circle' : 'checkmark'}
              size={18}
              color={seen ? MUTED : '#FFFFFF'}
            />
            <Text className={cn('text-sm font-bold', seen ? 'text-muted' : 'text-white')}>
              {seen ? t('schedule.detail.seen') : t('schedule.detail.gotIt')}
            </Text>
          </Pressable>
        ) : (
          <View className="h-8" />
        )}
      </ScrollView>
    </View>
  );
}
