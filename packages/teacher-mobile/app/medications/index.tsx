import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/screen-header';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { useStaffMedications } from '@/data/teacher';
import { todayIsoDate } from '@/lib/date';
import { orpc } from '@/lib/orpc';
import { teacherQueryKeys } from '@/lib/query-keys';

const STATUS_TONE: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-sunshine', text: 'text-sunshine-ink' },
  administered: { bg: 'bg-mint', text: 'text-mint-ink' },
  skipped: { bg: 'bg-pill', text: 'text-muted' },
  cancelled: { bg: 'bg-pill', text: 'text-muted' },
};

export default function MedicationsScreen() {
  const { t } = useTranslation('teacher');
  const date = todayIsoDate();
  const queryClient = useQueryClient();
  const query = useStaffMedications(date);
  const meds = query.data ?? [];

  const markGiven = useMutation({
    mutationFn: (requestId: string) =>
      orpc.medications.complete({ requestId, body: { status: 'administered' } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teacherQueryKeys.medications(date) }),
  });

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={t('medications.title')} back />
      {query.isPending ? (
        <Loader />
      ) : meds.length === 0 ? (
        <View className="p-4">
          <EmptyState icon="medkit-outline" title={t('medications.empty')} body={t('classes.emptyBody')} />
        </View>
      ) : (
        <ScrollView contentContainerClassName="gap-3 p-4" showsVerticalScrollIndicator={false}>
          {meds.map((med) => {
            const tone = STATUS_TONE[med.status] ?? STATUS_TONE.pending;
            return (
              <Card key={med.id}>
                <View className="flex-row items-center gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-2xl bg-coral">
                    <Ionicons name="medkit" size={18} color="#E8674E" />
                  </View>
                  <View className="flex-1">
                    <Text numberOfLines={1} className="text-[15px] font-bold text-foreground">
                      {med.child.name}
                    </Text>
                    <Text numberOfLines={1} className="text-[13px] text-muted">
                      {med.medicineName} · {med.dosage} · {t('medications.atTime', { time: med.medicationTime })}
                    </Text>
                  </View>
                  <View className={`rounded-full px-2.5 py-1 ${tone.bg}`}>
                    <Text className={`text-[11px] font-bold ${tone.text}`}>
                      {t(`medications.status.${med.status}`, { defaultValue: med.status })}
                    </Text>
                  </View>
                </View>
                {med.symptoms ? (
                  <Text numberOfLines={2} className="mt-2 text-[13px] text-muted">{med.symptoms}</Text>
                ) : null}
                {med.status === 'pending' ? (
                  <Pressable
                    disabled={markGiven.isPending}
                    onPress={() => markGiven.mutate(med.id)}
                    className="mt-3 flex-row items-center justify-center gap-1.5 rounded-md bg-primary py-2.5">
                    <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                    <Text className="text-[13px] font-bold text-white">{t('medications.markGiven')}</Text>
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
