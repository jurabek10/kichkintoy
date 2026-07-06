import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import type { CalendarAudienceType, CalendarReminderMinutes } from '@kichkintoy/shared';
import { DatePickerField } from '@/components/common/date-picker-field';
import { ScreenHeader } from '@/components/common/screen-header';
import { TimeField } from '@/components/calendar/time-field';
import { Card } from '@/components/ui/card';
import { colors } from '@/constants/theme';
import { useCalendarEventRaw, useCreateEvent, useUpdateEvent } from '@/data/calendar';
import { useCenterId, useTeacherClasses } from '@/data/teacher';
import { useAuth } from '@/lib/auth';
import { formatTime, localIsoDate, todayIsoDate } from '@/lib/date';
import { orpc } from '@/lib/orpc';
import { cn } from '@/lib/utils';

const PRIMARY = '#3B8FF3';
const UZ_OFFSET_H = 5; // lib/date renders in Uzbekistan wall-clock (UTC+5).

const REMINDERS = ['none', '60', '1440', '4320'] as const;

/** ISO instant for a UZ wall-clock date + "HH:mm". */
function toUzIso(date: string, time: string) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(Date.UTC(y!, (m ?? 1) - 1, d, (hh ?? 0) - UZ_OFFSET_H, mm ?? 0)).toISOString();
}

function parseReminder(value: string): CalendarReminderMinutes | null {
  if (value === '60') return 60;
  if (value === '1440') return 1440;
  if (value === '4320') return 4320;
  return null;
}

