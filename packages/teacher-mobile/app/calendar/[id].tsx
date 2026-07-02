import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ComponentProps, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Loader } from '@/components/ui/loader';
import { colors } from '@/constants/theme';
import { useCancelEvent, useStaffCalendarEvent, type StaffEventDetail } from '@/data/calendar';
import { cn } from '@/lib/utils';

type IconName = ComponentProps<typeof Ionicons>['name'];

const PRIMARY = '#3B8FF3';
const PRIMARY_INK = '#2C6FD6';

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

function InfoRow({ icon, label, value, last }: { icon: IconName; label: string; value: string; last?: boolean }) {
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

/** Bottom-sheet to cancel an event with an optional reason parents will see. */
function CancelSheet({
  open,
  pending,
  onClose,
  onConfirm,
}: {
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const { t } = useTranslation('calendar');
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState('');

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="rounded-t-3xl bg-card px-4 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
          <View className="mb-3 items-center">
            <View className="h-1 w-10 rounded-full bg-segment" />
          </View>
          <Text className="text-base font-extrabold text-foreground">{t('detail.cancelTitle')}</Text>
          <Text className="mt-0.5 text-[13px] text-muted">{t('detail.cancelDescription')}</Text>
          <Text className="mb-1.5 mt-4 text-[13px] font-semibold text-muted">{t('detail.reason')}</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            maxLength={500}
            multiline
            placeholderTextColor={colors.textMuted}
            className="min-h-[72px] rounded-md border border-border bg-background p-3 text-[15px] text-foreground"
          />
          <Pressable
            onPress={() => onConfirm(reason)}
            disabled={pending}
            className="mt-4 h-12 flex-row items-center justify-center gap-1.5 rounded-md bg-coral">
            {pending ? (
              <ActivityIndicator size="small" color="#E8674E" />
            ) : (
              <Ionicons name="close-circle-outline" size={18} color="#E8674E" />
            )}
            <Text className="text-[15px] font-bold text-coral-ink">{t('detail.cancelButton')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function audienceValue(event: StaffEventDetail, wholeCenter: string): string {
  return event.audienceType === 'center' ? wholeCenter : event.scopeLabel;
}

export default function CalendarEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = String(id);
  const { t, i18n } = useTranslation('calendar');
  const router = useRouter();
  const { data: event, isPending } = useStaffCalendarEvent(eventId, i18n.language);
  const cancel = useCancelEvent(eventId);
  const [cancelOpen, setCancelOpen] = useState(false);

  if (isPending) {
    return (
      <View className="flex-1 bg-background">
        <Header title={t('title')} />
        <Loader />
      </View>
    );
  }

  if (!event) {
    return (
      <View className="flex-1 bg-background">
        <Header title={t('title')} />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-sm text-muted">{t('detail.notFound')}</Text>
        </View>
      </View>
    );
  }

  const cancelled = event.status === 'cancelled';
  const completed = event.status === 'completed';
  const audience = audienceValue(event, t('audience.wholeCenter'));

  return (
    <View className="flex-1 bg-background">
      <Header title={t('title')} />

      <ScrollView className="flex-1" contentContainerClassName="pb-10" showsVerticalScrollIndicator={false}>
        {/* Title + status */}
        <View className="px-4 pb-1 pt-5">
          {cancelled ? (
            <View className="mb-2 self-start rounded-full bg-coral px-3 py-1">
              <Text className="text-xs font-bold text-coral-ink">{t('status.cancelled')}</Text>
            </View>
          ) : completed ? (
            <View className="mb-2 self-start rounded-full bg-pill px-3 py-1">
              <Text className="text-xs font-semibold text-muted">{t('detail.completed')}</Text>
            </View>
          ) : null}
          <Text className={cn('text-2xl font-extrabold leading-8', cancelled ? 'text-muted line-through' : 'text-foreground')}>
            {event.title}
          </Text>
          <Text className="mt-1.5 text-[13px] text-muted">
            {t('detail.seenCount', { count: event.seenCount })}
          </Text>
        </View>

        {/* Facts */}
        <View className="mx-4 mt-4 overflow-hidden rounded-2xl border border-border bg-card">
          <InfoRow icon="calendar-outline" label={t('detail.when')} value={`${event.dateLabel} · ${event.weekdayLabel}`} />
          <InfoRow icon="time-outline" label={t('detail.time')} value={event.allDay ? t('allDay') : event.timeLabel} />
          {event.locationText ? (
            <InfoRow icon="location-outline" label={t('detail.location')} value={event.locationText} />
          ) : null}
          {audience ? <InfoRow icon="people-outline" label={t('detail.audience')} value={audience} /> : null}
          <InfoRow icon="person-outline" label={t('detail.organizer')} value={event.organizerName} last />
        </View>

        {/* Description */}
        {event.description ? (
          <View className="mx-4 mt-4 rounded-2xl border border-border bg-card p-4">
            <Text className="mb-1.5 text-[11px] font-semibold uppercase text-muted">{t('detail.details')}</Text>
            <Text className="text-[15px] leading-6 text-foreground">{event.description}</Text>
          </View>
        ) : null}

        {/* Cancellation reason */}
        {cancelled && event.cancellationReason ? (
          <View className="mx-4 mt-4 rounded-2xl bg-coral p-4">
            <Text className="mb-1 text-xs font-bold text-coral-ink">{t('detail.cancelledTitle')}</Text>
            <Text className="text-sm leading-5 text-foreground">{event.cancellationReason}</Text>
          </View>
        ) : null}

        {/* Manage */}
        {!cancelled ? (
          <View className="mx-4 mt-6 flex-row gap-2">
            <Pressable
              onPress={() => router.push({ pathname: '/calendar/new', params: { eventId } })}
              className="h-12 flex-1 flex-row items-center justify-center gap-1.5 rounded-md bg-primary px-2">
              <Ionicons name="create-outline" size={18} color="#FFFFFF" />
              <Text numberOfLines={1} className="shrink text-[15px] font-bold text-white">{t('detail.edit')}</Text>
            </Pressable>
            <Pressable
              onPress={() => setCancelOpen(true)}
              className="h-12 flex-1 flex-row items-center justify-center gap-1.5 rounded-md border border-coral-ink/30 bg-coral px-2">
              <Ionicons name="close-circle-outline" size={18} color="#E8674E" />
              <Text numberOfLines={1} className="shrink text-[15px] font-bold text-coral-ink">{t('detail.cancelButton')}</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <CancelSheet
        open={cancelOpen}
        pending={cancel.isPending}
        onClose={() => setCancelOpen(false)}
        onConfirm={(reason) =>
          cancel.mutate(reason, {
            onSuccess: () => setCancelOpen(false),
          })
        }
      />
    </View>
  );
}
