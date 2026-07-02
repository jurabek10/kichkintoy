import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ComponentProps, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SignedImage } from '@/components/medication/signed-image';
import { StatusChip } from '@/components/medication/status-chip';
import { TimeField } from '@/components/calendar/time-field';
import { Loader } from '@/components/ui/loader';
import { colors } from '@/constants/theme';
import { useCompleteMedication, useStaffMedication, type StaffMedDetail } from '@/data/medications';
import { formatTime, todayIsoDate } from '@/lib/date';
import { cn } from '@/lib/utils';

type IconName = ComponentProps<typeof Ionicons>['name'];
type Fact = { icon: IconName; label: string; value: string };

const CORAL = '#E8674E';
const UZ_OFFSET_H = 5;

/** ISO instant for a UZ wall-clock date + "HH:mm". */
function toUzIso(date: string, time: string) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(Date.UTC(y!, (m ?? 1) - 1, d, (hh ?? 0) - UZ_OFFSET_H, mm ?? 0)).toISOString();
}

function Header({ title }: { title: string }) {
  const router = useRouter();
  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: CORAL }}>
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

function InfoRow({ icon, label, value, last }: Fact & { last?: boolean }) {
  return (
    <View className={cn('flex-row items-center gap-3 px-4 py-3', !last && 'border-b border-border')}>
      <View className="h-9 w-9 items-center justify-center rounded-full bg-coral">
        <Ionicons name={icon} size={16} color={CORAL} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[11px] font-semibold uppercase text-muted">{label}</Text>
        <Text className="text-[15px] font-semibold text-foreground">{value}</Text>
      </View>
    </View>
  );
}

function NoteCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mx-4 mt-3 rounded-2xl border border-border bg-card p-4">
      <Text className="mb-2 text-[11px] font-semibold uppercase text-muted">{label}</Text>
      {children}
    </View>
  );
}

function Line({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <Text className="text-sm text-foreground">
      <Text className="font-semibold">{label}: </Text>
      {value}
    </Text>
  );
}

/** The completed outcome, once the report is filed. */
function Outcome({ request }: { request: StaffMedDetail }) {
  const { t } = useTranslation('medications');
  if (request.status === 'administered') {
    return (
      <View className="mx-4 mt-3 gap-1 rounded-2xl bg-mint p-4">
        <View className="mb-1 flex-row items-center gap-2">
          <Ionicons name="checkmark-circle" size={18} color="#46B06A" />
          <Text className="text-xs font-bold text-mint-ink">{t('detail.reportTitle')}</Text>
        </View>
        <Line label={t('detail.staff')} value={request.administeredByName} />
        <Line label={t('detail.administeredAt')} value={request.administeredAtLabel} />
        <Line label={t('detail.administeredDose')} value={request.administeredDose} />
        <Line label={t('detail.staffNote')} value={request.staffNote} />
      </View>
    );
  }
  if (request.status === 'skipped') {
    return (
      <View className="mx-4 mt-3 gap-1 rounded-2xl bg-pill p-4">
        <Text className="mb-1 text-xs font-bold text-muted">{t('detail.reportTitle')}</Text>
        <Line label={t('detail.skippedReason')} value={request.skippedReason} />
        <Line label={t('detail.staffNote')} value={request.staffNote} />
      </View>
    );
  }
  return null;
}

