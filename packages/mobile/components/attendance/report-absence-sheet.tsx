import { Ionicons } from '@expo/vector-icons';
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

import { useReportAbsence } from '@/data/attendance';
import { colors } from '@/constants/theme';
import { todayIsoDate } from '@/lib/date';
import { cn } from '@/lib/utils';

type IconName = ComponentProps<typeof Ionicons>['name'];

const REASONS: { key: string; icon: IconName }[] = [
  { key: 'sick', icon: 'medkit-outline' },
  { key: 'doctorVisit', icon: 'medical-outline' },
  { key: 'familyReason', icon: 'people-outline' },
  { key: 'travel', icon: 'airplane-outline' },
  { key: 'other', icon: 'ellipsis-horizontal-circle-outline' },
];

const pad = (n: number) => String(n).padStart(2, '0');
function tomorrowIso() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** A bottom-sheet form to tell the teacher a child won't come: pick the child
 *  (when there's more than one), the day (today / tomorrow), and a reason chip;
 *  "Other" reveals a free-text line. One tap sends it to the teacher. */
export function ReportAbsenceSheet({
  visible,
  onClose,
  childrenList,
  defaultChildId,
  onSubmitted,
}: {
  visible: boolean;
  onClose: () => void;
  childrenList: { id: string; name: string }[];
  defaultChildId?: string;
  onSubmitted?: (date: string) => void;
}) {
  const { t } = useTranslation('attendance');
  const insets = useSafeAreaInsets();
  const report = useReportAbsence();

  const [childId, setChildId] = useState(defaultChildId ?? childrenList[0]?.id ?? '');
  const [date, setDate] = useState(todayIsoDate());
  const [reasonKey, setReasonKey] = useState('sick');
  const [custom, setCustom] = useState('');
  const [note, setNote] = useState('');

  const NOTE_MAX = 500;

  const effectiveChildId = childId || childrenList[0]?.id || '';
  const reason = reasonKey === 'other' ? custom.trim() : t(`absenceReasons.${reasonKey}`);
  const canSubmit = !!effectiveChildId && reason.length > 0 && !report.isPending;

  const dayChips = [
    { value: todayIsoDate(), label: t('today') },
    { value: tomorrowIso(), label: t('tomorrow') },
  ];

  function submit() {
    if (!canSubmit) return;
    report.mutate(
      {
        childId: effectiveChildId,
        attendanceDate: date,
        absenceReason: reason,
        parentVisibleNote: note.trim() || undefined,
      },
      {
        onSuccess: () => {
          setCustom('');
          setReasonKey('sick');
          setNote('');
          onSubmitted?.(date);
          onClose();
        },
      },
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-black/40">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="max-h-[88%] rounded-t-3xl bg-card" style={{ paddingBottom: insets.bottom + 12 }}>
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-border px-4 py-3.5">
            <View className="flex-1">
              <Text className="text-base font-extrabold text-foreground">{t('reportAbsence')}</Text>
              <Text className="text-xs text-muted">{t('reportAbsenceDescription')}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-4 p-4">
            {/* Child */}
            {childrenList.length > 1 ? (
              <View className="gap-2">
                <Text className="text-sm font-bold text-foreground">{t('whichChild')}</Text>
                <View className="flex-row flex-wrap gap-2">
                  {childrenList.map((child) => {
                    const active = child.id === effectiveChildId;
                    return (
                      <Pressable
                        key={child.id}
                        onPress={() => setChildId(child.id)}
                        className={cn(
                          'rounded-full px-3.5 py-2',
                          active ? 'bg-primary' : 'bg-pill',
                        )}>
                        <Text
                          className={cn('text-sm font-bold', active ? 'text-white' : 'text-muted')}>
                          {child.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {/* Day */}
            <View className="gap-2">
              <Text className="text-sm font-bold text-foreground">{t('whichDay')}</Text>
              <View className="flex-row gap-2">
                {dayChips.map((chip) => {
                  const active = chip.value === date;
                  return (
                    <Pressable
                      key={chip.value}
                      onPress={() => setDate(chip.value)}
                      className={cn(
                        'flex-1 items-center rounded-xl border py-3',
                        active ? 'border-primary bg-primary' : 'border-border bg-card',
                      )}>
                      <Text
                        className={cn('text-sm font-bold', active ? 'text-white' : 'text-muted')}>
                        {chip.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Reason */}
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

            {/* Note for teacher (optional) */}
            <View className="gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-bold text-foreground">{t('noteForTeacher')}</Text>
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

            {/* Submit — coral to match the "report absence" action it completes. */}
            <Pressable
              onPress={submit}
              disabled={!canSubmit}
              className={cn(
                'mt-1 flex-row items-center justify-center gap-2 rounded-xl py-3.5',
                canSubmit ? '' : 'bg-pill',
              )}
              style={canSubmit ? { backgroundColor: '#E8674E' } : undefined}>
              <Ionicons
                name="paper-plane"
                size={17}
                color={canSubmit ? '#FFFFFF' : colors.textMuted}
              />
              <Text
                className={cn(
                  'text-base font-bold',
                  canSubmit ? 'text-white' : 'text-muted',
                )}>
                {report.isPending ? '…' : t('submitAbsence')}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
