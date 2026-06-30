import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/screen-header';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { useStaffAttendance } from '@/data/teacher';
import { formatTime, todayIsoDate } from '@/lib/date';
import { orpc } from '@/lib/orpc';
import { teacherQueryKeys } from '@/lib/query-keys';

type ApiRecord = NonNullable<ReturnType<typeof useStaffAttendance>['data']>['records'][number];

const STATUS_TONE: Record<string, { bg: string; text: string }> = {
  present: { bg: 'bg-mint', text: 'text-mint-ink' },
  late: { bg: 'bg-sunshine', text: 'text-sunshine-ink' },
  left_early: { bg: 'bg-sunshine', text: 'text-sunshine-ink' },
  picked_up: { bg: 'bg-sky', text: 'text-sky-ink' },
  absent: { bg: 'bg-coral', text: 'text-coral-ink' },
  excused: { bg: 'bg-coral', text: 'text-coral-ink' },
  not_checked_in: { bg: 'bg-pill', text: 'text-muted' },
};

const STATUS_LABEL: Record<string, string> = {
  present: 'present',
  late: 'late',
  left_early: 'leftEarly',
  picked_up: 'pickedUp',
  absent: 'absent',
  excused: 'excused',
  not_checked_in: 'notIn',
};

function SummaryChip({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View className="flex-1 items-center">
      <Text className={`text-xl font-extrabold ${color}`}>{value}</Text>
      <Text className="text-[11px] text-muted">{label}</Text>
    </View>
  );
}

function ChildRow({ record, date }: { record: ApiRecord; date: string }) {
  const { t } = useTranslation('teacher');
  const queryClient = useQueryClient();
  const childId = record.child.id;

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: teacherQueryKeys.attendance(date) });

  const checkIn = useMutation({
    mutationFn: () => orpc.attendance.checkIn({ childId, attendanceDate: date }),
    onSuccess: invalidate,
  });
  const checkOut = useMutation({
    mutationFn: () => orpc.attendance.checkOut({ childId, attendanceDate: date }),
    onSuccess: invalidate,
  });
  const markAbsent = useMutation({
    mutationFn: () => orpc.attendance.markStatus({ childId, attendanceDate: date, status: 'absent' }),
    onSuccess: invalidate,
  });

  const busy = checkIn.isPending || checkOut.isPending || markAbsent.isPending;
  const tone = STATUS_TONE[record.status] ?? STATUS_TONE.not_checked_in;
  const initial = record.child.name.trim().charAt(0).toUpperCase() || '·';
  const here = record.status === 'present' || record.status === 'late';

  return (
    <Card className="gap-3">
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-grape">
          <Text className="font-extrabold text-grape-ink">{initial}</Text>
        </View>
        <View className="flex-1">
          <Text numberOfLines={1} className="text-[15px] font-bold text-foreground">
            {record.child.name}
          </Text>
          <Text className="text-[12px] text-muted">
            {record.checkedInAt ? t('attendance.checkedInAt', { time: formatTime(record.checkedInAt) }) : (record.child.className ?? '')}
          </Text>
        </View>
        <View className={`rounded-full px-2.5 py-1 ${tone.bg}`}>
          <Text className={`text-[11px] font-bold ${tone.text}`}>
            {t(`attendance.${STATUS_LABEL[record.status] ?? 'notIn'}`)}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-2">
        {record.status === 'not_checked_in' ? (
          <>
            <Pressable
              disabled={busy}
              onPress={() => checkIn.mutate()}
              className="flex-1 items-center rounded-md bg-primary py-2.5">
              <Text className="text-[13px] font-bold text-white">{t('attendance.checkIn')}</Text>
            </Pressable>
            <Pressable
              disabled={busy}
              onPress={() => markAbsent.mutate()}
              className="flex-1 items-center rounded-md bg-pill py-2.5">
              <Text className="text-[13px] font-bold text-foreground">{t('attendance.markAbsent')}</Text>
            </Pressable>
          </>
        ) : here ? (
          <Pressable
            disabled={busy}
            onPress={() => checkOut.mutate()}
            className="flex-1 items-center rounded-md bg-pill py-2.5">
            <Text className="text-[13px] font-bold text-foreground">{t('attendance.checkOut')}</Text>
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

export default function AttendanceScreen() {
  const { t } = useTranslation('teacher');
  const date = todayIsoDate();
  const query = useStaffAttendance(date);
  const summary = query.data?.summary;
  const records = query.data?.records ?? [];

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={t('attendance.title')} back />
      {query.isPending ? (
        <Loader />
      ) : (
        <ScrollView contentContainerClassName="gap-3 p-4" showsVerticalScrollIndicator={false}>
          {summary ? (
            <Card className="flex-row">
              <SummaryChip value={summary.present + summary.late} label={t('attendance.here')} color="text-mint-ink" />
              <SummaryChip value={summary.late} label={t('attendance.late')} color="text-sunshine-ink" />
              <SummaryChip value={summary.absent + summary.excused} label={t('attendance.absent')} color="text-coral-ink" />
              <SummaryChip value={summary.notCheckedIn} label={t('attendance.notIn')} color="text-muted" />
            </Card>
          ) : null}

          {records.length === 0 ? (
            <EmptyState icon="calendar-outline" title={t('attendance.empty')} body={t('classes.emptyBody')} />
          ) : (
            records.map((record) => <ChildRow key={record.child.id} record={record} date={date} />)
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
