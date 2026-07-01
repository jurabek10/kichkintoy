import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/screen-header';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { colors } from '@/constants/theme';
import { useStaffAttendance } from '@/data/teacher';
import { formatTime, todayIsoDate } from '@/lib/date';
import { orpc } from '@/lib/orpc';
import { teacherQueryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

type ApiRecord = NonNullable<ReturnType<typeof useStaffAttendance>['data']>['records'][number];
type ApiSummary = NonNullable<ReturnType<typeof useStaffAttendance>['data']>['summary'];

type SexFilter = 'all' | 'boy' | 'girl';
type StatusFilter = 'all' | 'present' | 'late' | 'absent' | 'not_checked_in' | 'checked_out';

const PAGE_SIZE = 8;

const SKY = { bg: '#E1F0FF', ink: '#3E8FE0' };
const PINK = { bg: '#FFE4EF', ink: '#EC5E92' };
const GRAPE = { bg: '#EEE6FF', ink: '#7C5CD8' };

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

/** Collapse the seven raw statuses into the six exclusive filter buckets. */
function statusBucket(status: string): StatusFilter {
  if (status === 'present') return 'present';
  if (status === 'late') return 'late';
  if (status === 'absent' || status === 'excused') return 'absent';
  if (status === 'not_checked_in') return 'not_checked_in';
  return 'checked_out'; // picked_up | left_early
}

function genderTone(gender: ApiRecord['child']['gender']) {
  if (gender === 'boy') return SKY;
  if (gender === 'girl') return PINK;
  return GRAPE;
}

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
  const avatar = genderTone(record.child.gender);
  const initial = record.child.name.trim().charAt(0).toUpperCase() || '·';
  const here = record.status === 'present' || record.status === 'late';

  const sub = record.checkedOutAt
    ? t('attendance.checkedOutAt', { time: formatTime(record.checkedOutAt) })
    : record.checkedInAt
      ? t('attendance.checkedInAt', { time: formatTime(record.checkedInAt) })
      : (record.child.className ?? '');

  return (
    <Card className="gap-3">
      <View className="flex-row items-center gap-3">
        <View
          style={{ backgroundColor: avatar.bg }}
          className="h-10 w-10 items-center justify-center rounded-full">
          <Text style={{ color: avatar.ink }} className="font-extrabold">
            {initial}
          </Text>
        </View>
        <View className="flex-1">
          <Text numberOfLines={1} className="text-[15px] font-bold text-foreground">
            {record.child.name}
          </Text>
          {sub ? <Text className="text-[12px] text-muted">{sub}</Text> : null}
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

/** A selectable pill (sex row inside the filter sheet). */
function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'rounded-full border px-3.5 py-1.5',
        active ? 'border-primary bg-primary' : 'border-border bg-card',
      )}>
      <Text className={cn('text-[13px] font-semibold', active ? 'text-white' : 'text-muted')}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Two-axis filter: sex chips + a status list, under one funnel. */
