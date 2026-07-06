import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { ComponentProps, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { colors } from '@/constants/theme';
import { formatMoney, percent, useDirectorHome, type DirectorHomeSummary } from '@/data/director';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

type IconName = ComponentProps<typeof Ionicons>['name'];

const SLATE = '#1E2438';

/** Icon-tile tones matching the app's pastel system. */
const TONE: Record<string, { tile: string; ink: string }> = {
  sky: { tile: 'bg-sky', ink: '#3E8FE0' },
  mint: { tile: 'bg-mint', ink: '#46B06A' },
  coral: { tile: 'bg-coral', ink: '#E8674E' },
  sunshine: { tile: 'bg-sunshine', ink: '#F4A621' },
  grape: { tile: 'bg-grape', ink: '#7C5CD8' },
};

/** The signature: a dark console slab stating the center's monthly tuition pulse
 *  — the one number a director opens the app to see. */
function ConsoleHero({
  summary,
  centerName,
  greeting,
  t,
}: {
  summary: DirectorHomeSummary;
  centerName: string | null;
  greeting: string;
  t: (k: string, o?: Record<string, unknown>) => string;
}) {
  const rate = percent(summary.money.paidAmount, summary.money.expectedAmount);
  return (
    <View style={{ backgroundColor: SLATE }} className="overflow-hidden rounded-2xl p-5">
      <Text className="text-[11px] font-bold uppercase tracking-widest text-white/50">
        {t('eyebrow')} · {summary.month.label}
      </Text>
      <Text numberOfLines={1} className="mt-1.5 text-2xl font-extrabold text-white">
        {centerName ?? t('centerFallback')}
      </Text>
      <Text className="mt-0.5 text-[13px] text-white/60">{greeting}</Text>

      <View className="mt-5 flex-row items-end justify-between">
        <Text className="text-[11px] font-bold uppercase tracking-wider text-white/55">
          {t('collectionRate')}
        </Text>
        <Text className="text-4xl font-extrabold leading-none text-white">{rate}%</Text>
      </View>
      <View className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
        <View style={{ width: `${rate}%`, backgroundColor: '#46B06A' }} className="h-full rounded-full" />
      </View>
      <Text className="mt-2 text-[12px] text-white/55">
        {t('money.paymentLine')} · {summary.money.paidChildren}/{summary.totals.children}
      </Text>
    </View>
  );
}

function StatCard({ label, value, icon, tone }: { label: string; value: string | number; icon: IconName; tone: string }) {
  const c = TONE[tone] ?? TONE.sky!;
  return (
    <Card className="flex-1 gap-3">
      <View className="flex-row items-start justify-between">
        <Text className="flex-1 pr-2 text-[12px] font-semibold leading-4 text-muted">{label}</Text>
        <View className={cn('h-9 w-9 items-center justify-center rounded-lg', c.tile)}>
          <Ionicons name={icon} size={17} color={c.ink} />
        </View>
      </View>
      <Text numberOfLines={1} className="text-xl font-extrabold text-foreground">{value}</Text>
    </Card>
  );
}

function MoneySnapshot({ summary, t }: { summary: DirectorHomeSummary; t: (k: string, o?: Record<string, unknown>) => string }) {
  const { money } = summary;
  const paidPct = percent(money.paidAmount, money.expectedAmount);
  return (
    <Card className="gap-3">
      <View>
        <Text className="text-base font-extrabold text-foreground">{t('money.title')}</Text>
        <Text className="mt-0.5 text-[12px] text-muted">
          {t('money.description', { amount: formatMoney(money.monthlyTuitionAmount) })}
        </Text>
      </View>
      <View className="h-2.5 flex-row overflow-hidden rounded-full bg-segment">
        <View style={{ width: `${paidPct}%`, backgroundColor: '#46B06A' }} />
        <View style={{ width: `${100 - paidPct}%`, backgroundColor: '#E8674E' }} />
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Text className="text-[11px] font-bold uppercase tracking-wide text-mint-ink">{t('money.paid')}</Text>
          <Text numberOfLines={1} className="text-[15px] font-extrabold text-foreground">{formatMoney(money.paidAmount)}</Text>
          <Text className="text-[11px] text-muted">{t('money.paidChildren', { count: money.paidChildren })}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-[11px] font-bold uppercase tracking-wide text-coral-ink">{t('money.unpaid')}</Text>
          <Text numberOfLines={1} className="text-[15px] font-extrabold text-foreground">{formatMoney(money.unpaidAmount)}</Text>
          <Text className="text-[11px] text-muted">{t('money.unpaidChildren', { count: money.unpaidChildren })}</Text>
        </View>
      </View>
    </Card>
  );
}

function ActionRow({ icon, label, count, onPress }: { icon: IconName; label: string; count: number; onPress?: () => void }) {
  const body = (
    <View className="flex-row items-center gap-3 py-2.5">
      <View className="h-9 w-9 items-center justify-center rounded-lg bg-coral">
        <Ionicons name={icon} size={16} color="#E8674E" />
      </View>
      <Text className="flex-1 text-[14px] font-semibold text-foreground">{label}</Text>
      <View className="min-w-[26px] items-center rounded-full bg-coral-ink px-2 py-0.5">
        <Text className="text-[12px] font-extrabold text-white">{count}</Text>
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.textMuted} /> : null}
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{body}</Pressable> : body;
}

