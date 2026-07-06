import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { StatusChip } from '@/components/medication/status-chip';
import type { StaffMedSummary } from '@/data/medications';

const MUTED = '#8A8F99';

/** One medication request on the teacher's board — the parent's coral card, but
 *  child-forward (who still needs the dose). Taps through to the report. */
export function RequestCard({ request, showDate = true }: { request: StaffMedSummary; showDate?: boolean }) {
  const meta = showDate
    ? `${request.dateLabel}${request.className ? ` · ${request.className}` : ''}`
    : request.className ?? '';

  return (
    <Link href={{ pathname: '/medications/[id]', params: { id: request.id } }} asChild>
      <Pressable className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-4 active:opacity-90">
        <View className="h-11 w-11 items-center justify-center rounded-full bg-coral">
          <Ionicons name="medkit" size={20} color="#E8674E" />
        </View>
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="flex-1 text-[15px] font-bold text-foreground" numberOfLines={1}>
              {request.childName}
            </Text>
            <StatusChip status={request.status} />
          </View>
          <Text className="mt-0.5 text-xs text-muted" numberOfLines={1}>
            {request.medicineName} · {request.dosage} · {request.medicationTime}
          </Text>
          {meta ? (
            <Text className="mt-0.5 text-xs text-muted" numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={MUTED} />
      </Pressable>
    </Link>
  );
}
