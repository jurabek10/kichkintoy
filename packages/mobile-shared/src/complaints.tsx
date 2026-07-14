/// <reference path="./nativewind-types.d.ts" />
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type ComponentProps, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ComplaintCategory, ComplaintDetail, ComplaintListResponse, ComplaintStatus, ComplaintVisibility, ParentChild } from '@kichkintoy/shared';

type ResolvePhoto = (mediaAssetId: string) => Promise<string | null>;
type Person = { displayName: string; photoMediaAssetId: string | null; photoUrl: string | null };

export type ComplaintsApi = {
  parentList(input: { cursor?: string; limit?: number; status?: ComplaintStatus }): Promise<ComplaintListResponse>;
  staffList(input: { centerId: string; cursor?: string; limit?: number; status?: ComplaintStatus; from?: string }): Promise<ComplaintListResponse>;
  detail(input: { complaintId: string }): Promise<ComplaintDetail>;
  create(input: { childId: string; category: ComplaintCategory; subject: string; body: string; visibility: ComplaintVisibility }): Promise<ComplaintDetail>;
  reply(input: { complaintId: string; body: string }): Promise<ComplaintDetail>;
  setStatus(input: { complaintId: string; status: 'in_progress' | 'resolved'; resolutionNote?: string }): Promise<ComplaintDetail>;
  withdraw(input: { complaintId: string }): Promise<ComplaintDetail>;
};

type Nav = { back(): void; open(id: string): void; create(): void };
const categories = ['meals', 'safety', 'staff_behavior', 'fees', 'facility', 'health', 'curriculum', 'other'] as const;
const statuses = ['open', 'in_progress', 'resolved', 'withdrawn'] as const;

/** Complaints domain accent: the same "official record" amber as the home
 *  feature-grid tile and the notifications inbox. */
const AMBER = '#B56E00';
const AMBER_SOFT = '#FFF0CC';