function ActionNeeded({ summary, t, go }: { summary: DirectorHomeSummary; t: (k: string, o?: Record<string, unknown>) => string; go: (href: Href) => void }) {
  const a = summary.actionsNeeded;
  const all: { icon: IconName; label: string; count: number; href?: Href }[] = [
    { icon: 'people-outline', label: t('actions.parentRequests'), count: a.pendingParentRequests, href: '/requests' },
    { icon: 'briefcase-outline', label: t('actions.teacherRequests'), count: a.pendingTeacherRequests, href: '/requests' },
    { icon: 'school-outline', label: t('actions.classesWithoutTeacher'), count: a.classesWithoutTeacher, href: '/classes' },
    { icon: 'wallet-outline', label: t('actions.unpaidChildren'), count: a.unpaidChildren },
    { icon: 'document-text-outline', label: t('actions.missingDocuments'), count: a.missingDocuments, href: '/documents' },
  ];
  const rows = all.filter((r) => r.count > 0);

  return (
    <Card className="gap-1">
      <Text className="text-base font-extrabold text-foreground">{t('actions.title')}</Text>
      {rows.length === 0 ? (
        <View className="flex-row items-center gap-2 py-2">
          <Ionicons name="checkmark-circle" size={18} color="#46B06A" />
          <Text className="text-[13px] font-semibold text-mint-ink">{t('actions.allClear')}</Text>
        </View>
      ) : (
        <>
          <Text className="mb-1 text-[12px] text-muted">{t('actions.description')}</Text>
          {rows.map((r) => (
            <ActionRow key={r.label} icon={r.icon} label={r.label} count={r.count} onPress={r.href ? () => go(r.href!) : undefined} />
          ))}
        </>
      )}
    </Card>
  );
}

function ClassOverview({ summary, t, go }: { summary: DirectorHomeSummary; t: (k: string, o?: Record<string, unknown>) => string; go: (href: Href) => void }) {
  return (
    <Card className="gap-3">
      <View>
        <Text className="text-base font-extrabold text-foreground">{t('classes.title')}</Text>
        <Text className="mt-0.5 text-[12px] text-muted">{t('classes.description')}</Text>
      </View>
      {summary.classes.length === 0 ? (
        <View className="items-center gap-1 rounded-xl border border-dashed border-border py-6">
          <Ionicons name="school-outline" size={24} color={colors.textMuted} />
          <Text className="text-[13px] font-semibold text-foreground">{t('classes.emptyTitle')}</Text>
          <Text className="px-6 text-center text-[12px] text-muted">{t('classes.emptyBody')}</Text>
        </View>
      ) : (
        summary.classes.map((klass) => {
          const occ = klass.occupancyPercent ?? 0;
          const hasTeacher = klass.teacherNames.length > 0;
          return (
            <Pressable
              key={klass.id}
              onPress={() => go({ pathname: '/class/[id]', params: { id: klass.id } })}
              className="gap-2 rounded-xl border border-border p-3">
              <View className="flex-row items-center gap-2">
                <Text numberOfLines={1} className="flex-1 text-[14px] font-bold text-foreground">{klass.name}</Text>
                <Text className="text-[12px] font-bold text-muted">
                  {klass.childCount}
                  {klass.maxChildren ? `/${klass.maxChildren}` : ''} · {occ}%
                </Text>
              </View>
              <View className="h-1.5 overflow-hidden rounded-full bg-segment">
                <View style={{ width: `${occ}%` }} className="h-full rounded-full bg-primary" />
              </View>
              <View className="flex-row items-center justify-between">
                <Text numberOfLines={1} className={cn('flex-1 text-[12px]', hasTeacher ? 'text-muted' : 'font-semibold text-coral-ink')}>
                  {hasTeacher ? klass.teacherNames.join(', ') : t('classes.noTeacher')}
                </Text>
                {klass.unpaidChildren > 0 ? (
                  <Text className="text-[12px] font-semibold text-coral-ink">
                    {t('classes.unpaidCount', { count: klass.unpaidChildren })}
                  </Text>
                ) : (
                  <Ionicons name="checkmark-circle" size={15} color="#46B06A" />
                )}
              </View>
            </Pressable>
          );
        })
      )}
    </Card>
  );
}

