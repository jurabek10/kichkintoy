import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/screen-header';
import { StatusChip } from '@/components/medication/status-chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { useMedicationRequests, type MedicationSummary } from '@/data/medications';

const MUTED = '#8A8F99';

function RequestCard({ request }: { request: MedicationSummary }) {
  return (
    <Link href={{ pathname: '/medications/[id]', params: { id: request.id } }} asChild>
      <Pressable className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <View className="h-11 w-11 items-center justify-center rounded-full bg-coral">
          <Ionicons name="medkit" size={20} color="#E8674E" />
        </View>
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="flex-1 text-[15px] font-bold text-foreground" numberOfLines={1}>
              {request.medicineName}
            </Text>
            <StatusChip status={request.status} />
          </View>
          <Text className="mt-0.5 text-xs text-muted" numberOfLines={1}>
            {request.childName} · {request.dosage} · {request.medicationTime}
          </Text>
          <Text className="mt-0.5 text-xs text-muted">{request.dateLabel}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={MUTED} />
      </Pressable>
    </Link>
  );
}

export default function MedicationsScreen() {
  const { t } = useTranslation(['nav', 'medications']);
  const router = useRouter();
  const { data: requests, isPending } = useMedicationRequests();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader
        title={t('items.medications', { ns: 'nav' })}
        back
        right={
          <Pressable
            onPress={() => router.push('/medications/new')}
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-full bg-coral-ink">
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </Pressable>
        }
      />

      {isPending ? (
        <Loader />
      ) : requests.length === 0 ? (
        <View className="p-4">
          <EmptyState
            icon="medkit-outline"
            title={t('empty.parentTitle', { ns: 'medications' })}
            body={t('empty.parentBody', { ns: 'medications' })}
          />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-3 p-4">
          {requests.map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