/** A tap-to-open bottom-sheet picker for a single choice. */
function PickerField({
  label,
  value,
  placeholder,
  options,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <View>
      <Text className="mb-1.5 text-[13px] font-semibold text-muted">{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        className="h-11 flex-row items-center justify-between rounded-md border border-border bg-background px-3">
        <Text numberOfLines={1} className={cn('flex-1 text-[15px]', current ? 'text-foreground' : 'text-muted-soft')}>
          {current ? current.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setOpen(false)}>
          <Pressable className="rounded-t-3xl bg-card px-4 pt-3" style={{ paddingBottom: insets.bottom + 12 }} onPress={() => {}}>
            <View className="mb-3 items-center">
              <View className="h-1 w-10 rounded-full bg-segment" />
            </View>
            <Text className="mb-1 text-base font-extrabold text-foreground">{label}</Text>
            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {options.length === 0 ? (
                <Text className="py-4 text-[14px] text-muted">{placeholder}</Text>
              ) : (
                options.map((o) => {
                  const active = value === o.value;
                  return (
                    <Pressable
                      key={o.value}
                      onPress={() => {
                        onChange(o.value);
                        setOpen(false);
                      }}
                      className="flex-row items-center justify-between py-3.5">
                      <Text className={cn('flex-1 text-[15px]', active ? 'font-bold text-primary' : 'text-foreground')}>
                        {o.label}
                      </Text>
                      {active ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export default function EventComposerScreen() {
  const params = useLocalSearchParams<{ eventId?: string }>();
  const eventId = params.eventId ?? '';
  const editing = !!eventId;

  const { t } = useTranslation('calendar');
  const router = useRouter();
  const centerId = useCenterId();
  const { session } = useAuth();
  const director = session?.user.role === 'director';

  const [audienceType, setAudienceType] = useState<CalendarAudienceType>(director ? 'center' : 'class');
  const [classId, setClassId] = useState('');
  const [childId, setChildId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationText, setLocationText] = useState('');
  const [date, setDate] = useState(todayIsoDate());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [reminder, setReminder] = useState('none');
  const [error, setError] = useState<string | null>(null);

  const classes = useTeacherClasses();
  const existing = useCalendarEventRaw(eventId);
  const create = useCreateEvent();
  const update = useUpdateEvent(eventId);

  const childrenQuery = useQuery({
    queryKey: ['teacher', 'event-children', centerId],
    queryFn: () => orpc.attendance.children({ centerId: centerId ?? '' }),
    enabled: !!centerId && audienceType === 'child',
  });

  // Prefill once when editing.
  const hydrated = useRef(false);
  useEffect(() => {
    const event = existing.data;
    if (!event || hydrated.current) return;
    hydrated.current = true;
    setAudienceType(event.audienceType);
    setClassId(event.classIds[0] ?? '');
    setChildId(event.childIds[0] ?? '');
    setTitle(event.title);
    setDescription(event.description ?? '');
    setLocationText(event.locationText ?? '');
    setDate(localIsoDate(event.startsAt));
    setAllDay(event.allDay);
    setStartTime(event.allDay ? '09:00' : formatTime(event.startsAt));
    setEndTime(event.endsAt ? formatTime(event.endsAt) : '');
    setReminder(event.reminderMinutesBefore ? String(event.reminderMinutesBefore) : 'none');
  }, [existing.data]);

  const audienceTabs: CalendarAudienceType[] = director ? ['center', 'class', 'child'] : ['class', 'child'];

  const classOptions = useMemo(
    () => classes.data.map((klass) => ({ value: klass.id, label: klass.name })),
    [classes.data],
  );
  const childOptions = useMemo(
    () =>
      (childrenQuery.data?.children ?? []).map((child) => ({
        value: child.id,
        label: child.className ? `${child.name} · ${child.className}` : child.name,
      })),
    [childrenQuery.data],
  );

  function pickAudience(value: CalendarAudienceType) {
    setAudienceType(value);
    setClassId('');
    setChildId('');
  }

  function save() {
    setError(null);
    if (!centerId) return setError(t('validation.centerRequired'));
    if (!title.trim()) return setError(t('validation.titleRequired'));
    if (audienceType === 'center' && !director) return setError(t('validation.directorOnly'));
    if (audienceType === 'class' && !classId) return setError(t('validation.classRequired'));
    if (audienceType === 'child' && !childId) return setError(t('validation.childRequired'));

    const startsAt = toUzIso(date, allDay ? '00:00' : startTime);
    const endsAt = !allDay && endTime ? toUzIso(date, endTime) : undefined;
    const payload = {
      audienceType,
      classIds: audienceType === 'class' && classId ? [classId] : undefined,
      childIds: audienceType === 'child' && childId ? [childId] : undefined,
      title: title.trim(),
      description: description.trim() || undefined,
      locationText: locationText.trim() || undefined,
      startsAt,
      endsAt,
      allDay,
      reminderMinutesBefore: parseReminder(reminder),
    };

    if (editing) {
      update.mutate(payload, {
        onSuccess: () => router.back(),
        onError: () => setError(t('validation.titleRequired')),
      });
    } else {
      create.mutate(
        { centerId, ...payload },
        {
          onSuccess: (saved) => router.replace({ pathname: '/calendar/[id]', params: { id: saved.id } }),
          onError: () => setError(t('validation.titleRequired')),
        },
      );
    }
  }

  const busy = create.isPending || update.isPending;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={editing ? t('composer.editTitle') : t('composer.newTitle')} back />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerClassName="gap-3 p-4 pb-10" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Title */}
          <Card className="gap-2">
            <Text className="text-[13px] font-semibold text-muted">{t('composer.title')}</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              maxLength={120}
              placeholderTextColor={colors.textMuted}
              className="h-11 rounded-md border border-border bg-background px-3 text-[15px] text-foreground"
            />
          </Card>

          {/* When */}
          <Card className="gap-3">
            <Text className="text-base font-extrabold text-foreground">{t('composer.date')}</Text>
            <DatePickerField value={date} onChange={setDate} label={t('composer.date')} />
            <View className="flex-row items-center justify-between">
              <Text className="text-[15px] font-semibold text-foreground">{t('composer.allDay')}</Text>
              <Switch
                value={allDay}
                onValueChange={setAllDay}
                trackColor={{ true: PRIMARY, false: colors.textMuted }}
                thumbColor="#FFFFFF"
              />
            </View>
            {!allDay ? (
              <View className="flex-row gap-3">
                <TimeField label={t('composer.startTime')} value={startTime} placeholder="09:00" doneLabel={t('detail.gotIt')} onChange={setStartTime} />
                <TimeField label={t('composer.endTime')} value={endTime} placeholder="—" doneLabel={t('detail.gotIt')} onChange={setEndTime} />
              </View>
            ) : null}
          </Card>

          {/* Audience */}
          <Card className="gap-3">
            <Text className="text-base font-extrabold text-foreground">{t('composer.audience')}</Text>
            <View className="flex-row gap-2">
              {audienceTabs.map((value) => {
                const active = audienceType === value;
                const label =
                  value === 'center' ? t('audience.wholeCenter') : value === 'class' ? t('audience.class') : t('audience.child');
                return (
                  <Pressable
                    key={value}
                    onPress={() => pickAudience(value)}
                    className={cn('flex-1 items-center rounded-md border py-2.5', active ? 'border-primary bg-sky' : 'border-border bg-background')}>
                    <Text numberOfLines={1} className={cn('text-[13px] font-bold', active ? 'text-primary' : 'text-muted')}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {audienceType === 'class' ? (
              <PickerField label={t('audience.class')} value={classId} placeholder={t('composer.chooseClass')} options={classOptions} onChange={setClassId} />
            ) : null}
            {audienceType === 'child' ? (
              <PickerField label={t('audience.child')} value={childId} placeholder={t('composer.chooseChild')} options={childOptions} onChange={setChildId} />
            ) : null}
          </Card>

          {/* Details */}
          <Card className="gap-4">
            <View>
              <Text className="mb-1.5 text-[13px] font-semibold text-muted">{t('composer.location')}</Text>
              <TextInput
                value={locationText}
                onChangeText={setLocationText}
                maxLength={300}
                placeholder={t('composer.locationPlaceholder')}
                placeholderTextColor={colors.textMuted}
                className="h-11 rounded-md border border-border bg-background px-3 text-[15px] text-foreground"
              />
            </View>
            <PickerField
              label={t('composer.reminder')}
              value={reminder}
              placeholder={t('reminders.none')}
              options={REMINDERS.map((value) => ({
                value,
                label: t(
                  value === 'none'
                    ? 'reminders.none'
                    : value === '60'
                      ? 'reminders.oneHour'
                      : value === '1440'
                        ? 'reminders.oneDay'
                        : 'reminders.threeDays',
                ),
              }))}
              onChange={setReminder}
            />
            <View>
              <Text className="mb-1.5 text-[13px] font-semibold text-muted">{t('composer.details')}</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                maxLength={2000}
                multiline
                placeholderTextColor={colors.textMuted}
                className="min-h-[110px] rounded-md border border-border bg-background p-3 text-[15px] leading-6 text-foreground"
              />
            </View>
          </Card>

          {error ? (
            <View className="rounded-md bg-coral px-3 py-2.5">
              <Text className="text-[13px] font-semibold text-coral-ink">{error}</Text>
            </View>
          ) : null}

          <Pressable
            disabled={busy}
            onPress={save}
            style={{ backgroundColor: PRIMARY }}
            className="mt-1 h-12 flex-row items-center justify-center gap-2 rounded-md">
            {busy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
            <Text className="text-[15px] font-bold text-white">
              {editing ? t('composer.saveChanges') : t('composer.create')}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