function QuickAction({ icon, label, tone, onPress }: { icon: IconName; label: string; tone: string; onPress: () => void }) {
  const c = TONE[tone] ?? TONE.sky!;
  return (
    <Pressable onPress={onPress} className="flex-1 items-center gap-2 rounded-xl border border-border bg-card p-3">
      <View className={cn('h-10 w-10 items-center justify-center rounded-full', c.tile)}>
        <Ionicons name={icon} size={19} color={c.ink} />
      </View>
      <Text numberOfLines={2} className="text-center text-[12px] font-bold text-foreground">{label}</Text>
    </Pressable>
  );
}

export default function DirectorHomeScreen() {
  const { t } = useTranslation('app');
  const d = (k: string, o?: Record<string, unknown>) => t(`dashboardHome.director.${k}`, o);
  const router = useRouter();
  const go = (href: Href) => router.push(href);
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const { data: summary, isPending } = useDirectorHome();

  const directorName = (session?.user.fullName ?? '').trim().split(/\s+/)[0] ?? '';
  const centerName = session?.membership.centerName ?? null;

  async function onRefresh() {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ refetchType: 'active' });
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      {isPending ? (
        <Loader />
      ) : !summary ? (
        <ScrollView
          contentContainerClassName="p-4"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
          <Card className="items-center gap-2 py-10">
            <Ionicons name="business-outline" size={30} color={colors.textMuted} />
            <Text className="text-center text-[13px] text-muted">{d('noCenter')}</Text>
          </Card>
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-3 p-4 pb-8"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
          <ConsoleHero
            summary={summary}
            centerName={centerName}
            greeting={t('dashboardHome.hello', { name: directorName })}
            t={d}
          />

          <View className="flex-row gap-3">
            <StatCard label={d('stats.children')} value={summary.totals.children} icon="people" tone="sky" />
            <StatCard label={d('stats.classes')} value={summary.totals.classes} icon="school" tone="mint" />
            <StatCard label={d('stats.teachers')} value={summary.totals.teachers} icon="ribbon" tone="coral" />
          </View>

          <View className="flex-row gap-3">
            <StatCard label={d('stats.expected')} value={formatMoney(summary.money.expectedAmount)} icon="wallet" tone="sunshine" />
            <StatCard label={d('stats.unpaid')} value={formatMoney(summary.money.unpaidAmount)} icon="alert-circle" tone="coral" />
          </View>

          <MoneySnapshot summary={summary} t={d} />
          <ActionNeeded summary={summary} t={d} go={go} />
          <ClassOverview summary={summary} t={d} go={go} />

          <Card className="gap-3">
            <Text className="text-base font-extrabold text-foreground">{d('quick.title')}</Text>
            <View className="flex-row gap-3">
              <QuickAction icon="checkmark-done" label={d('quick.approveRequests')} tone="mint" onPress={() => go('/requests')} />
              <QuickAction icon="add-circle" label={d('quick.addClass')} tone="sky" onPress={() => go('/classes')} />
              <QuickAction icon="megaphone" label={d('quick.sendNotice')} tone="grape" onPress={() => go('/notice/new')} />
            </View>
          </Card>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
