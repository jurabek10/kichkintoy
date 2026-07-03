import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { RequestKindBadge, RequestStatusChip } from '@/components/requests/status-chip';
import { Avatar } from '@/components/ui/avatar';
import type { JoinRequest } from '@/data/teacher';
import { formatDayMonth } from '@/lib/date';

const MUTED = '#8A8F99';

/** One join request on the teacher's board — child-forward for parent requests,
 *  applicant-forward for staff. Taps open the review sheet with the loaded row. */
export function RequestCard({
  request,
  onPress,
}: {
  request: JoinRequest;
  onPress: () => void;
}) {
  const { t, i18n } = useTranslation('teacher');
  const isParent = request.kind === 'parent';

  const primary = isParent ? request.child?.name ?? request.requester.fullName : request.requester.fullName;
  const secondary = isParent
    ? t('requests.byParent', { name: request.requester.fullName })
    : request.requester.phoneNumber ?? request.requester.username ?? '';

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3 active:opacity-90">
      <Avatar uri={isParent ? request.child?.photoUrl ?? null : null} size={46} />
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-2">
          <RequestKindBadge kind={request.kind} />
          <View className="flex-1" />
          <RequestStatusChip status={request.status} />
        </View>
        <Text className="mt-1 text-[15px] font-bold text-foreground" numberOfLines={1}>
          {primary}
        </Text>
        {secondary ? (
          <Text className="mt-0.5 text-xs text-muted" numberOfLines={1}>
            {secondary}
          </Text>
        ) : null}
        <View className="mt-1.5 flex-row items-center gap-2">
          {request.child?.requestedClass ? (
            <View className="self-start rounded-full bg-sky px-2.5 py-1">
              <Text className="text-[11px] font-bold text-sky-ink" numberOfLines={1}>
                {request.child.requestedClass.name}
              </Text>
            </View>
          ) : null}
          <View className="flex-1" />
          <View className="flex-row items-center gap-1">
            <Ionicons name="time-outline" size={12} color={MUTED} />
            <Text className="text-[11px] text-muted">{formatDayMonth(request.createdAt, i18n.language)}</Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={MUTED} />
    </Pressable>
  );
}
