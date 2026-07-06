import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type ComponentProps, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { TeacherMarkAbsentSheet } from '@/components/attendance/teacher-mark-absent-sheet';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { Card } from '@/components/ui/card';
import { useStaffAttendance } from '@/data/teacher';
import { formatTime } from '@/lib/date';
import { orpc } from '@/lib/orpc';
import { cn } from '@/lib/utils';

type AttendanceRecord = NonNullable<ReturnType<typeof useStaffAttendance>['data']>['records'][number];
type IconName = ComponentProps<typeof Ionicons>['name'];

const SKY = { bg: '#E1F0FF', ink: '#3E8FE0' };

// Present tone / absent tone reused by the action buttons so the button colour
// matches the state it produces.
const PRESENT_INK = '#46B06A';
const ABSENT_INK = '#E8674E';

/** Per-status look: pill colours, the accent rail ink, an icon, and the i18n
 *  key. The rail ink is the spine you read down the roster. */
const STATUS_META: Record<
  string,
  { bg: string; text: string; ink: string; icon: IconName; label: string }
> = {
  present: { bg: 'bg-mint', text: 'text-mint-ink', ink: PRESENT_INK, icon: 'checkmark-circle', label: 'present' },
  late: { bg: 'bg-sunshine', text: 'text-sunshine-ink', ink: '#F4A621', icon: 'time', label: 'late' },
  left_early: { bg: 'bg-sunshine', text: 'text-sunshine-ink', ink: '#F4A621', icon: 'exit', label: 'leftEarly' },
  picked_up: { bg: 'bg-sky', text: 'text-sky-ink', ink: SKY.ink, icon: 'exit', label: 'pickedUp' },
  absent: { bg: 'bg-coral', text: 'text-coral-ink', ink: ABSENT_INK, icon: 'close-circle', label: 'absent' },
  excused: { bg: 'bg-coral', text: 'text-coral-ink', ink: ABSENT_INK, icon: 'medkit', label: 'excused' },
  not_checked_in: { bg: 'bg-pill', text: 'text-muted', ink: '#D6D9DE', icon: 'ellipse-outline', label: 'notIn' },
};

/** Gender → the tint for a child's monogram fallback (boys sky, girls pink). */
function genderFallback(gender: AttendanceRecord['child']['gender']) {
  if (gender === 'boy') return { bg: 'bg-sky', text: 'text-sky-ink' };
  if (gender === 'girl') return { bg: 'bg-bubblegum', text: 'text-bubblegum-ink' };
  return { bg: 'bg-grape', text: 'text-grape-ink' };
}

export function TeacherAttendanceRow({ record, date }: { record: AttendanceRecord; date: string }) {
  const { t } = useTranslation('teacher');
  const queryClient = useQueryClient();
  const [absentOpen, setAbsentOpen] = useState(false);
  const childId = record.child.id;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['teacher', 'attendance'] as const });

  const checkIn = useMutation({
    mutationFn: () => orpc.attendance.checkIn({ childId, attendanceDate: date }),
    onSuccess: invalidate,
  });
  const checkOut = useMutation({
    mutationFn: () => orpc.attendance.checkOut({ childId, attendanceDate: date }),
    onSuccess: invalidate,
  });
  const busy = checkIn.isPending || checkOut.isPending;

  const meta = STATUS_META[record.status] ?? STATUS_META.not_checked_in;
  const avatarTone = genderFallback(record.child.gender);
  const pending = record.status === 'not_checked_in';
  const here = record.status === 'present' || record.status === 'late';
  const sub = record.checkedOutAt
    ? t('attendance.checkedOutAt', { time: formatTime(record.checkedOutAt) })
    : record.checkedInAt
      ? t('attendance.checkedInAt', { time: formatTime(record.checkedInAt) })
      : (record.child.className ?? '');

  return (
    <>
      <Card className="relative gap-3 overflow-hidden pl-5">
        {/* Status spine — the glance signal down the roster. */}
        <View className="absolute bottom-0 left-0 top-0 w-1.5" style={{ backgroundColor: meta.ink }} />

        <View className="flex-row items-center gap-3">
          <ProfileAvatar
            photo={record.child.photoUrl}
            name={record.child.name}
            size={44}
            fallbackClassName={avatarTone.bg}
            fallbackTextClassName={avatarTone.text}
          />
          <View className="flex-1">
            <Text numberOfLines={1} className="text-[15px] font-bold text-foreground">
              {record.child.name}
            </Text>
            {sub ? <Text className="mt-0.5 text-[12px] text-muted">{sub}</Text> : null}
          </View>
          {pending ? null : (
            <View className={cn('flex-row items-center gap-1 rounded-full px-2.5 py-1', meta.bg)}>
              <Ionicons name={meta.icon} size={12} color={meta.ink} />
              <Text className={cn('text-[11px] font-bold', meta.text)}>
                {t(`attendance.${meta.label}`)}
              </Text>
            </View>
          )}
        </View>

        {pending ? (
          <View className="flex-row gap-2">
            <Pressable
              disabled={busy}
              onPress={() => checkIn.mutate()}
              style={{ backgroundColor: PRESENT_INK }}
              className={cn('flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2.5', busy && 'opacity-60')}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              <Text className="text-[13px] font-bold text-white">{t('attendance.checkIn')}</Text>
            </Pressable>
            <Pressable
              disabled={busy}
              onPress={() => setAbsentOpen(true)}
              className={cn('flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-coral py-2.5', busy && 'opacity-60')}>
              <Ionicons name="close" size={16} color={ABSENT_INK} />
              <Text className="text-[13px] font-bold text-coral-ink">{t('attendance.markAbsent')}</Text>
            </Pressable>
          </View>
        ) : here ? (
          <Pressable
            disabled={busy}
            onPress={() => checkOut.mutate()}
            className={cn('flex-row items-center justify-center gap-1.5 rounded-xl bg-sky py-2.5', busy && 'opacity-60')}>
            <Ionicons name="log-out-outline" size={16} color={SKY.ink} />
            <Text className="text-[13px] font-bold text-sky-ink">{t('attendance.checkOut')}</Text>
          </Pressable>
        ) : null}
      </Card>

      <TeacherMarkAbsentSheet
        visible={absentOpen}
        childId={childId}
        childName={record.child.name}
        date={date}
        onClose={() => setAbsentOpen(false)}
      />
    </>
  );
}
