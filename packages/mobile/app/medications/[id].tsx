import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ComponentProps, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmModal } from '@/components/medication/confirm-modal';
import { SignedImage } from '@/components/medication/signed-image';
import { StatusChip } from '@/components/medication/status-chip';
import { Loader } from '@/components/ui/loader';
import {
  useCancelMedicationRequest,
  useMedicationRequest,
  type MedicationDetail,
} from '@/data/medications';
import { cn } from '@/lib/utils';

type IconName = ComponentProps<typeof Ionicons>['name'];
type Fact = { icon: IconName; label: string; value: string };

const CORAL = '#E8674E';

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

/** The hero answers the parent's one question — was it given? — with a
 *  status-tinted band: pending coral, administered mint, skipped sunshine,
 *  cancelled grey. */
const STATUS_TONE: Record<MedicationDetail['status'], { bg: string; ink: string; icon: IconName }> = {
  pending: { bg: 'bg-coral', ink: '#E8674E', icon: 'hourglass-outline' },
  administered: { bg: 'bg-mint', ink: '#46B06A', icon: 'checkmark-circle' },
  skipped: { bg: 'bg-sunshine', ink: '#F4A621', icon: 'remove-circle-outline' },
  cancelled: { bg: 'bg-pill', ink: '#8A8F99', icon: 'ban-outline' },
};

function StatusHero({ request }: { request: MedicationDetail }) {
  const tone = STATUS_TONE[request.status];
  return (
    <View className={cn('mx-4 mt-4 rounded-2xl p-4', tone.bg)}>
      <View className="flex-row items-center gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-card">
          <Ionicons name={tone.icon} size={24} color={tone.ink} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-[11px] font-bold uppercase tracking-wide" style={{ color: tone.ink }}>
            {request.childName}
          </Text>
          <Text numberOfLines={2} className="text-xl font-extrabold leading-7 text-foreground">
            {request.medicineName}
          </Text>
          <Text className="text-xs text-muted">{request.dateLabel}</Text>
        </View>
        <StatusChip status={request.status} />
      </View>
    </View>
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

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mx-4 mt-3 rounded-2xl border border-border bg-card p-4">
      <Text className="mb-2 text-[11px] font-semibold uppercase text-muted">{label}</Text>
      {children}
    </View>
  );
}

function Outcome({ event }: { event: MedicationDetail }) {
  const { t } = useTranslation('medications');
  if (event.status === 'administered') {
    return (
      <View className="mx-4 mt-3 rounded-2xl bg-mint p-4">
        <Text className="mb-1 text-xs font-bold text-mint-ink">{t('detail.reportTitle')}</Text>
        {event.administeredDose ? (
          <Text className="text-sm text-foreground">
            <Text className="font-semibold">{t('detail.administeredDose')}: </Text>
            {event.administeredDose}
          </Text>
        ) : null}
        {event.administeredByName ? (
          <Text className="mt-0.5 text-sm text-foreground">
            <Text className="font-semibold">{t('detail.staff')}: </Text>
            {event.administeredByName}
          </Text>
        ) : null}
        {event.staffNote ? (
          <Text className="mt-0.5 text-sm text-foreground">
            <Text className="font-semibold">{t('detail.staffNote')}: </Text>
            {event.staffNote}
          </Text>
        ) : null}
      </View>
    );
  }
  if (event.status === 'skipped') {
    return (
      <View className="mx-4 mt-3 rounded-2xl bg-pill p-4">
        <Text className="mb-1 text-xs font-bold text-muted">{t('detail.reportTitle')}</Text>
        <Text className="text-sm text-foreground">
          <Text className="font-semibold">{t('detail.skippedReason')}: </Text>
          {event.skippedReason ?? '—'}
        </Text>
      </View>
    );
  }
  if (event.status === 'pending') {
    return <Text className="mx-4 mt-3 text-sm leading-5 text-muted">{t('detail.noReportYet')}</Text>;
  }
  return null;
}

export default function MedicationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation('medications');
  const { data: request, isPending } = useMedicationRequest(String(id));
  const cancel = useCancelMedicationRequest(String(id));
  const [confirming, setConfirming] = useState(false);

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
    ...(request.className
      ? [{ icon: 'people-outline' as IconName, label: t('detail.class'), value: request.className }]
      : []),
    { icon: 'flask-outline', label: t('detail.medicineType'), value: request.medicationType },
    { icon: 'eyedrop-outline', label: t('detail.dosage'), value: request.dosage },
    { icon: 'time-outline', label: t('composer.medicationTime'), value: request.medicationTime },
    ...(request.medicationCount
      ? [{ icon: 'repeat-outline' as IconName, label: t('detail.countFrequency'), value: request.medicationCount }]
      : []),
    ...(request.storageMethod
      ? [{ icon: 'snow-outline' as IconName, label: t('detail.storage'), value: request.storageMethod }]
      : []),
  ];

  function confirmCancel() {
    cancel.mutate(undefined, { onSettled: () => setConfirming(false) });
  }

  return (
    <View className="flex-1 bg-background">
      <Header title={t('title')} />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerClassName="pb-8">
        <StatusHero request={request} />

        <View className="mx-4 mt-3 overflow-hidden rounded-2xl border border-border bg-card">
          {facts.map((fact, index) => (
            <InfoRow key={fact.label} {...fact} last={index === facts.length - 1} />
          ))}
        </View>

        <Card label={t('detail.symptoms')}>
          <Text className="text-[15px] leading-6 text-foreground">{request.symptoms}</Text>
        </Card>
        {request.instructions ? (
          <Card label={t('detail.instructions')}>
            <Text className="text-[15px] leading-6 text-foreground">{request.instructions}</Text>
          </Card>
        ) : null}
        {request.specialNote ? (
          <Card label={t('detail.specialNote')}>
            <Text className="text-[15px] leading-6 text-foreground">{request.specialNote}</Text>
          </Card>
        ) : null}

        {request.photoAssetId ? (
          <Card label={t('composer.medicationPhoto')}>
            <SignedImage assetId={request.photoAssetId} className="h-48 w-full rounded-xl" />
          </Card>
        ) : null}

        {request.signatureAssetId ? (
          <Card label={t('detail.signature')}>
            <SignedImage
              assetId={request.signatureAssetId}
              className="h-28 w-full rounded-xl bg-card"
              resizeMode="contain"
              fallbackIcon="create-outline"
            />
          </Card>
        ) : request.signatureText ? (
          <Card label={t('detail.signature')}>
            <Text className="text-[15px] font-semibold text-foreground">{request.signatureText}</Text>
          </Card>
        ) : null}

        <Outcome event={request} />

        {request.status === 'pending' ? (
          <Pressable
            onPress={() => setConfirming(true)}
            className="mx-4 mt-5 flex-row items-center justify-center gap-1.5 rounded-full border border-coral-ink py-3">
            <Ionicons name="close-circle-outline" size={18} color={CORAL} />
            <Text className="text-sm font-bold text-coral-ink">{t('detail.cancelRequest')}</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <ConfirmModal
        visible={confirming}
        title={t('cancelConfirm.title')}
        body={t('cancelConfirm.body')}
        confirmLabel={t('cancelConfirm.yes')}
        cancelLabel={t('cancelConfirm.no')}
        loading={cancel.isPending}
        onConfirm={confirmCancel}
        onCancel={() => setConfirming(false)}
      />
    </View>
  );
}