function Header({ title, subtitle, back, right }: { title: string; subtitle?: string; back: () => void; right?: ReactNode }) {
  return (
    <View className="min-h-14 flex-row items-center gap-2 border-b border-border bg-card px-3 pb-3 pt-2">
      <Pressable onPress={back} hitSlop={10} className="h-10 w-10 items-center justify-center rounded-full active:bg-segment"><Ionicons name="arrow-back" size={23} color="#1F2937" /></Pressable>
      <View className="min-w-0 flex-1">
        <Text numberOfLines={2} className="text-[21px] font-extrabold tracking-tight text-foreground">{title}</Text>
        {subtitle ? <Text numberOfLines={1} className="mt-0.5 text-[12px] text-muted">{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

const avatarTones = {
  sky: { bg: '#E1F0FF', fg: '#2C6BB3' },
  grape: { bg: '#EEE6FF', fg: '#7C5CD8' },
  amber: { bg: AMBER_SOFT, fg: AMBER },
} as const;

/** Author photo (resolves a signed media asset, falls back to a URL, then a
 *  tinted monogram). `tone` colors the monogram to the person's side of the thread. */
function Avatar({ person, resolvePhoto, size = 42, tone = 'sky' }: { person: Person; resolvePhoto?: ResolvePhoto; size?: number; tone?: keyof typeof avatarTones }) {
  const signed = useQuery({
    queryKey: ['media', 'download', person.photoMediaAssetId],
    queryFn: () => resolvePhoto!(person.photoMediaAssetId!),
    enabled: Boolean(person.photoMediaAssetId && resolvePhoto),
    staleTime: 240_000,
  });
  const url = signed.data ?? person.photoUrl;
  const initials = person.displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '·';
  const dim = { width: size, height: size, borderRadius: Math.round(size * 0.36) };
  if (url) return <Image source={{ uri: url }} style={dim} />;
  return <View style={{ ...dim, backgroundColor: avatarTones[tone].bg }} className="items-center justify-center"><Text className="font-extrabold" style={{ fontSize: size * 0.36, color: avatarTones[tone].fg }}>{initials}</Text></View>;
}

/** Status colors follow the candy tokens: soft bg for pills, ink for text and stamps. */
function statusVisual(status: ComplaintStatus): { bg: string; fg: string } {
  switch (status) {
    case 'open': return { bg: AMBER_SOFT, fg: AMBER };
    case 'in_progress': return { bg: '#E1F0FF', fg: '#2C6BB3' };
    case 'resolved': return { bg: '#DDF3E4', fg: '#237A42' };
    default: return { bg: '#E7E9ED', fg: '#6B7280' };
  }
}

function StatusPill({ status }: { status: ComplaintStatus }) {
  const { t } = useTranslation('complaints');
  const sv = statusVisual(status);
  return <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: sv.bg }}><Text className="text-[10px] font-extrabold" style={{ color: sv.fg }}>{t(`statuses.${status}`)}</Text></View>;
}

function dateTime(value: string, language: string) {
  return new Intl.DateTimeFormat(language, { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
}

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Each complaint category gets its own icon + color pair, so a list or a detail
 *  header is legible and colorful at a glance. Mirrors the web palette. */
function categoryVisual(category: ComplaintCategory): { icon: IconName; fg: string; bg: string } {
  switch (category) {
    case 'meals': return { icon: 'restaurant', fg: '#C2410C', bg: '#FFEDD5' };
    case 'safety': return { icon: 'shield-checkmark', fg: '#B4232A', bg: '#FEE2E2' };
    case 'staff_behavior': return { icon: 'people', fg: '#4A43A8', bg: '#E9E8FF' };
    case 'fees': return { icon: 'card', fg: '#237A42', bg: '#DDF3E4' };
    case 'facility': return { icon: 'business', fg: '#2C6BB3', bg: '#E3F0FF' };
    case 'health': return { icon: 'medkit', fg: '#BE1E5B', bg: '#FCE7F0' };
    case 'curriculum': return { icon: 'book', fg: '#6D4AC7', bg: '#EEE8FB' };
    default: return { icon: 'chatbox-ellipses', fg: '#5B6472', bg: '#EEF0F3' };
  }
}

/** Small amber "director only" chip shown wherever a complaint is confidential. */
function ConfidentialChip() {
  const { t } = useTranslation('complaints');
  return (
    <View className="flex-row items-center gap-1 rounded-full px-2 py-0.5" style={{ backgroundColor: AMBER_SOFT }}>
      <Ionicons name="lock-closed" size={9} color={AMBER} />
      <Text className="text-[9.5px] font-bold" style={{ color: AMBER }}>{t('confidential')}</Text>
    </View>
  );
}

export function ComplaintsListScreen({ api, navigation, role, centerId, resolvePhoto }: { api: ComplaintsApi; navigation: Nav; role: 'parent' | 'teacher' | 'director'; centerId?: string | null; resolvePhoto?: ResolvePhoto }) {
  const { t, i18n } = useTranslation('complaints');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ComplaintStatus | null>(null);
  const [period, setPeriod] = useState<'all' | 'month' | 'day'>('all');
  const [filters, setFilters] = useState(false);
  const from = useMemo(() => {
    if (period === 'all') return undefined;
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    if (period === 'month') date.setDate(1);
    return date.toISOString();
  }, [period]);
  const query = useInfiniteQuery({ queryKey: ['complaints', role, centerId, status, period], initialPageParam: null as string | null, queryFn: ({ pageParam }) => role === 'parent' ? api.parentList({ cursor: pageParam ?? undefined, limit: 10, status: status ?? undefined }) : api.staffList({ centerId: centerId!, cursor: pageParam ?? undefined, limit: 10, status: status ?? undefined, from }), getNextPageParam: (last) => last.nextCursor ?? undefined, enabled: role === 'parent' || Boolean(centerId) });
  const rows = useMemo(() => { const q = search.trim().toLocaleLowerCase(); return (query.data?.pages.flatMap((page) => page.items) ?? []).filter((row) => !q || `${row.subject} ${row.child.displayName}`.toLocaleLowerCase().includes(q)); }, [query.data, search]);
  const insets = useSafeAreaInsets();
  const filtersOn = Boolean(status) || period !== 'all';
  const filtered = filtersOn || search.trim().length > 0;
  const newButton = role === 'parent' ? (
    <Pressable onPress={navigation.create} hitSlop={8} className="h-9 flex-row items-center gap-1 rounded-full px-3.5 active:opacity-80" style={{ backgroundColor: AMBER }}>
      <Ionicons name="add" size={18} color="#FFFFFF" />
      <Text numberOfLines={1} className="text-[13px] font-bold text-white">{t('new')}</Text>
    </Pressable>
  ) : undefined;
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <Header title={t('title')} subtitle={t('subtitle')} back={navigation.back} right={newButton} />
      <View className="mx-4 mb-2 mt-3 flex-row gap-2">
        <View className="h-12 flex-1 flex-row items-center gap-2.5 rounded-full bg-segment px-4">
          <Ionicons name="search" size={18} color="#89919E" />
          <TextInput value={search} onChangeText={setSearch} placeholder={t('search')} placeholderTextColor="#89919E" returnKeyType="search" className="h-12 flex-1 text-[15px] text-foreground" />
          {search.length ? <Pressable onPress={() => setSearch('')} hitSlop={8}><Ionicons name="close-circle" size={18} color="#C4C9D1" /></Pressable> : null}
        </View>
        <Pressable onPress={() => setFilters(true)} className={`h-12 w-12 items-center justify-center rounded-full active:opacity-70 ${filtersOn ? '' : 'bg-segment'}`} style={filtersOn ? { backgroundColor: AMBER } : undefined}>
          <Ionicons name="funnel" size={17} color={filtersOn ? '#FFFFFF' : '#606773'} />
        </Pressable>
      </View>
      {query.isLoading ? (
        <ActivityIndicator className="mt-20" color={AMBER} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          onEndReached={() => query.hasNextPage && void query.fetchNextPage()}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => void query.refetch()} tintColor={AMBER} />}
          contentContainerClassName={rows.length ? 'px-4 pb-8 pt-1' : 'flex-1'}
          ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator className="my-3" color={AMBER} /> : null}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center gap-2 px-8">
              <View className="h-16 w-16 items-center justify-center rounded-3xl" style={{ backgroundColor: AMBER_SOFT }}>
                <Ionicons name={filtered ? 'funnel-outline' : 'shield-checkmark'} size={28} color={AMBER} />
              </View>
              <Text className="mt-1 text-base font-extrabold text-foreground">{filtered ? t('empty') : t('noComplaints')}</Text>
              <Text className="text-center text-[13px] leading-5 text-muted">{filtered ? t('emptyBody') : role === 'parent' ? t('noComplaintsBody') : t('noComplaintsStaffBody')}</Text>
              {!filtered && role === 'parent' ? (
                <Pressable onPress={navigation.create} className="mt-2 flex-row items-center gap-1.5 rounded-full px-5 py-3 active:opacity-80" style={{ backgroundColor: AMBER }}>
                  <Ionicons name="add" size={18} color="#FFF" />
                  <Text className="font-bold text-white">{t('new')}</Text>
                </Pressable>
              ) : null}
            </View>
          }
          renderItem={({ item }) => {
            const cv = categoryVisual(item.category);
            return (
              <Pressable onPress={() => navigation.open(item.id)} className="mb-3 rounded-2xl border border-border bg-card p-3.5 active:bg-segment">
                <View className="flex-row items-center gap-3">
                  <View className="relative">
                    <Avatar person={item.child} resolvePhoto={resolvePhoto} size={46} tone="sky" />
                    <View className="absolute -bottom-1 -right-1 h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-card" style={{ backgroundColor: cv.bg }}>
                      <Ionicons name={cv.icon} size={11} color={cv.fg} />
                    </View>
                  </View>
                  <View className="min-w-0 flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text numberOfLines={1} className="flex-1 text-[15px] font-extrabold text-foreground">{item.subject}</Text>
                      <StatusPill status={item.status} />
                    </View>
                    <Text numberOfLines={1} className="mt-0.5 text-[12.5px] text-muted">{item.child.displayName} · {t(`categories.${item.category}`)}</Text>
                    <View className="mt-1 flex-row items-center gap-1.5">
                      {item.visibility === 'director_only' ? <ConfidentialChip /> : null}
                      <Text className="text-[11px] text-muted">{dateTime(item.lastActivityAt, i18n.language)}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#C4C9D1" />
                </View>
              </Pressable>
            );
          }}
        />
      )}
      <Modal visible={filters} transparent animationType="slide" onRequestClose={() => setFilters(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setFilters(false)}>
          <Pressable className="rounded-t-3xl bg-card px-5 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 16) }} onPress={(event) => event.stopPropagation()}>
            <View className="mb-4 h-1.5 w-10 self-center rounded-full bg-segment" />
            <Text className="mb-4 text-xl font-extrabold text-foreground">{t('filters')}</Text>
            <Text className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">{t('status')}</Text>
            <View className="mb-5 flex-row flex-wrap gap-2">
              <FilterChip active={!status} label={t('all')} onPress={() => setStatus(null)} />
              {statuses.map((item) => <FilterChip key={item} active={status === item} label={t(`statuses.${item}`)} onPress={() => setStatus(item)} />)}
            </View>
            <Text className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">{t('period')}</Text>
            <View className="flex-row gap-2">
              <FilterChip active={period === 'all'} label={t('all')} onPress={() => setPeriod('all')} />
              <FilterChip active={period === 'month'} label={t('month')} onPress={() => setPeriod('month')} />
              <FilterChip active={period === 'day'} label={t('day')} onPress={() => setPeriod('day')} />
            </View>
            <View className="mt-6 flex-row gap-3">
              <Pressable onPress={() => { setStatus(null); setPeriod('all'); }} className="flex-1 items-center rounded-2xl border border-border py-3.5 active:bg-segment"><Text className="font-bold text-muted">{t('reset')}</Text></Pressable>
              <Pressable onPress={() => setFilters(false)} className="flex-1 items-center rounded-2xl py-3.5 active:opacity-80" style={{ backgroundColor: AMBER }}><Text className="font-extrabold text-white">{t('apply')}</Text></Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function FilterChip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className={`rounded-full border px-3.5 py-2 ${active ? '' : 'border-border bg-card'}`} style={active ? { backgroundColor: AMBER_SOFT, borderColor: AMBER } : undefined}>
      <Text className="text-[12.5px] font-bold" style={{ color: active ? AMBER : '#8A8F99' }}>{label}</Text>
    </Pressable>
  );
}

