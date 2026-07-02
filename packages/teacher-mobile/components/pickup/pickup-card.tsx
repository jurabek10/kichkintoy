import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { PickupStatusChip } from '@/components/pickup/status-chip';
import type { StaffPickupSummary } from '@/data/pickups';

const MUTED = '#8A8F99';

/** One pickup on the teacher's board — the parent's time-forward card: a big
 *  sunshine time tile, the child, who's collecting, and the status. Taps to the
 *  notice. `showDate` off inside today's tray, on in the history. */
export function PickupCard({ pickup, showDate = true }: { pickup: StaffPickupSummary; showDate?: boolean }) {
  const { t } = useTranslation('pickups');

  return (
    <Link href={{ pathname: '/pickups/[id]', params: { id: pickup.id } }} asChild>
      <Pressable className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3 active:opacity-90">
        <View className="h-14 w-16 items-center justify-center rounded-2xl bg-sunshine">
          <Text className="text-lg font-extrabold tabular-nums text-foreground">{pickup.pickupTime}</Text>
        </View>
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="flex-1 text-[15px] font-bold text-foreground" numberOfLines={1}>
              {pickup.childName}
            </Text>
            <PickupStatusChip status={pickup.status} />
          </View>
          <Text className="mt-0.5 text-xs text-muted" numberOfLines={1}>
            {pickup.personName} · {t(`relationship.${pickup.relationship}`)}
          </Text>
          <Text className="mt-0.5 text-xs text-muted" numberOfLines={1}>
            {showDate ? pickup.dateLabel : pickup.className ?? ''}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={MUTED} />
      </Pressable>
    </Link>
  );
}
