import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/screen-header';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { colors } from '@/constants/theme';
import { useClassReportStatuses, useTeacherClasses, type ClassReportStatus } from '@/data/teacher';
import { todayIsoDate } from '@/lib/date';
import { cn } from '@/lib/utils';
import { DatePickerField } from '../../components/common/date-picker-field';

type StatusFilter = 'all' | 'published' | 'draft' | 'none';

const PAGE_SIZE = 8;

const STATUS_TONE: Record<string, { bg: string; text: string }> = {
  published: { bg: 'bg-mint', text: 'text-mint-ink' },
  draft: { bg: 'bg-sunshine', text: 'text-sunshine-ink' },
  none: { bg: 'bg-pill', text: 'text-muted' },
};

function ChildRow({ row, classId, date }: { row: ClassReportStatus; classId: string; date: string }) {
  const { t } = useTranslation('teacher');
  const router = useRouter();
  const tone = STATUS_TONE[row.status];
  const initial = row.name.trim().charAt(0).toUpperCase() || '·';

  // A child with no report opens the composer; an existing draft/published one
  // opens its report page.
  const open = () => {
    if (row.reportId) {
      router.push({ pathname: '/report/[id]', params: { id: row.reportId } });
    } else {
      router.push({
        pathname: '/report/new',
        params: { childId: row.childId, childName: row.name, classId, date },
      });
    }
  };

  return (
    <Pressable onPress={open}>
      <Card className="flex-row items-center gap-3">
        {row.photo ? (
          <Image source={{ uri: row.photo }} className="h-10 w-10 rounded-full bg-segment" />
        ) : (
          <View className="h-10 w-10 items-center justify-center rounded-full bg-grape">
            <Text className="font-extrabold text-grape-ink">{initial}</Text>
          </View>
        )}
        <Text className="flex-1 text-[15px] font-bold text-foreground">{row.name}</Text>
        <View className={`rounded-full px-2.5 py-1 ${tone.bg}`}>
          <Text className={`text-[11px] font-bold ${tone.text}`}>{t(`reports.status.${row.status}`)}</Text>
        </View>
        <Ionicons
          name={row.reportId ? 'chevron-forward' : 'add-circle'}
          size={row.reportId ? 18 : 22}
          color={row.reportId ? colors.textMuted : colors.primary}
        />
      </Card>
    </Pressable>
  );
}

/** Sheet to narrow the board by report state. */
function FilterSheet({
  open,
  value,
  options,
  onSelect,
  onClose,
  title,
}: {
  open: boolean;
  value: StatusFilter;
  options: { key: StatusFilter; label: string; count: number }[];
  onSelect: (key: StatusFilter) => void;
  onClose: () => void;
  title: string;
}) {
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable className="rounded-t-xl bg-card p-4 pb-9" onPress={() => {}}>
          <View className="mb-3 items-center">
            <View className="h-1 w-10 rounded-full bg-segment" />
          </View>
          <Text className="mb-1 text-base font-extrabold text-foreground">{title}</Text>
          {options.map((o) => {
            const active = value === o.key;
            return (
              <Pressable
                key={o.key}
                onPress={() => onSelect(o.key)}
                className="flex-row items-center justify-between py-3.5">
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
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function ClassReportBoardScreen() {
  const { id, date: initialDate } = useLocalSearchParams<{ id: string; date?: string }>();
  const classId = id ?? '';
  const { t } = useTranslation('teacher');
  const [date, setDate] = useState(initialDate ?? todayIsoDate());
  const classes = useTeacherClasses();
  const statuses = useClassReportStatuses(classId, date);

  const klass = useMemo(() => classes.data.find((c) => c.id === classId), [classes.data, classId]);
  const rows = statuses.data;

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => setPage(0), [date, query, status]);

  const sent = rows.filter((r) => r.status === 'published').length;
  const drafts = rows.filter((r) => r.status === 'draft').length;
  const notStarted = rows.filter((r) => r.status === 'none').length;
  const filtersOn = status !== 'all';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) => (status === 'all' || r.status === status) && (q === '' || r.name.toLowerCase().includes(q)),
    );
  }, [rows, query, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const filterOptions: { key: StatusFilter; label: string; count: number }[] = [
    { key: 'all', label: t('reports.all'), count: rows.length },
    { key: 'published', label: t('reports.status.published'), count: sent },
    { key: 'draft', label: t('reports.status.draft'), count: drafts },
    { key: 'none', label: t('reports.status.none'), count: notStarted },
  ];

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={klass?.name ?? t('reports.title')} back />
      <ScrollView
        contentContainerClassName="gap-3 p-4"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <DatePickerField
          value={date}
          onChange={setDate}
          label={t('reports.date')}
          todayLabel={t('attendance.today')}
        />

        {statuses.isPending ? (
          <Loader />
        ) : rows.length === 0 ? (
          <EmptyState icon="document-text-outline" title={t('roster.empty')} body={t('roster.emptyBody')} />
        ) : (
          <>
          {/* Progress + report state summary. */}
          <Card>
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-sm font-bold text-foreground">
                {t('reports.sent', { sent, total: rows.length })}
              </Text>
              <Text className="text-[13px] text-muted">{t('reports.pending', { count: rows.length - sent })}</Text>
            </View>
            <View className="h-2 overflow-hidden rounded-full bg-segment">
              <View
                className="h-full rounded-full bg-mint-ink"
                style={{ width: `${rows.length > 0 ? Math.round((sent / rows.length) * 100) : 0}%` }}
              />
            </View>
          </Card>

          {/* Search + filter. */}
          <View className="flex-row items-center gap-2">
            <View className="h-11 flex-1 flex-row items-center gap-2 rounded-md border border-border bg-card px-3">
              <Ionicons name="search" size={18} color={colors.textSecondary} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t('reports.search')}
                placeholderTextColor={colors.textMuted}
                className="h-11 flex-1 text-[15px] text-foreground"
                returnKeyType="search"
              />
              {query ? (
                <Pressable onPress={() => setQuery('')} hitSlop={8}>
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
            <EmptyState icon="search-outline" title={t('reports.noMatch')} body={t('reports.noMatchBody')} />
          ) : (
            pageItems.map((row) => <ChildRow key={row.childId} row={row} classId={classId} date={date} />)
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
                {t('reports.page', { current: safePage + 1, total: totalPages })}
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

      <FilterSheet
        open={filterOpen}
        value={status}
        options={filterOptions}
        title={t('reports.filter')}
        onSelect={(key) => {
          setStatus(key);
          setFilterOpen(false);
        }}
        onClose={() => setFilterOpen(false)}
      />
    </SafeAreaView>
  );
}