/** Sectioned form card, same idiom as the medications composer. */
function Section({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  return (
    <View className="gap-3 rounded-2xl border border-border bg-card p-4">
      <View className="flex-row items-center gap-2">
        <View className="h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: AMBER_SOFT }}>
          <Ionicons name={icon} size={14} color={AMBER} />
        </View>
        <Text className="text-[14px] font-extrabold text-foreground">{title}</Text>
      </View>
      {children}
    </View>
  );
}

function FieldLabel({ text, required }: { text: string; required?: boolean }) {
  return (
    <Text className="text-[11px] font-semibold uppercase text-muted">
      {text}
      {required ? <Text style={{ color: AMBER }}> *</Text> : null}
    </Text>
  );
}

export function ComplaintComposerScreen({ api, listChildren, navigation, resolvePhoto }: { api: ComplaintsApi; listChildren(): Promise<ParentChild[]>; navigation: Nav; resolvePhoto?: ResolvePhoto }) {
  const { t } = useTranslation('complaints');
  const insets = useSafeAreaInsets();
  const kids = useQuery({ queryKey: ['profile', 'children'], queryFn: listChildren });
  const [childId, setChildId] = useState('');
  const [category, setCategory] = useState<ComplaintCategory>('other');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState<ComplaintVisibility>('teacher_and_director');
  const [picker, setPicker] = useState(false);
  const selectedId = childId || kids.data?.[0]?.id || '';
  const selectedKid = kids.data?.find((kid) => kid.id === selectedId);
  const create = useMutation({ mutationFn: () => api.create({ childId: selectedId, category, subject, body, visibility }), onSuccess: (result) => navigation.open(result.id), onError: () => Alert.alert(t('sendError')) });
  const canSend = Boolean(selectedId) && subject.trim().length > 0 && body.trim().length > 0 && !create.isPending;
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <Header title={t('new')} back={navigation.back} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerClassName="gap-3 p-4 pb-6" keyboardShouldPersistTaps="handled">
          <Section icon="person-outline" title={t('child')}>
            <Pressable onPress={() => setPicker(true)} className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3 active:bg-segment">
              {selectedKid ? <Avatar person={{ displayName: selectedKid.name, photoMediaAssetId: selectedKid.photoMediaAssetId, photoUrl: selectedKid.photoUrl }} resolvePhoto={resolvePhoto} size={38} tone="sky" /> : <View className="h-[38px] w-[38px] rounded-xl bg-segment" />}
              <Text className="flex-1 text-[15px] font-semibold text-foreground">{selectedKid?.name ?? '—'}</Text>
              <Ionicons name="chevron-down" size={18} color="#89919E" />
            </Pressable>
          </Section>

          <Section icon="document-text-outline" title={t('details')}>
            <View className="gap-1.5">
              <FieldLabel text={t('category')} required />
              <View className="flex-row flex-wrap gap-2">
                {categories.map((item) => {
                  const cv = categoryVisual(item);
                  const on = category === item;
                  return (
                    <Pressable key={item} onPress={() => setCategory(item)} className={`flex-row items-center gap-1.5 rounded-full border px-3 py-2 ${on ? '' : 'border-border bg-card'}`} style={on ? { backgroundColor: cv.bg, borderColor: cv.fg } : undefined}>
                      <Ionicons name={cv.icon} size={14} color={on ? cv.fg : '#8A8F99'} />
                      <Text className="text-[12.5px] font-bold" style={{ color: on ? cv.fg : '#8A8F99' }}>{t(`categories.${item}`)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View className="gap-1.5">
              <FieldLabel text={t('subject')} required />
              <TextInput value={subject} onChangeText={setSubject} maxLength={120} placeholder={t('subjectPlaceholder')} placeholderTextColor="#AEB4BE" className="rounded-xl border border-border bg-card px-3.5 py-3 text-[15px] text-foreground" />
            </View>
            <View className="gap-1.5">
              <FieldLabel text={t('body')} required />
              <TextInput value={body} onChangeText={setBody} maxLength={4000} multiline textAlignVertical="top" placeholder={t('bodyPlaceholder')} placeholderTextColor="#AEB4BE" className="min-h-36 rounded-xl border border-border bg-card px-3.5 py-3 text-[15px] leading-[21px] text-foreground" />
            </View>
          </Section>

          <Section icon="eye-outline" title={t('visibility')}>
            {(['teacher_and_director', 'director_only'] as const).map((item) => {
              const on = visibility === item;
              const director = item === 'director_only';
              const ink = director ? AMBER : '#2C6BB3';
              return (
                <Pressable key={item} onPress={() => setVisibility(item)} className={`flex-row items-start gap-3 rounded-2xl border-2 p-3.5 ${on ? '' : 'border-border bg-card'}`} style={on ? { borderColor: ink, backgroundColor: director ? '#FFF8E8' : '#F1F7FF' } : undefined}>
                  <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: director ? AMBER_SOFT : '#E1F0FF' }}>
                    <Ionicons name={director ? 'lock-closed' : 'people'} size={17} color={ink} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-extrabold text-foreground">{t(director ? 'directorOnly' : 'teacherAndDirector')}</Text>
                    <Text className="mt-0.5 text-[12px] leading-5 text-muted">{t(director ? 'directorOnlyHelp' : 'teacherAndDirectorHelp')}</Text>
                  </View>
                  <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={20} color={on ? ink : '#C4C9D1'} />
                </Pressable>
              );
            })}
          </Section>

          <View className="flex-row items-start gap-2.5 rounded-2xl p-4" style={{ backgroundColor: AMBER_SOFT }}>
            <Ionicons name="shield-checkmark" size={18} color={AMBER} />
            <Text className="flex-1 text-[12.5px] leading-5" style={{ color: '#6E4A00' }}>{t('immutableWarning')}</Text>
          </View>
        </ScrollView>
        <View className="border-t border-border bg-card px-4 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
          <Pressable disabled={!canSend} onPress={() => create.mutate()} className="flex-row items-center justify-center gap-2 rounded-full py-3.5 disabled:opacity-40 active:opacity-90" style={{ backgroundColor: AMBER }}>
            <Ionicons name="paper-plane" size={16} color="#FFFFFF" />
            <Text className="text-[15px] font-bold text-white">{create.isPending ? t('sending') : t('send')}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      <Modal visible={picker} transparent animationType="slide" onRequestClose={() => setPicker(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setPicker(false)}>
          <Pressable className="rounded-t-3xl bg-card px-5 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 16) }} onPress={(event) => event.stopPropagation()}>
            <View className="mb-4 h-1.5 w-10 self-center rounded-full bg-segment" />
            <Text className="mb-2 text-xl font-extrabold text-foreground">{t('child')}</Text>
            {(kids.data ?? []).map((kid) => (
              <Pressable key={kid.id} onPress={() => { setChildId(kid.id); setPicker(false); }} className="flex-row items-center gap-3 rounded-2xl p-3 active:bg-segment">
                <Avatar person={{ displayName: kid.name, photoMediaAssetId: kid.photoMediaAssetId, photoUrl: kid.photoUrl }} resolvePhoto={resolvePhoto} size={40} tone="sky" />
                <Text className="flex-1 text-[15px] font-semibold text-foreground">{kid.name}</Text>
                {kid.id === selectedId ? <Ionicons name="checkmark-circle" size={20} color={AMBER} /> : null}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

export function ComplaintDetailScreen({ api, complaintId, role, currentUserId, navigation, resolvePhoto }: { api: ComplaintsApi; complaintId: string; role: 'parent' | 'teacher' | 'director'; currentUserId: string; navigation: Nav; resolvePhoto?: ResolvePhoto }) {
  const { t, i18n } = useTranslation('complaints');
  const client = useQueryClient();
  const [reply, setReply] = useState('');
  const [resolution, setResolution] = useState('');
  const query = useQuery({ queryKey: ['complaints', 'detail', complaintId], queryFn: () => api.detail({ complaintId }) });
  const refresh = () => { void client.invalidateQueries({ queryKey: ['complaints'] }); };
  const send = useMutation({ mutationFn: () => api.reply({ complaintId, body: reply }), onSuccess: () => { setReply(''); refresh(); }, onError: () => Alert.alert(t('actionError')) });
  const status = useMutation({ mutationFn: (value: { status: 'in_progress' | 'resolved'; resolutionNote?: string }) => api.setStatus({ complaintId, ...value }), onSuccess: refresh, onError: () => Alert.alert(t('actionError')) });
  const withdraw = useMutation({ mutationFn: () => api.withdraw({ complaintId }), onSuccess: refresh, onError: () => Alert.alert(t('actionError')) });
  const data = query.data;
  const timeline = useMemo(() => data ? [...data.replies.map((item) => ({ type: 'reply' as const, at: item.createdAt, item })), ...data.statusEvents.map((item) => ({ type: 'status' as const, at: item.createdAt, item }))].sort((a, b) => a.at.localeCompare(b.at)) : [], [data]);
  if (!data) return <SafeAreaView edges={['top']} className="flex-1 bg-background"><Header title={t('title')} back={navigation.back} /><ActivityIndicator className="mt-20" color={AMBER} /></SafeAreaView>;
  const isParent = role === 'parent';
  // Which side of the thread an author sits on: the family (complainant) reads
  // sky-blue, the center's staff read grape — so avatars and names are tellable
  // apart at a glance. Roles aren't in the payload, but the parent's userId is.
  const side = (userId: string) => userId === data.parent.userId ? { tone: 'sky' as const, name: '#2C6BB3', tint: '#F1F7FF' } : { tone: 'grape' as const, name: '#7C5CD8', tint: '#F7F4FE' };
  const labelName = (person: { userId: string; displayName: string }) => person.userId === currentUserId ? t('you') : person.displayName;
  const cv = categoryVisual(data.category);
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <Header title={data.subject} back={navigation.back} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerClassName="p-4 pb-10" keyboardShouldPersistTaps="handled">
          {/* The case file: category dossier header + filed date footer. */}
          <View className="mb-5 overflow-hidden rounded-2xl border border-border bg-card">
            <View className="flex-row items-center gap-3 p-4" style={{ borderLeftWidth: 4, borderLeftColor: cv.fg }}>
              <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: cv.bg }}>
                <Ionicons name={cv.icon} size={24} color={cv.fg} />
              </View>
              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} className="text-[15px] font-extrabold" style={{ color: cv.fg }}>{t(`categories.${data.category}`)}</Text>
                <Text numberOfLines={1} className="mt-0.5 text-[12px] text-muted">{data.child.displayName}{data.classLabel ? ` · ${data.classLabel}` : ''}</Text>
              </View>
              <StatusPill status={data.status} />
            </View>
            <View className="flex-row items-center justify-between border-t border-border px-4 py-2.5">
              <Text className="text-[11px] text-muted">{t('filed')} · {dateTime(data.createdAt, i18n.language)}</Text>
              {data.visibility === 'director_only' ? <ConfidentialChip /> : null}
            </View>
          </View>

          <Text className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted">{t('timeline')}</Text>

          <TimelineItem person={data.parent} resolvePhoto={resolvePhoto} name={labelName(data.parent)} label={t('original')} labelColor={side(data.parent.userId).name} tone={side(data.parent.userId).tone} tint={side(data.parent.userId).tint} at={data.createdAt} language={i18n.language} accent={AMBER}>
            <Text className="text-[14px] leading-[22px] text-foreground">{data.body}</Text>
          </TimelineItem>

          {timeline.map((entry) => {
            const person = entry.type === 'reply' ? entry.item.sender : entry.item.actor;
            const s = side(person.userId);
            if (entry.type === 'reply') {
              return (
                <TimelineItem key={`reply-${entry.item.id}`} person={person} resolvePhoto={resolvePhoto} name={labelName(person)} label={t('reply')} labelColor={s.name} tone={s.tone} tint={s.tint} at={entry.at} language={i18n.language}>
                  <Text className="text-[14px] leading-[22px] text-foreground">{entry.item.body}</Text>
                </TimelineItem>
              );
            }
            const sc = statusVisual(entry.item.toStatus).fg;
            return (
              <TimelineItem key={`status-${entry.item.id}`} person={person} resolvePhoto={resolvePhoto} name={labelName(person)} label={t('changedStatus', { from: t(`statuses.${entry.item.fromStatus}`), to: t(`statuses.${entry.item.toStatus}`) })} labelColor={sc} tone={s.tone} at={entry.at} language={i18n.language} accent={sc}>
                {entry.item.note ? <Text className="rounded-xl px-3 py-2 text-[13px] leading-5" style={{ backgroundColor: `${sc}14`, color: sc }}>{entry.item.note}</Text> : null}
              </TimelineItem>
            );
          })}

          {data.status !== 'withdrawn' && (isParent || data.status !== 'resolved') ? (
            <View className="mt-3 rounded-2xl border border-border bg-card p-3">
              <TextInput multiline value={reply} onChangeText={setReply} placeholder={t('replyPlaceholder')} placeholderTextColor="#AEB4BE" textAlignVertical="top" className="min-h-20 px-1 text-[15px] leading-[21px] text-foreground" />
              <View className="mt-1 flex-row justify-end">
                <Pressable disabled={!reply.trim() || send.isPending} onPress={() => send.mutate()} className="flex-row items-center gap-1.5 rounded-full px-4 py-2.5 disabled:opacity-40 active:opacity-90" style={{ backgroundColor: AMBER }}>
                  <Ionicons name="send" size={13} color="#FFFFFF" />
                  <Text className="text-[13px] font-bold text-white">{t('reply')}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {!isParent && data.status !== 'resolved' && data.status !== 'withdrawn' ? (
            <View className="mt-4 gap-2.5 rounded-2xl border border-border bg-card p-4">
              <Text className="text-[11px] font-semibold uppercase text-muted">{t('status')}</Text>
              <Pressable disabled={data.status === 'in_progress' || status.isPending} onPress={() => status.mutate({ status: 'in_progress' })} className="items-center rounded-2xl border py-3 disabled:opacity-40 active:bg-segment" style={{ borderColor: '#2C6BB3' }}>
                <Text className="font-bold" style={{ color: '#2C6BB3' }}>{t('markInProgress')}</Text>
              </Pressable>
              <TextInput value={resolution} onChangeText={setResolution} multiline textAlignVertical="top" placeholder={t('resolutionPlaceholder')} placeholderTextColor="#AEB4BE" className="min-h-20 rounded-xl border border-border bg-card p-3 text-[15px] leading-[21px] text-foreground" />
              <Pressable disabled={!resolution.trim() || status.isPending} onPress={() => status.mutate({ status: 'resolved', resolutionNote: resolution })} className="items-center rounded-2xl py-3 disabled:opacity-40 active:opacity-90" style={{ backgroundColor: '#237A42' }}>
                <Text className="font-bold text-white">{t('resolve')}</Text>
              </Pressable>
            </View>
          ) : null}

          {isParent && data.status !== 'resolved' && data.status !== 'withdrawn' ? (
            <Pressable onPress={() => Alert.alert(t('withdrawTitle'), t('withdrawBody'), [{ text: t('cancel'), style: 'cancel' }, { text: t('withdraw'), style: 'destructive', onPress: () => withdraw.mutate() }])} className="mt-3 items-center py-3"><Text className="font-bold text-red-600">{t('withdraw')}</Text></Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** One timeline entry: author photo, side-tinted name, a colored action label,
 *  and an optional left accent bar — the amber "seal" on the original complaint,
 *  the status color on a status change — that sets them apart from plain replies. */
function TimelineItem({ person, resolvePhoto, name, label, labelColor, tone, tint, at, language, accent, children }: { person: Person; resolvePhoto?: ResolvePhoto; name: string; label: string; labelColor: string; tone: keyof typeof avatarTones; tint?: string; at: string; language: string; accent?: string; children?: ReactNode }) {
  return (
    <View className="mb-3 flex-row gap-3">
      <Avatar person={person} resolvePhoto={resolvePhoto} size={40} tone={tone} />
      <View className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card p-3.5" style={{ ...(tint ? { backgroundColor: tint } : {}), ...(accent ? { borderLeftWidth: 3, borderLeftColor: accent } : {}) }}>
        <Text numberOfLines={1} className="text-[14px] font-extrabold" style={{ color: labelColor }}>{name}</Text>
        <Text className="mb-2 mt-0.5 text-[11px] font-semibold text-muted">{label} · {dateTime(at, language)}</Text>
        {children}
      </View>
    </View>
  );
}
