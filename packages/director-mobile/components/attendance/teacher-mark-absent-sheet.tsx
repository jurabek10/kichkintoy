import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ComponentProps, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { orpc } from '@/lib/orpc';
import { cn } from '@/lib/utils';

type IconName = ComponentProps<typeof Ionicons>['name'];

const REASONS: { key: string; icon: IconName }[] = [
  { key: 'sick', icon: 'medkit-outline' },
  { key: 'doctorVisit', icon: 'medical-outline' },
  { key: 'familyReason', icon: 'people-outline' },
  { key: 'travel', icon: 'airplane-outline' },
  { key: 'other', icon: 'ellipsis-horizontal-circle-outline' },
];

function errorMessage(error: unknown) {
  if (error && typeof error === 'object') {
    const response = 'response' in error ? error.response : null;
    if (response && typeof response === 'object' && 'message' in response) {
      const message = response.message;
      if (typeof message === 'string') return message;
    }
  }
  return '';
}

export function TeacherMarkAbsentSheet({
  visible,
  childId,
  childName,
  date,
  onClose,
}: {
  visible: boolean;
  childId: string;
  childName: string;
  date: string;
  onClose: () => void;
}) {
  const { t } = useTranslation('attendance');
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [reasonKey, setReasonKey] = useState('sick');
  const [custom, setCustom] = useState('');
  const [note, setNote] = useState('');

  const NOTE_MAX = 500;
  const reason = reasonKey === 'other' ? custom.trim() : t(`absenceReasons.${reasonKey}`);

  const markAbsent = useMutation({
    mutationFn: () =>
      orpc.attendance.markStatus({
        childId,
        attendanceDate: date,
        status: 'absent',
        absenceReason: reason,
        parentVisibleNote: note.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher', 'attendance'] as const });
      setReasonKey('sick');
      setCustom('');
      setNote('');
      onClose();
    },
  });

  const canSubmit = !!childId && reason.length > 0 && !markAbsent.isPending;
  const apiError = errorMessage(markAbsent.error);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-black/40">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="max-h-[88%] rounded-t-3xl bg-card" style={{ paddingBottom: insets.bottom + 12 }}>
          <View className="flex-row items-center justify-between border-b border-border px-4 py-3.5">
            <View className="flex-1 pr-3">
              <Text className="text-base font-extrabold text-foreground">
                {t('markAbsentFor', { name: childName })}
              </Text>
              <Text className="text-xs text-muted">{t('pickReason')}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-4 p-4">
            <View className="gap-2">
              <Text className="text-sm font-bold text-foreground">{t('pickReason')}</Text>
              <View className="flex-row flex-wrap gap-2">
                {REASONS.map((item) => {
                  const active = reasonKey === item.key;
                  return (
                    <Pressable
                      key={item.key}
                      onPress={() => setReasonKey(item.key)}
                      className={cn(
                        'flex-row items-center gap-2 rounded-xl border px-3 py-2.5',
                        active ? 'border-primary bg-sky' : 'border-border bg-card',
                      )}>
                      <Ionicons
                        name={item.icon}
                        size={18}
                        color={active ? colors.primary : colors.textSecondary}
                      />
                      <Text
                        className={cn(
                          'text-sm font-semibold',
                          active ? 'text-primary' : 'text-foreground',
                        )}>
                        {t(`absenceReasons.${item.key}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {reasonKey === 'other' ? (
                <TextInput
                  value={custom}
                  onChangeText={setCustom}
                  placeholder={t('otherReasonPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  multiline
                  maxLength={300}
                  className="min-h-[80px] rounded-xl border border-border bg-background p-3 text-[15px] text-foreground"
                />
              ) : null}
            </View>

            <View className="gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-bold text-foreground">{t('shortNote')}</Text>
                <Text className="text-xs text-muted">
                  {note.length}/{NOTE_MAX}
                </Text>
              </View>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder={t('notePlaceholder')}
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={NOTE_MAX}
                className="min-h-[80px] rounded-xl border border-border bg-background p-3 text-[15px] text-foreground"
              />
            </View>

            {apiError ? (
              <View className="rounded-xl bg-coral px-3 py-2.5">
                <Text className="text-[13px] font-semibold text-coral-ink">{apiError}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={() => markAbsent.mutate()}
              disabled={!canSubmit}
              className={cn(
                'mt-1 flex-row items-center justify-center gap-2 rounded-xl py-3.5',
                canSubmit ? 'bg-primary' : 'bg-pill',
              )}>
              <Ionicons name="checkmark-circle" size={18} color={canSubmit ? '#FFFFFF' : colors.textMuted} />
              <Text className={cn('text-base font-bold', canSubmit ? 'text-white' : 'text-muted')}>
                {markAbsent.isPending ? '...' : t('saveAbsent')}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
