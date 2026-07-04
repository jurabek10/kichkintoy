import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/screen-header';
import { MealCard } from '@/components/meal/meal-card';
import {
  MealFilterSheet,
  type MealPeriod,
  type MealStatusFilter,
  type MealTypeFilter,
} from '@/components/meal/meal-filter-sheet';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { Pager } from '@/components/ui/pager';
import { colors } from '@/constants/theme';
import { useStaffMeals, type StaffMealSummary } from '@/data/meals';
import { formatLongDate, todayIsoDate } from '@/lib/date';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 8;

function matchesSearch(meal: StaffMealSummary, query: string) {
  return `${meal.menuText} ${meal.allergyNote ?? ''} ${meal.className}`.toLowerCase().includes(query);
}

export default function MealsScreen() {
  const { t, i18n } = useTranslation('meals');
  const router = useRouter();
  const today = todayIsoDate();
  const query = useStaffMeals();
  const meals = query.data;

  const [type, setType] = useState<MealTypeFilter>('all');
  const [status, setStatus] = useState<MealStatusFilter>('all');
  const [period, setPeriod] = useState<MealPeriod>('all');
  const [month, setMonth] = useState(today.slice(0, 7));
  const [day, setDay] = useState(today);
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(0);

  const todayMeals = useMemo(() => meals.filter((meal) => meal.mealDate === today), [meals, today]);

  const typeCounts = useMemo(() => {
    const counts: Record<MealTypeFilter, number> = { all: meals.length, breakfast: 0, lunch: 0, snack: 0, dinner: 0 };
    for (const meal of meals) counts[meal.mealType] += 1;
    return counts;
  }, [meals]);

  const statusCounts = useMemo(() => {
    const counts: Record<MealStatusFilter, number> = { all: meals.length, published: 0, draft: 0 };
    for (const meal of meals) counts[meal.status] += 1;
    return counts;
  }, [meals]);

  const history = useMemo(() => {
    const q = search.trim().toLowerCase();
    return meals.filter((meal) => {
      if (type !== 'all' && meal.mealType !== type) return false;
      if (status !== 'all' && meal.status !== status) return false;
      if (period === 'month' && meal.mealDate.slice(0, 7) !== month) return false;
      if (period === 'day' && meal.mealDate !== day) return false;
      if (q && !matchesSearch(meal, q)) return false;
      return true;
    });
  }, [meals, type, status, period, month, day, search]);

  useEffect(() => setPage(0), [type, status, period, month, day, search]);

  const filtersOn = type !== 'all' || status !== 'all' || period !== 'all';
  const totalPages = Math.max(1, Math.ceil(history.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = history.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader
        title={t('title')}
        back
        right={
          <Pressable
            onPress={() => router.push('/meals/new')}
            hitSlop={8}
            className="h-9 flex-row items-center gap-1 rounded-full bg-sunshine-ink px-3.5">
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text numberOfLines={1} className="text-[13px] font-bold text-white">{t('newMeal')}</Text>
          </Pressable>
        }
      />

      {query.isPending ? (
        <Loader />
      ) : (
        <ScrollView contentContainerClassName="gap-4 p-4 pb-8" showsVerticalScrollIndicator={false}>
          {/* Today's menu — a highlighted sunshine tray so today stands apart */}
          <View className="gap-3 rounded-2xl border border-sunshine-ink/20 bg-sunshine/50 p-3">
            <View className="flex-row items-center gap-2">
              <View className="h-7 w-7 items-center justify-center rounded-full bg-sunshine-ink">
                <Ionicons name="today-outline" size={15} color="#FFFFFF" />
              </View>
              <Text className="flex-1 text-[15px] font-extrabold text-foreground">{t('todaySection')}</Text>
              <Text className="text-[12px] font-bold text-sunshine-ink">{formatLongDate(today, i18n.language)}</Text>
            </View>
            {todayMeals.length === 0 ? (
              <View className="items-center gap-1 rounded-lg border border-dashed border-sunshine-ink/30 bg-card/70 px-4 py-6">
                <Ionicons name="restaurant-outline" size={24} color="#F4A621" />
                <Text className="text-[13px] text-muted">{t('noToday')}</Text>
              </View>
            ) : (
              todayMeals.map((meal) => <MealCard key={meal.id} meal={meal} showDate={false} />)
            )}
          </View>

          {/* Menu history — plain section, clearly below the today tray */}
          <View className="gap-3">
            <View className="flex-row items-center gap-2 border-t border-border pt-4">
              <Ionicons name="albums-outline" size={16} color={colors.textSecondary} />
              <Text className="flex-1 text-[15px] font-extrabold text-foreground">{t('menuHistory')}</Text>
              <View className="rounded-full bg-pill px-2 py-0.5">
                <Text className="text-[11px] font-bold text-muted">{history.length}</Text>
              </View>
            </View>

            <View className="flex-row items-center gap-2">
              <View className="h-11 flex-1 flex-row items-center gap-2 rounded-md border border-border bg-card px-3">
                <Ionicons name="search" size={18} color={colors.textSecondary} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder={t('table.search')}
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
                  filtersOn ? 'border-sunshine-ink bg-sunshine-ink' : 'border-border bg-card',
                )}>
                <Ionicons name="funnel" size={17} color={filtersOn ? '#FFFFFF' : colors.textSecondary} />
              </Pressable>
            </View>

            {history.length === 0 ? (
              <EmptyState icon="restaurant-outline" title={t('empty.staffTitle')} body={t('empty.staffBody')} />
            ) : (
              <>
                {pageItems.map((meal) => (
                  <MealCard key={meal.id} meal={meal} />
                ))}

                <Pager
                  page={safePage}
                  totalPages={totalPages}
                  onPage={setPage}
                  label={t('page', { current: safePage + 1, total: totalPages })}
                  className="mt-1"
                />
              </>
            )}
          </View>
        </ScrollView>
      )}

      <MealFilterSheet
        open={filterOpen}
        type={type}
        status={status}
        period={period}
        month={month}
        day={day}
        typeCounts={typeCounts}
        statusCounts={statusCounts}
        onType={setType}
        onStatus={setStatus}
        onPeriod={setPeriod}
        onMonth={setMonth}
        onDay={setDay}
        onReset={() => {
          setType('all');
          setStatus('all');
          setPeriod('all');
        }}
        onClose={() => setFilterOpen(false)}
      />
    </SafeAreaView>
  );
}
