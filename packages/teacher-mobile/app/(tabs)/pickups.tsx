import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/screen-header';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { useStaffPickups } from '@/data/teacher';
import { todayIsoDate } from '@/lib/date';
import { orpc } from '@/lib/orpc';
import { teacherQueryKeys } from '@/lib/query-keys';

const STATUS_TONE: Record<string, { bg: string; text: string }> = {
  submitted: { bg: 'bg-sky', text: 'text-sky-ink' },
  acknowledged: { bg: 'bg-mint', text: 'text-mint-ink' },
  changed: { bg: 'bg-sunshine', text: 'text-sunshine-ink' },
  cancelled: { bg: 'bg-pill', text: 'text-muted' },
};

export default function PickupsScreen() {
  const { t } = useTranslation(['teacher', 'pickups']);
  const date = todayIsoDate();
  const queryClient = useQueryClient();
  const query = useStaffPickups(date);
  const pickups = query.data ?? [];

  const acknowledge = useMutation({
    mutationFn: (noticeId: string) => orpc.pickups.acknowledge({ noticeId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teacherQueryKeys.pickups(date) }),
  });

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={t('pickups.title')} />
      {query.isPending ? (
        <Loader />
      ) : pickups.length === 0 ? (
        <View className="p-4">
          <EmptyState icon="walk-outline" title={t('pickups.empty')} body={t('classes.emptyBody')} />
        </View>
      ) : (
        <ScrollView contentContainerClassName="gap-3 p-4" showsVerticalScrollIndicator={false}>
          {pickups.map((pickup) => {
            const tone = STATUS_TONE[pickup.status] ?? STATUS_TONE.submitted;
            const actionable = pickup.status === 'submitted' || pickup.status === 'changed';
            return (
              <Card key={pickup.id}>
                <View className="flex-row items-center gap-3">
                  <View className="h-11 w-11 items-center justify-center rounded-2xl bg-sky">
                    <Ionicons name="walk" size={20} color="#3E8FE0" />
                  </View>
                  <View className="flex-1">
                    <Text numberOfLines={1} className="text-[15px] font-bold text-foreground">
                      {pickup.child.name}
                    </Text>
                    <Text numberOfLines={1} className="text-[13px] text-muted">
                      {pickup.pickupTime} · {pickup.pickupPersonName}
                      {' · '}
                      {t(`relationships.${pickup.relationship}`, { ns: 'pickups', defaultValue: pickup.relationship })}
                    </Text>
                  </View>
                  <View className={`rounded-full px-2.5 py-1 ${tone.bg}`}>
                    <Text className={`text-[11px] font-bold ${tone.text}`}>
                      {t(`pickups.status.${pickup.status}`, { defaultValue: pickup.status })}
                    </Text>
                  </View>
                </View>
                {pickup.note ? (
                  <Text numberOfLines={2} className="mt-2 text-[13px] text-muted">{pickup.note}</Text>
                ) : null}
                {actionable ? (
                  <Pressable
                    disabled={acknowledge.isPending}
                    onPress={() => acknowledge.mutate(pickup.id)}
                    className="mt-3 flex-row items-center justify-center gap-1.5 rounded-md bg-primary py-2.5">
                    <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                    <Text className="text-[13px] font-bold text-white">{t('pickups.acknowledge')}</Text>
                  </Pressable>
                ) : null}
              </Card>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