/** The staff report editor, shown while a request is still pending. */
function ReportEditor({ request }: { request: StaffMedDetail }) {
  const { t } = useTranslation('medications');
  const complete = useCompleteMedication(request.id);
  const [outcome, setOutcome] = useState<'administered' | 'skipped'>('administered');
  const [time, setTime] = useState(formatTime(new Date().toISOString()));
  const [dose, setDose] = useState('');
  const [staffNote, setStaffNote] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    if (outcome === 'skipped' && !reason.trim()) return setError(t('detail.skippedReason'));
    complete.mutate({
      status: outcome,
      administeredAt: outcome === 'administered' ? toUzIso(todayIsoDate(), time) : undefined,
      administeredDose: dose.trim() || undefined,
      staffNote: staffNote.trim() || undefined,
      skippedReason: outcome === 'skipped' ? reason.trim() : undefined,
    });
  }

  return (
    <View className="mx-4 mt-4 rounded-2xl border border-border bg-card p-4">
      <Text className="text-base font-bold text-foreground">{t('detail.reportTitle')}</Text>

      <View className="mt-3 flex-row gap-2">
        {(['administered', 'skipped'] as const).map((value) => {
          const active = outcome === value;
          return (
            <Pressable
              key={value}
              onPress={() => setOutcome(value)}
              className={cn(
                'flex-1 flex-row items-center justify-center gap-1.5 rounded-md border py-2.5',
                active ? 'border-coral-ink bg-coral' : 'border-border bg-background',
              )}>
              <Ionicons
                name={value === 'administered' ? 'checkmark-circle-outline' : 'close-circle-outline'}
                size={16}
                color={active ? CORAL : colors.textMuted}
              />
              <Text className={cn('text-[13px] font-bold', active ? 'text-coral-ink' : 'text-muted')}>
                {t(`status.${value}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {outcome === 'administered' ? (
        <View className="mt-3 flex-row gap-3">
          <TimeField label={t('detail.administeredTime')} value={time} placeholder="09:00" doneLabel={t('detail.saveReport')} onChange={setTime} />
          <View className="flex-1">
            <Text className="mb-1.5 text-[13px] font-semibold text-muted">{t('detail.administeredDose')}</Text>
            <TextInput
              value={dose}
              onChangeText={setDose}
              placeholder={request.dosage}
              placeholderTextColor={colors.textMuted}
              className="h-11 rounded-md border border-border bg-background px-3 text-[15px] text-foreground"
            />
          </View>
        </View>
      ) : (
        <View className="mt-3">
          <Text className="mb-1.5 text-[13px] font-semibold text-muted">{t('detail.skippedReason')}</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            multiline
            placeholderTextColor={colors.textMuted}
            className="min-h-[64px] rounded-md border border-border bg-background p-3 text-[15px] text-foreground"
          />
        </View>
      )}

      <View className="mt-3">
        <Text className="mb-1.5 text-[13px] font-semibold text-muted">{t('detail.staffNote')}</Text>
        <TextInput
          value={staffNote}
          onChangeText={setStaffNote}
          multiline
          placeholderTextColor={colors.textMuted}
          className="min-h-[56px] rounded-md border border-border bg-background p-3 text-[15px] text-foreground"
        />
      </View>

      {error ? <Text className="mt-2 text-[13px] font-semibold text-coral-ink">{error}</Text> : null}

      <Pressable
        onPress={save}
        disabled={complete.isPending}
        style={{ backgroundColor: CORAL }}
        className="mt-4 h-12 flex-row items-center justify-center gap-2 rounded-md">
        {complete.isPending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="save-outline" size={18} color="#FFFFFF" />}
        <Text className="text-[15px] font-bold text-white">{t('detail.saveReport')}</Text>
      </Pressable>
    </View>
  );
}

export default function MedicationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation('medications');
  const { data: request, isPending } = useStaffMedication(String(id));

  if (isPending) {
    return (
      <View className="flex-1 bg-background">
        <Header title={t('title')} />
        <Loader />
      </View>
    );
  }

  if (!request) {
    return (
      <View className="flex-1 bg-background">
        <Header title={t('title')} />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-sm text-muted">{t('detail.notFound')}</Text>
        </View>
      </View>
    );
  }

  const facts: Fact[] = [
    { icon: 'person-outline', label: t('detail.child'), value: request.childName },
    ...(request.className ? [{ icon: 'people-outline' as IconName, label: t('detail.class'), value: request.className }] : []),
    { icon: 'happy-outline', label: t('detail.parent'), value: request.parentName },
    { icon: 'calendar-outline', label: t('composer.date'), value: request.dateLabel },
    { icon: 'flask-outline', label: t('detail.medicineType'), value: request.medicationType },
    { icon: 'eyedrop-outline', label: t('detail.dosage'), value: request.dosage },
    { icon: 'time-outline', label: t('composer.medicationTime'), value: request.medicationTime },
    ...(request.medicationCount ? [{ icon: 'repeat-outline' as IconName, label: t('detail.countFrequency'), value: request.medicationCount }] : []),
    ...(request.storageMethod ? [{ icon: 'snow-outline' as IconName, label: t('detail.storage'), value: request.storageMethod }] : []),
  ];

  return (
    <View className="flex-1 bg-background">
      <Header title={t('title')} />

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerClassName="pb-10" keyboardShouldPersistTaps="handled">
          <View className="flex-row items-center justify-between gap-2 px-4 pb-1 pt-5">
            <Text className="flex-1 text-2xl font-extrabold leading-8 text-foreground">{request.medicineName}</Text>
            <StatusChip status={request.status} />
          </View>

          <View className="mx-4 mt-4 overflow-hidden rounded-2xl border border-border bg-card">
            {facts.map((fact, index) => (
              <InfoRow key={fact.label} {...fact} last={index === facts.length - 1} />
            ))}
          </View>

          <NoteCard label={t('detail.symptoms')}>
            <Text className="text-[15px] leading-6 text-foreground">{request.symptoms}</Text>
          </NoteCard>
          {request.instructions ? (
            <NoteCard label={t('detail.instructions')}>
              <Text className="text-[15px] leading-6 text-foreground">{request.instructions}</Text>
            </NoteCard>
          ) : null}
          {request.specialNote ? (
            <NoteCard label={t('detail.specialNote')}>
              <Text className="text-[15px] leading-6 text-foreground">{request.specialNote}</Text>
            </NoteCard>
          ) : null}

          {request.photoAssetId ? (
            <NoteCard label={t('composer.medicationPhoto')}>
              <SignedImage assetId={request.photoAssetId} className="h-48 w-full rounded-xl" />
              {request.photoCaption ? <Text className="mt-2 text-[13px] text-muted">{request.photoCaption}</Text> : null}
            </NoteCard>
          ) : null}

          {request.signatureAssetId ? (
            <NoteCard label={t('detail.signature')}>
              <SignedImage assetId={request.signatureAssetId} className="h-28 w-full rounded-xl bg-card" resizeMode="contain" fallbackIcon="create-outline" />
            </NoteCard>
          ) : request.signatureText ? (
            <NoteCard label={t('detail.signature')}>
              <Text className="text-[15px] font-semibold text-foreground">{request.signatureText}</Text>
            </NoteCard>
          ) : null}

          {request.status === 'pending' ? <ReportEditor request={request} /> : <Outcome request={request} />}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
