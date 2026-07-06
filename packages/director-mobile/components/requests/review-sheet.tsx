import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ComponentProps, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { RequestKindBadge } from '@/components/requests/status-chip';
import { Avatar } from '@/components/ui/avatar';
import { colors } from '@/constants/theme';
import type { JoinRequest } from '@/data/teacher';
import { formatLongDate } from '@/lib/date';
import { orpc } from '@/lib/orpc';
import { cn } from '@/lib/utils';

type IconName = ComponentProps<typeof Ionicons>['name'];

const GRAPE_INK = '#7C5CD8';

function Fact({ icon, label, value, last }: { icon: IconName; label: string; value: string; last?: boolean }) {
  return (
    <View className={cn('flex-row items-center gap-3 px-3.5 py-3', !last && 'border-b border-border')}>
      <View className="h-8 w-8 items-center justify-center rounded-full bg-grape">
        <Ionicons name={icon} size={15} color={GRAPE_INK} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[11px] font-semibold uppercase text-muted">{label}</Text>
        <Text className="text-[15px] font-semibold text-foreground">{value}</Text>
      </View>
    </View>
  );
}

/**
 * The one place a teacher acts on a request. Shows who is joining (and, for a
 * parent, the child they are enrolling), then — while the request is pending and
 * the teacher may approve — lets her place the child in a class, add an optional
 * note, and approve or reject. Read-only viewers see the outcome instead.
 */
