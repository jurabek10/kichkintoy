import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { ScreenHeader } from '@/components/common/screen-header';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { Pager } from '@/components/ui/pager';
import { colors } from '@/constants/theme';
import { useClassRoster, useTeacherClasses, type RosterChild } from '@/data/teacher';
import { cn } from '@/lib/utils';

const SKY = { bg: '#E1F0FF', ink: '#3E8FE0' };
const PINK = { bg: '#FFE4EF', ink: '#EC5E92' };
const PAGE_SIZE = 10;

type GenderFilter = 'all' | 'boy' | 'girl';

/** Gender → the tint that colours a child's monogram, so the roster reads as
 *  boys-in-sky / girls-in-pink even before you read a name. */
function genderFallback(gender: RosterChild['gender']) {
  if (gender === 'boy') return { bg: 'bg-sky', text: 'text-sky-ink' };
  if (gender === 'girl') return { bg: 'bg-bubblegum', text: 'text-bubblegum-ink' };
  return { bg: 'bg-grape', text: 'text-grape-ink' };
}

/** Photo when we have one (a media asset or legacy URL), otherwise the child's
 *  initial on a gender-tinted disc — never an anonymous grey blank. */
function RosterAvatar({ child, size = 48 }: { child: RosterChild; size?: number }) {
  const tone = genderFallback(child.gender);
  return (
    <ProfileAvatar
      photo={child.photo}
      name={child.name}
      size={size}
      fallbackClassName={tone.bg}
      fallbackTextClassName={tone.text}
    />
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <View className="flex-1 items-center">
      <Text className="text-2xl font-extrabold text-foreground">{value}</Text>
      <Text className="mt-0.5 text-[12px] text-muted">{label}</Text>
    </View>
  );
}

function ChildRow({ child }: { child: RosterChild }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/child/[id]', params: { id: child.id } })}
      className="flex-row items-center gap-3 rounded-md bg-card p-3">
      <RosterAvatar child={child} />
      <View className="flex-1">
        <Text numberOfLines={1} className="text-[15px] font-bold text-foreground">
          {child.name}
        </Text>
        {child.ageLabel ? (
          <Text className="mt-0.5 text-[13px] text-muted">{child.ageLabel}</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

/** Bottom sheet to filter the roster by sex — the only filter the teacher needs. */
function FilterSheet({
  open,
  value,
  options,
  onSelect,
  onClose,
  title,
}: {
  open: boolean;
  value: GenderFilter;
  options: { key: GenderFilter; label: string; count: number }[];
  onSelect: (key: GenderFilter) => void;
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
                <Text
                  className={cn(
                    'text-[15px]',
                    active ? 'font-bold text-primary' : 'text-foreground',
                  )}>
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

export default function ClassRosterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const classId = id ?? '';
  const { t } = useTranslation('teacher');
  const classes = useTeacherClasses();
  const roster = useClassRoster(classId);

  const klass = useMemo(() => classes.data.find((c) => c.id === classId), [classes.data, classId]);

  const [query, setQuery] = useState('');
  const [gender, setGender] = useState<GenderFilter>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(0);

  // A new search or filter starts the list over at page one.
  useEffect(() => setPage(0), [query, gender]);

  const boys = roster.data.filter((c) => c.gender === 'boy').length;
  const girls = roster.data.filter((c) => c.gender === 'girl').length;
  const kids = roster.data.length;
  const seats = klass?.maxChildren ?? null;
  const free = seats != null ? Math.max(0, seats - kids) : null;
  const genderTotal = boys + girls;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return roster.data.filter(
      (c) =>
        (gender === 'all' || c.gender === gender) &&
        (q === '' || c.name.toLowerCase().includes(q)),
    );
  }, [roster.data, query, gender]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const filterOptions: { key: GenderFilter; label: string; count: number }[] = [
    { key: 'all', label: t('roster.all'), count: kids },
    { key: 'boy', label: t('roster.boys'), count: boys },
    { key: 'girl', label: t('roster.girls'), count: girls },
  ];

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={klass?.name ?? t('roster.title')} back />
      {roster.isPending ? (
        <Loader />
      ) : roster.data.length === 0 ? (
        <View className="p-4">
          <EmptyState icon="people-outline" title={t('roster.empty')} body={t('roster.emptyBody')} />
        </View>
      ) : (
        <ScrollView
          contentContainerClassName="p-4 pb-8"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Capacity + make-up. */}
          <Card>
            <View className="flex-row">
              <Stat value={kids} label={t('roster.kids')} />
              <View className="w-px bg-border" />
              <Stat value={seats ?? '—'} label={t('roster.seats')} />
              <View className="w-px bg-border" />
              <Stat value={free ?? '—'} label={t('roster.free')} />
            </View>
            {genderTotal > 0 ? (
              <View className="mt-4">
                <View className="h-2 flex-row overflow-hidden rounded-full bg-segment">
                  <View style={{ flex: boys, backgroundColor: SKY.ink }} />
                  <View style={{ flex: girls, backgroundColor: PINK.ink }} />
                </View>
                <View className="mt-2 flex-row justify-between">
                  <View className="flex-row items-center gap-1.5">
                    <View style={{ backgroundColor: SKY.ink }} className="h-2.5 w-2.5 rounded-full" />
                    <Text className="text-[13px] font-bold text-foreground">{boys}</Text>
                    <Text className="text-[13px] text-muted">{t('roster.boys')}</Text>
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    <View style={{ backgroundColor: PINK.ink }} className="h-2.5 w-2.5 rounded-full" />
                    <Text className="text-[13px] font-bold text-foreground">{girls}</Text>
                    <Text className="text-[13px] text-muted">{t('roster.girls')}</Text>
                  </View>
                </View>
              </View>
            ) : null}
          </Card>

          {/* Search + filter icon. */}
          <View className="mt-3 flex-row items-center gap-2">
            <View className="h-11 flex-1 flex-row items-center gap-2 rounded-md border border-border bg-card px-3">
              <Ionicons name="search" size={18} color={colors.textSecondary} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t('roster.search')}
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
                gender === 'all' ? 'border-border bg-card' : 'border-primary bg-primary',
              )}>
              <Ionicons
                name="funnel"
                size={17}
                color={gender === 'all' ? colors.textSecondary : '#FFFFFF'}
              />
            </Pressable>
          </View>

          {/* Results. */}
          {filtered.length === 0 ? (
            <View className="mt-4">
              <EmptyState icon="search-outline" title={t('roster.noMatch')} body={t('roster.noMatchBody')} />
            </View>
          ) : (
            <View className="mt-4 gap-2">
              {pageItems.map((child) => (
                <ChildRow key={child.id} child={child} />
              ))}
            </View>
          )}

          {/* Pager. */}
          <Pager
            page={safePage}
            totalPages={totalPages}
            onPage={setPage}
            label={t('roster.page', { current: safePage + 1, total: totalPages })}
            className="mt-4"
          />
        </ScrollView>
      )}

      <FilterSheet
        open={filterOpen}
        value={gender}
        options={filterOptions}
        title={t('roster.filter')}
        onSelect={(key) => {
          setGender(key);
          setFilterOpen(false);
        }}
        onClose={() => setFilterOpen(false)}
      />
    </SafeAreaView>
  );
}
