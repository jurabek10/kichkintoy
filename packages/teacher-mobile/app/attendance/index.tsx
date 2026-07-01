import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AttendanceFilterSheet,
  statusBucket,
  type SexFilter,
  type StatusFilter,
} from '@/components/attendance/attendance-filter-sheet';
import { TeacherAttendanceRow } from '@/components/attendance/teacher-attendance-row';
import { DatePickerField } from '@/components/common/date-picker-field';
import { ScreenHeader } from '@/components/common/screen-header';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { colors } from '@/constants/theme';
import { useStaffAttendance, useTeacherClasses } from '@/data/teacher';
import { todayIsoDate } from '@/lib/date';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 8;

function SummaryChip({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View className="flex-1 items-center">
      <Text className={`text-xl font-extrabold ${color}`}>{value}</Text>
      <Text className="text-[11px] text-muted">{label}</Text>
    </View>
  );
}

export default function AttendanceScreen() {
  const { t } = useTranslation('teacher');
  const [date, setDate] = useState(todayIsoDate());
  const [classId, setClassId] = useState('all');
  const [search, setSearch] = useState('');
  const [sex, setSex] = useState<SexFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(0);

  const classes = useTeacherClasses();
  const query = useStaffAttendance(date, classId);
  const summary = query.data?.summary;
  const records = useMemo(() => query.data?.records ?? [], [query.data]);
  const selectedClassName =
    classId === 'all'
      ? classes.data.length === 1
        ? classes.data[0].name
        : t('attendance.allClasses')
      : (classes.data.find((klass) => klass.id === classId)?.name ?? t('attendance.allClasses'));

  useEffect(() => setPage(0), [date, classId, search, sex, status]);

  const boys = records.filter((r) => r.child.gender === 'boy').length;
  const girls = records.filter((r) => r.child.gender === 'girl').length;
  const filtersOn = classId !== 'all' || sex !== 'all' || status !== 'all';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter(
      (r) =>
        (sex === 'all' || r.child.gender === sex) &&
        (status === 'all' || statusBucket(r.status) === status) &&
        (q === '' || r.child.name.toLowerCase().includes(q)),
    );
  }, [records, search, sex, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={t('attendance.title')} back />
      <ScrollView
        contentContainerClassName="gap-3 p-4"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <DatePickerField value={date} onChange={setDate} />

        {query.isPending ? (
          <Loader />
        ) : records.length === 0 ? (
          <EmptyState icon="calendar-outline" title={t('attendance.empty')} body={t('classes.emptyBody')} />
        ) : (
          <>
            {summary ? (
              <Card className="gap-3">
                <View className="flex-row items-center justify-between">
                  <Text numberOfLines={1} className="flex-1 pr-3 text-[15px] font-bold text-foreground">
                    {selectedClassName}
                  </Text>
                  <Text className="text-[13px] font-semibold text-muted">
                    {t('attendance.childrenCount', { count: records.length })}
                  </Text>
                </View>
                <View className="flex-row border-t border-border pt-3">
                  <SummaryChip
                    value={summary.present + summary.late}
                    label={t('attendance.here')}
                    color="text-mint-ink"
                  />
                  <SummaryChip value={summary.late} label={t('attendance.late')} color="text-sunshine-ink" />
                  <SummaryChip
                    value={summary.absent + summary.excused}
                    label={t('attendance.absent')}
                    color="text-coral-ink"
                  />
                  <SummaryChip value={summary.notCheckedIn} label={t('attendance.notIn')} color="text-muted" />
                </View>
              </Card>
            ) : null}

            <View className="flex-row items-center gap-2">
              <View className="h-11 flex-1 flex-row items-center gap-2 rounded-md border border-border bg-card px-3">
                <Ionicons name="search" size={18} color={colors.textSecondary} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder={t('attendance.search')}
                  placeholderTextColor={colors.textMuted}
                  className="h-11 flex-1 text-[15px] text-foreground"
                  returnKeyType="search"
                />
                {search ? (
                  <Pressable onPress={() => setSearch('')} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </Pressable>
                ) : null}
              </View>
              <Pressable
                onPress={() => setFilterOpen(true)}
                className={cn(
                  'h-11 w-11 items-center justify-center rounded-md border',
                  filtersOn ? 'border-primary bg-primary' : 'border-border bg-card',
                )}>
                <Ionicons name="funnel" size={17} color={filtersOn ? '#FFFFFF' : colors.textSecondary} />
              </Pressable>
            </View>

            {filtered.length === 0 ? (
              <EmptyState icon="search-outline" title={t('attendance.noMatch')} body={t('attendance.noMatchBody')} />
            ) : (
              pageItems.map((record) => <TeacherAttendanceRow key={record.child.id} record={record} date={date} />)
            )}

            {totalPages > 1 ? (
              <View className="flex-row items-center justify-between">
                <Pressable
                  disabled={safePage === 0}
                  onPress={() => setPage(safePage - 1)}
                  hitSlop={8}
                  className={cn(
                    'h-10 w-10 items-center justify-center rounded-full border border-border',
                    safePage === 0 ? 'opacity-40' : 'bg-card',
                  )}>
                  <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
                </Pressable>
                <Text className="text-[13px] font-semibold text-muted">
                  {t('attendance.page', { current: safePage + 1, total: totalPages })}
                </Text>
                <Pressable
                  disabled={safePage >= totalPages - 1}
                  onPress={() => setPage(safePage + 1)}
                  hitSlop={8}
                  className={cn(
                    'h-10 w-10 items-center justify-center rounded-full border border-border',
                    safePage >= totalPages - 1 ? 'opacity-40' : 'bg-card',
                  )}>
                  <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
                </Pressable>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <AttendanceFilterSheet
        open={filterOpen}
        classId={classId}
        classes={classes.data}
        sex={sex}
        status={status}
        summary={summary}
        boys={boys}
        girls={girls}
        total={records.length}
        onClass={setClassId}
        onSex={setSex}
        onStatus={setStatus}
        onReset={() => {
          setClassId('all');
          setSex('all');
          setStatus('all');
        }}
        onClose={() => setFilterOpen(false)}
      />
    </SafeAreaView>
  );
}