function FilterSheet({
  open,
  sex,
  status,
  summary,
  boys,
  girls,
  total,
  onSex,
  onStatus,
  onReset,
  onClose,
}: {
  open: boolean;
  sex: SexFilter;
  status: StatusFilter;
  summary: ApiSummary | undefined;
  boys: number;
  girls: number;
  total: number;
  onSex: (s: SexFilter) => void;
  onStatus: (s: StatusFilter) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('teacher');
  const sexOptions: { key: SexFilter; label: string }[] = [
    { key: 'all', label: `${t('attendance.all')} ${total}` },
    { key: 'boy', label: `${t('attendance.boys')} ${boys}` },
    { key: 'girl', label: `${t('attendance.girls')} ${girls}` },
  ];
  const statusOptions: { key: StatusFilter; label: string; count: number }[] = [
    { key: 'all', label: t('attendance.all'), count: total },
    { key: 'present', label: t('attendance.present'), count: summary?.present ?? 0 },
    { key: 'late', label: t('attendance.late'), count: summary?.late ?? 0 },
    {
      key: 'absent',
      label: t('attendance.absent'),
      count: (summary?.absent ?? 0) + (summary?.excused ?? 0),
    },
    { key: 'not_checked_in', label: t('attendance.notIn'), count: summary?.notCheckedIn ?? 0 },
    {
      key: 'checked_out',
      label: t('attendance.checkedOut'),
      count: (summary?.pickedUp ?? 0) + (summary?.leftEarly ?? 0),
    },
  ];

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable className="rounded-t-xl bg-card p-4 pb-9" onPress={() => {}}>
          <View className="mb-3 items-center">
            <View className="h-1 w-10 rounded-full bg-segment" />
          </View>
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-base font-extrabold text-foreground">{t('attendance.filter')}</Text>
            <Pressable onPress={onReset} hitSlop={8}>
              <Text className="text-sm font-semibold text-primary">{t('attendance.reset')}</Text>
            </Pressable>
          </View>

          <Text className="mb-2 text-[13px] font-bold text-muted">{t('attendance.sex')}</Text>
          <View className="flex-row flex-wrap gap-2">
            {sexOptions.map((o) => (
              <Chip key={o.key} label={o.label} active={sex === o.key} onPress={() => onSex(o.key)} />
            ))}
          </View>

          <Text className="mb-1 mt-4 text-[13px] font-bold text-muted">{t('attendance.status')}</Text>
          {statusOptions.map((o) => {
            const active = status === o.key;
            return (
              <Pressable
                key={o.key}
                onPress={() => onStatus(o.key)}
                className="flex-row items-center justify-between py-3">
                <Text className={cn('text-[15px]', active ? 'font-bold text-primary' : 'text-foreground')}>
                  {o.label}
                </Text>
                <View className="flex-row items-center gap-2.5">
                  <Text className="text-[13px] text-muted">{o.count}</Text>
                  {active ? (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  ) : (
                    <View className="h-5 w-5 rounded-full border border-border" />
                  )}
                </View>
              </Pressable>
            );
          })}

          <Pressable
            onPress={onClose}
            className="mt-3 items-center rounded-md bg-primary py-3">
            <Text className="text-[15px] font-bold text-white">{t('attendance.done')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function AttendanceScreen() {
  const { t } = useTranslation('teacher');
  const date = todayIsoDate();
  const query = useStaffAttendance(date);
  const summary = query.data?.summary;
  const records = useMemo(() => query.data?.records ?? [], [query.data]);

  const [search, setSearch] = useState('');
  const [sex, setSex] = useState<SexFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(0);

  // Any change to the search or filters starts the list over at page one.
  useEffect(() => setPage(0), [search, sex, status]);

  const boys = records.filter((r) => r.child.gender === 'boy').length;
  const girls = records.filter((r) => r.child.gender === 'girl').length;
  const filtersOn = sex !== 'all' || status !== 'all';

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
      {query.isPending ? (
        <Loader />
      ) : records.length === 0 ? (
        <View className="p-4">
          <EmptyState icon="calendar-outline" title={t('attendance.empty')} body={t('classes.emptyBody')} />
        </View>
      ) : (
        <ScrollView
          contentContainerClassName="gap-3 p-4"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {summary ? (
            <Card className="flex-row">
              <SummaryChip value={summary.present + summary.late} label={t('attendance.here')} color="text-mint-ink" />
              <SummaryChip value={summary.late} label={t('attendance.late')} color="text-sunshine-ink" />
              <SummaryChip value={summary.absent + summary.excused} label={t('attendance.absent')} color="text-coral-ink" />
              <SummaryChip value={summary.notCheckedIn} label={t('attendance.notIn')} color="text-muted" />
            </Card>
          ) : null}

          {/* Search + filter. */}
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
            pageItems.map((record) => <ChildRow key={record.child.id} record={record} date={date} />)
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
        </ScrollView>
      )}

      <FilterSheet
        open={filterOpen}
        sex={sex}
        status={status}
        summary={summary}
        boys={boys}
        girls={girls}
        total={records.length}
        onSex={setSex}
        onStatus={setStatus}
        onReset={() => {
          setSex('all');
          setStatus('all');
        }}
        onClose={() => setFilterOpen(false)}
      />
    </SafeAreaView>
  );
}
