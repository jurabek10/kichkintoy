import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PickupStatusChip } from '@/components/pickup/status-chip';
import { Loader } from '@/components/ui/loader';
import { useAcknowledgePickup, useStaffPickup } from '@/data/pickups';
import { cn } from '@/lib/utils';

type IconName = ComponentProps<typeof Ionicons>['name'];

const SUNSHINE_BG = '#FFF1CF';
const SUNSHINE_INK = '#F4A621';
const INK = '#2B2D31';

/** Soft sunshine header — the calm "heading home" identity, dark text for
 *  legibility (matches the parent detail). */
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
  const { t } = useTranslation('pickups');
  const { data: notice, isPending } = useStaffPickup(String(id));
  const acknowledge = useAcknowledgePickup(String(id));

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

  const canAcknowledge = notice.status === 'submitted' || notice.status === 'changed';
  const acknowledging = acknowledge.isPending;

  return (
    <View className="flex-1 bg-background">
      <Header title={t('title')} />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerClassName="pb-10">
        {/* Time-forward hero */}
        <View className="items-center gap-1 bg-sunshine px-4 pb-6 pt-6">
          <PickupStatusChip status={notice.status} />
          <Text className="mt-2 text-5xl font-extrabold tabular-nums text-foreground">{notice.pickupTime}</Text>
          <Text className="text-sm font-semibold text-foreground/70">{notice.dateLabel}</Text>
        </View>

        <View className="mx-4 mt-4 overflow-hidden rounded-2xl border border-border bg-card">
          <Fact icon="person-outline" label={t('composer.child')} value={notice.childName} />
          {notice.className ? <Fact icon="people-outline" label={t('detail.class')} value={notice.className} /> : null}
          <Fact icon="happy-outline" label={t('detail.parent')} value={notice.parentName} />
          <Fact icon="walk-outline" label={t('detail.person')} value={notice.personName} />
          <Fact
            icon="heart-outline"
            label={t('detail.relationship')}
            value={t(`relationship.${notice.relationship}`)}
            last={!notice.note}
          />
          {notice.note ? <Fact icon="chatbubble-outline" label={t('detail.note')} value={notice.note} last /> : null}
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
                <Text className="mt-0.5 text-xs text-foreground/70">{notice.acknowledgedAtLabel}</Text>
              ) : null}
            </View>
          </View>
        ) : notice.status === 'cancelled' ? null : (
          <View className="mx-4 mt-3 flex-row items-center gap-2 rounded-2xl bg-pill p-4">
            <Ionicons name="hourglass-outline" size={18} color="#8A8F99" />
            <Text className="flex-1 text-sm text-muted">{t('detail.pendingAck')}</Text>
          </View>
        )}

        {/* Acknowledge — the one thing a teacher does with a notice */}
        {canAcknowledge ? (
          <Pressable
            onPress={() => acknowledge.mutate()}
            disabled={acknowledging}
            className="mx-4 mt-5 h-12 flex-row items-center justify-center gap-1.5 rounded-full bg-sunshine-ink">
            {acknowledging ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
            )}
            <Text className="text-[15px] font-bold text-white">{t('detail.acknowledge')}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}
