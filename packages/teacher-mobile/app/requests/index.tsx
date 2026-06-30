import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FilterChips } from '@/components/common/filter-chips';
import { ScreenHeader } from '@/components/common/screen-header';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { useCanApproveMembers, useCenterId, useJoinRequests } from '@/data/teacher';
import { orpc } from '@/lib/orpc';
import { teacherQueryKeys } from '@/lib/query-keys';

type Status = 'pending' | 'approved' | 'rejected';
type ApiRequest = NonNullable<ReturnType<typeof useJoinRequests>['data']>[number];

function RequestCard({
  request,
  status,
  centerId,
  canApprove,
}: {
  request: ApiRequest;
  status: Status;
  centerId: string;
  canApprove: boolean;
}) {
  const { t } = useTranslation('teacher');
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['teacher', 'join-requests'] });

  const approve = useMutation({
    mutationFn: () =>
      orpc.director.approveJoinRequest({
        centerId,
        requestId: request.id,
        classId: request.child?.requestedClass?.id,
      }),
    onSuccess: invalidate,
  });
  const reject = useMutation({
    mutationFn: () => orpc.director.rejectJoinRequest({ centerId, requestId: request.id }),
    onSuccess: invalidate,
  });
  const busy = approve.isPending || reject.isPending;

  return (
    <Card>
      <View className="flex-row items-center gap-3">
        <Avatar uri={request.child?.photoUrl ?? null} size={44} />
        <View className="flex-1">
          <Text className="text-[15px] font-bold text-foreground">
            {request.child?.name ?? request.requester.fullName}
          </Text>
          <Text numberOfLines={1} className="text-[13px] text-muted">
            {request.child
              ? t('requests.byParent', { name: request.requester.fullName })
              : request.requester.phoneNumber ?? request.requester.username ?? ''}
          </Text>
          {request.child?.requestedClass ? (
            <View className="mt-1.5 self-start rounded-full bg-sky px-2.5 py-1">
              <Text className="text-[11px] font-bold text-sky-ink">
                {request.child.requestedClass.name}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {status === 'pending' && canApprove ? (
        <View className="mt-3 flex-row gap-2">
          <Pressable
            disabled={busy}
            onPress={() => approve.mutate()}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-md bg-primary py-2.5">
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            <Text className="text-[13px] font-bold text-white">{t('requests.approve')}</Text>
          </Pressable>
          <Pressable
            disabled={busy}
            onPress={() => reject.mutate()}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-md bg-pill py-2.5">
            <Ionicons name="close" size={16} color="#E8674E" />
            <Text className="text-[13px] font-bold text-coral-ink">{t('requests.reject')}</Text>
          </Pressable>
        </View>
      ) : null}
    </Card>
  );
}

export default function RequestsScreen() {
  const { t } = useTranslation('teacher');
  const [filter, setFilter] = useState<Status>('pending');
  const centerId = useCenterId();
  const canApprove = useCanApproveMembers();
  const query = useJoinRequests(filter);
  const requests = query.data ?? [];

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={t('requests.title')} back />
      {!canApprove ? (
        <View className="mx-4 mt-3 flex-row items-center gap-2 rounded-md bg-sunshine px-3 py-2.5">
          <Ionicons name="information-circle" size={18} color="#F4A621" />
          <Text className="flex-1 text-[12px] text-foreground">{t('requests.readOnly')}</Text>
        </View>
      ) : null}
      <FilterChips
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'pending', label: t('requests.status.pending') },
          { value: 'approved', label: t('requests.status.approved') },
          { value: 'rejected', label: t('requests.status.rejected') },
        ]}
      />
      {query.isPending ? (
        <Loader />
      ) : requests.length === 0 ? (
        <View className="p-4">
          <EmptyState icon="person-add-outline" title={t('requests.empty')} body={t('requests.emptyBody')} />
        </View>
      ) : (
        <ScrollView contentContainerClassName="gap-3 p-4" showsVerticalScrollIndicator={false}>
          {requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              status={filter}
              centerId={centerId ?? ''}
              canApprove={canApprove}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
