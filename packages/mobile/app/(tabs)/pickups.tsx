import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/screen-header';
import { PickupStatusChip } from '@/components/pickup/status-chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { usePickupNotices, type PickupSummary } from '@/data/pickups';
import { formatMonthYear, parseIsoDate } from '@/lib/date';

const MUTED = '#8A8F99';

/** Group notices into month sections (input is pre-sorted newest-first). */
function groupByMonth(notices: PickupSummary[], lang: string) {
  return notices.reduce<{ key: string; label: string; notices: PickupSummary[] }[]>(
    (groups, notice) => {
      const { year, monthIndex } = parseIsoDate(notice.pickupDate);
      const key = `${year}-${monthIndex}`;
      const last = groups[groups.length - 1];
      if (last?.key === key) {
        last.notices.push(notice);
      } else {
        groups.push({ key, label: formatMonthYear(year, monthIndex, lang), notices: [notice] });
      }
      return groups;
    },
    [],
  );
}

function NoticeCard({ notice }: { notice: PickupSummary }) {
  const { t } = useTranslation('pickups');
  return (
    <Link href={{ pathname: '/pickups/[id]', params: { id: notice.id } }} asChild>
      <Pressable className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3">
        {/* Time-forward tile — the "when" is what a parent scans for */}
        <View className="h-14 w-16 items-center justify-center rounded-2xl bg-sunshine">
          <Text className="text-lg font-extrabold tabular-nums text-foreground">
            {notice.pickupTime}
          </Text>
        </View>
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="flex-1 text-[15px] font-bold text-foreground" numberOfLines={1}>
              {notice.childName}
            </Text>
            <PickupStatusChip status={notice.status} />
          </View>
          <Text className="mt-0.5 text-xs text-muted" numberOfLines={1}>
            {notice.personName} · {t(`relationship.${notice.relationship}`)}
          </Text>
          <Text className="mt-0.5 text-xs text-muted">{notice.dateLabel}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={MUTED} />
      </Pressable>
    </Link>
  );
}

export default function PickupsScreen() {
  const { t, i18n } = useTranslation(['nav', 'pickups']);
  const router = useRouter();
  const { data: notices, isPending } = usePickupNotices();
  const groups = groupByMonth(notices, i18n.language);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader
        title={t('items.pickups', { ns: 'nav' })}
        right={
          <Pressable
            onPress={() => router.push('/pickups/new')}
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-full bg-sunshine-ink">
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </Pressable>
        }
      />

      {isPending ? (
        <Loader />
      ) : notices.length === 0 ? (
        <View className="p-4">
          <EmptyState
            icon="walk-outline"
            title={t('empty.parentTitle', { ns: 'pickups' })}
            body={t('empty.parentBody', { ns: 'pickups' })}
          />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-6">
          {groups.map((group) => (
            <View key={group.key}>
              <View className="flex-row items-center gap-2 bg-background px-4 pb-2 pt-4">
                <Text className="text-base font-bold text-foreground">{group.label}</Text>
                <View className="rounded-full bg-segment px-2 py-0.5">
                  <Text className="text-[11px] font-bold text-muted">{group.notices.length}</Text>
                </View>
              </View>
              <View className="gap-3 px-4">
                {group.notices.map((notice) => (
                  <NoticeCard key={notice.id} notice={notice} />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
