import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ComponentProps, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmModal } from '@/components/medication/confirm-modal';
import { PickupForm, type PickupFormValues } from '@/components/pickup/pickup-form';
import { PickupStatusChip } from '@/components/pickup/status-chip';
import { Loader } from '@/components/ui/loader';
import { useCancelPickupNotice, usePickupNotice, useUpdatePickupNotice } from '@/data/pickups';
import { cn } from '@/lib/utils';

type IconName = ComponentProps<typeof Ionicons>['name'];

const SUNSHINE_BG = '#FFF1CF';
const SUNSHINE_INK = '#F4A621';
const INK = '#2B2D31';

/** Soft sunshine header — the calm "heading home" identity. Dark text keeps it
 *  legible where a saturated bar with white text would fail contrast. */
function Header({ title }: { title: string }) {
  const router = useRouter();
  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: SUNSHINE_BG }}>
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={INK} />
        </Pressable>
        <Text className="flex-1 text-center text-lg font-bold text-foreground">{title}</Text>
        <View className="w-6" />
      </View>
    </SafeAreaView>
  );
}

function Fact({ icon, label, value, last }: { icon: IconName; label: string; value: string; last?: boolean }) {
  return (
    <View className={cn('flex-row items-center gap-3 px-4 py-3', !last && 'border-b border-border')}>
      <View className="h-9 w-9 items-center justify-center rounded-full bg-sunshine">
        <Ionicons name={icon} size={16} color={SUNSHINE_INK} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[11px] font-semibold uppercase text-muted">{label}</Text>
        <Text className="text-[15px] font-semibold text-foreground">{value}</Text>
      </View>
    </View>
  );
}

export default function PickupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation('pickups');
  const { data: notice, isPending } = usePickupNotice(String(id));
  const update = useUpdatePickupNotice(String(id));
  const cancel = useCancelPickupNotice(String(id));
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (isPending) {
    return (
      <View className="flex-1 bg-background">
        <Header title={t('title')} />
        <Loader />
      </View>
    );
  }

  if (!notice) {
    return (
      <View className="flex-1 bg-background">
        <Header title={t('title')} />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-sm text-muted">{t('detail.notFound')}</Text>
        </View>
      </View>
    );
  }

  const canEdit = notice.status !== 'cancelled';

  function saveEdit(values: PickupFormValues) {
    update.mutate(
      {
        pickupDate: values.pickupDate,
        pickupTime: values.pickupTime,
        pickupPersonName: values.pickupPersonName,
        relationship: values.relationship,
        note: values.note || undefined,
      },
      { onSuccess: () => setEditing(false) },
    );
  }

  function confirmCancel() {
    cancel.mutate(undefined, { onSettled: () => setConfirming(false) });
  }

  return (
    <View className="flex-1 bg-background">
      <Header title={t('title')} />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="pb-10">
          {/* Time-forward hero — when the child heads home, and who for */}
          <View className="items-center gap-1 bg-sunshine px-4 pb-6 pt-6">
            <PickupStatusChip status={notice.status} />
            <Text className="mt-2 text-5xl font-extrabold tabular-nums text-foreground">
              {notice.pickupTime}
            </Text>
            <Text className="text-sm font-semibold text-foreground/70">{notice.dateLabel}</Text>
            <Text className="mt-1 text-[15px] font-bold text-foreground">{notice.childName}</Text>
          </View>

          {editing ? (
            <View className="p-4">
              <Text className="mb-3 text-[11px] font-bold uppercase tracking-wide text-sunshine-ink">
                {t('detail.editTitle')}
              </Text>
              <PickupForm
                mode="edit"
                lang={i18n.language}
                initial={{
                  childId: '',
                  pickupDate: notice.pickupDate,
                  pickupTime: notice.pickupTime,
                  pickupPersonName: notice.personName,
                  relationship: notice.relationship,
                  note: notice.note ?? '',
                }}
                submitLabel={t('detail.saveChanges')}
                submitIcon="checkmark"
                submitting={update.isPending}
                onSubmit={saveEdit}
              />
              <Pressable
                onPress={() => setEditing(false)}
                className="mt-3 items-center justify-center rounded-full bg-pill py-3">
                <Text className="text-sm font-bold text-muted">{t('detail.discardEdit')}</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View className="mx-4 mt-4 overflow-hidden rounded-2xl border border-border bg-card">
                <Fact icon="person-outline" label={t('composer.child')} value={notice.childName} />
                {notice.className ? (
                  <Fact icon="people-outline" label={t('detail.class')} value={notice.className} />
                ) : null}
                <Fact icon="walk-outline" label={t('detail.person')} value={notice.personName} />
                <Fact
                  icon="heart-outline"
                  label={t('detail.relationship')}
                  value={t(`relationship.${notice.relationship}`)}
                  last={!notice.note}
                />
                {notice.note ? (
                  <Fact icon="chatbubble-outline" label={t('detail.note')} value={notice.note} last />
                ) : null}
              </View>

              {/* Acknowledgement */}
              {notice.status === 'acknowledged' ? (
                <View className="mx-4 mt-3 flex-row items-center gap-3 rounded-2xl bg-mint p-4">
                  <Ionicons name="checkmark-circle" size={22} color="#46B06A" />
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-mint-ink">
                      {t('detail.acknowledgedBy')}: {notice.acknowledgedByName ?? '—'}
                    </Text>
                    {notice.acknowledgedAtLabel ? (
                      <Text className="mt-0.5 text-xs text-foreground/70">
                        {notice.acknowledgedAtLabel}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : notice.status === 'cancelled' ? null : (
                <View className="mx-4 mt-3 flex-row items-center gap-2 rounded-2xl bg-pill p-4">
                  <Ionicons name="hourglass-outline" size={18} color="#8A8F99" />
                  <Text className="flex-1 text-sm text-muted">{t('detail.pendingAck')}</Text>
                </View>
              )}

              {canEdit ? (
                <View className="mx-4 mt-5 gap-3">
                  <Pressable
                    onPress={() => setEditing(true)}
                    className="flex-row items-center justify-center gap-1.5 rounded-full bg-sunshine-ink py-3.5">
                    <Ionicons name="create-outline" size={18} color="#FFFFFF" />
                    <Text className="text-[15px] font-bold text-white">
                      {t('detail.changeDetails')}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setConfirming(true)}
                    className="flex-row items-center justify-center gap-1.5 rounded-full border border-coral-ink py-3">
                    <Ionicons name="close-circle-outline" size={18} color="#E8674E" />
                    <Text className="text-sm font-bold text-coral-ink">
                      {t('detail.cancelNotice')}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

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
