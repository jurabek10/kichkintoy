import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { StatusChip } from '@/components/medication/status-chip';
import type { MedicationSummary } from '@/data/medications';

const MUTED = '#8A8F99';

/** One medication request on the parent's board — medicine-forward (the parent
 *  knows their child), with the child, dose and time beneath and a status chip.
 *  Taps through to the request detail. */
export function RequestCard({ request, showDate = true }: { request: MedicationSummary; showDate?: boolean }) {
  return (
    <Link href={{ pathname: '/medications/[id]', params: { id: request.id } }} asChild>
      <Pressable className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-4 active:opacity-90">
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
          {showDate ? <Text className="mt-0.5 text-xs text-muted">{request.dateLabel}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={MUTED} />
      </Pressable>
    </Link>
  );
}