export function RequestReviewSheet({
  request,
  centerId,
  canApprove,
  classes,
  onClose,
}: {
  request: JoinRequest | null;
  centerId: string;
  canApprove: boolean;
  classes: { id: string; name: string }[];
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation('teacher');
  const { height } = useWindowDimensions();
  const queryClient = useQueryClient();
  const [pickedClassId, setPickedClassId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset the form whenever a different request opens.
  useEffect(() => {
    setPickedClassId('');
    setReason('');
    setError(null);
  }, [request?.id]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['teacher', 'join-requests'] });

  const approve = useMutation({
    mutationFn: (row: JoinRequest) =>
      orpc.director.approveJoinRequest({
        centerId,
        requestId: row.id,
        classId: row.child?.requestedClass?.id ?? (pickedClassId || undefined),
      }),
    onSuccess: async () => {
      await invalidate();
      onClose();
    },
    onError: () => setError(t('requests.review.actionError')),
  });

  const reject = useMutation({
    mutationFn: (row: JoinRequest) =>
      orpc.director.rejectJoinRequest({ centerId, requestId: row.id, reason: reason.trim() || undefined }),
    onSuccess: async () => {
      await invalidate();
      onClose();
    },
    onError: () => setError(t('requests.review.actionError')),
  });

  const busy = approve.isPending || reject.isPending;

  if (!request) return null;

  const isParent = request.kind === 'parent';
  const child = request.child;
  const needsClass = isParent && !child?.requestedClass;
  const isPending = request.status === 'pending';
  const canAct = canApprove && isPending;

  function onApprove(row: JoinRequest) {
    if (needsClass && !pickedClassId) {
      setError(t('requests.review.pickClass'));
      return;
    }
    setError(null);
    approve.mutate(row);
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-black/40">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="max-h-[88%] rounded-t-3xl bg-card px-4 pb-8 pt-3">
          <View className="mb-3 items-center">
            <View className="h-1 w-10 rounded-full bg-segment" />
          </View>

          <ScrollView
            style={{ maxHeight: height * 0.68 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {/* Who is joining */}
            <View className="flex-row items-center gap-3">
              <Avatar uri={isParent ? child?.photoUrl ?? null : null} size={52} />
              <View className="min-w-0 flex-1 gap-1">
                <RequestKindBadge kind={request.kind} />
                <Text className="text-[17px] font-extrabold text-foreground" numberOfLines={1}>
                  {request.requester.fullName}
                </Text>
                <Text className="text-[13px] text-muted" numberOfLines={1}>
                  {request.requester.phoneNumber ?? t('requests.review.noPhone')}
                  {' · '}
                  {request.requester.username ?? t('requests.review.noUsername')}
                </Text>
              </View>
            </View>

            {/* Child facts (parent requests only) */}
            {isParent && child ? (
              <View className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
                <Fact icon="happy-outline" label={t('requests.review.child')} value={child.name} />
                <Fact
                  icon="calendar-outline"
                  label={t('requests.review.dateOfBirth')}
                  value={child.dateOfBirth ? formatLongDate(child.dateOfBirth, i18n.language) : '—'}
                />
                {child.gender ? (
                  <Fact icon="male-female-outline" label={t('requests.review.gender')} value={child.gender} />
                ) : null}
                <Fact
                  icon="people-outline"
                  label={t('requests.review.requestedClass')}
                  value={child.requestedClass?.name ?? t('requests.review.notPicked')}
                />
                <Fact
                  icon="heart-outline"
                  label={t('requests.review.relationship')}
                  value={child.relationship ?? child.customRelationshipLabel ?? '—'}
                  last
                />
              </View>
            ) : null}

            {/* Applicant's message */}
            {request.message ? (
              <View className="mt-3 rounded-2xl bg-background p-3.5">
                <Text className="text-[11px] font-semibold uppercase text-muted">
                  {t('requests.review.message')}
                </Text>
                <Text className="mt-1 text-[14px] leading-5 text-foreground">{request.message}</Text>
              </View>
            ) : null}

            {/* Assign a class — only when a parent request has no requested class */}
            {canAct && needsClass ? (
              <View className="mt-4">
                <Text className="text-[13px] font-bold text-foreground">
                  {t('requests.review.assignClass')}
                </Text>
                <Text className="mt-0.5 text-[12px] text-muted">{t('requests.review.assignClassHint')}</Text>
                {classes.length === 0 ? (
                  <Text className="mt-2 text-[13px] text-coral-ink">{t('requests.review.noClasses')}</Text>
                ) : (
                  <View className="mt-2.5 flex-row flex-wrap gap-2">
                    {classes.map((klass) => {
                      const active = pickedClassId === klass.id;
                      return (
                        <Pressable
                          key={klass.id}
                          onPress={() => {
                            setPickedClassId(klass.id);
                            setError(null);
                          }}
                          className={cn(
                            'rounded-full border px-3.5 py-2',
                            active ? 'border-grape-ink bg-grape-ink' : 'border-border bg-card',
                          )}>
                          <Text className={cn('text-[13px] font-semibold', active ? 'text-white' : 'text-foreground')}>
                            {klass.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            ) : null}

            {/* Optional rejection note */}
            {canAct ? (
              <View className="mt-4">
                <Text className="text-[13px] font-bold text-foreground">{t('requests.review.rejectionNote')}</Text>
                <TextInput
                  value={reason}
                  onChangeText={setReason}
                  placeholder={t('requests.review.rejectionPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  multiline
                  className="mt-2 min-h-[64px] rounded-xl border border-border bg-background px-3 py-2.5 text-[15px] text-foreground"
                  style={{ textAlignVertical: 'top' }}
                />
              </View>
            ) : null}

            {error ? <Text className="mt-3 text-[13px] font-semibold text-coral-ink">{error}</Text> : null}

            {/* Read-only pending notice */}
            {!canApprove && isPending ? (
              <View className="mt-4 flex-row items-center gap-2 rounded-2xl bg-sunshine px-3.5 py-3">
                <Ionicons name="hourglass-outline" size={18} color="#F4A621" />
                <Text className="flex-1 text-[13px] text-foreground">{t('requests.review.pendingReadOnly')}</Text>
              </View>
            ) : null}

            {/* Outcome for a resolved request */}
            {!isPending ? (
              <View
                className={cn(
                  'mt-4 rounded-2xl p-3.5',
                  request.status === 'approved' ? 'bg-mint' : request.status === 'rejected' ? 'bg-coral' : 'bg-pill',
                )}>
                <Text
                  className={cn(
                    'text-[13px] font-bold',
                    request.status === 'approved'
                      ? 'text-mint-ink'
                      : request.status === 'rejected'
                        ? 'text-coral-ink'
                        : 'text-muted',
                  )}>
                  {t(`requests.status.${request.status}`)}
                  {request.reviewedBy ? ` · ${t('requests.review.reviewedBy', { name: request.reviewedBy.fullName })}` : ''}
                </Text>
                {request.reviewerMessage ? (
                  <Text className="mt-1 text-[14px] leading-5 text-foreground">{request.reviewerMessage}</Text>
                ) : null}
              </View>
            ) : null}
          </ScrollView>

          {/* Actions */}
          {canAct ? (
            <View className="mt-4 flex-row gap-3">
              <Pressable
                onPress={() => reject.mutate(request)}
                disabled={busy}
                className={cn(
                  'flex-1 flex-row items-center justify-center gap-1.5 rounded-full border border-coral-ink py-3',
                  busy && 'opacity-60',
                )}>
                {reject.isPending ? (
                  <ActivityIndicator size="small" color="#E8674E" />
                ) : (
                  <Ionicons name="close" size={17} color="#E8674E" />
                )}
                <Text className="text-[15px] font-bold text-coral-ink">{t('requests.reject')}</Text>
              </Pressable>
              <Pressable
                onPress={() => onApprove(request)}
                disabled={busy}
                className={cn(
                  'flex-1 flex-row items-center justify-center gap-1.5 rounded-full bg-mint-ink py-3',
                  busy && 'opacity-60',
                )}>
                {approve.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                )}
                <Text className="text-[15px] font-bold text-white">{t('requests.approve')}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={onClose} className="mt-4 items-center rounded-full bg-pill py-3">
              <Text className="text-[15px] font-bold text-muted">{t('requests.done')}</Text>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
