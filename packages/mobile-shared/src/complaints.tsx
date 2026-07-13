/// <reference path="./nativewind-types.d.ts" />
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type ComponentProps, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
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

/** Author photo (resolves a signed media asset, falls back to a URL, then a
 *  tinted monogram). `tone` colors the monogram to the person's side of the thread. */
function Avatar({ person, resolvePhoto, size = 42, tone = 'indigo' }: { person: Person; resolvePhoto?: ResolvePhoto; size?: number; tone?: 'indigo' | 'sky' | 'amber' }) {
  const signed = useQuery({
    queryKey: ['media', 'download', person.photoMediaAssetId],
    queryFn: () => resolvePhoto!(person.photoMediaAssetId!),
    enabled: Boolean(person.photoMediaAssetId && resolvePhoto),
    staleTime: 240_000,
  });
  const url = signed.data ?? person.photoUrl;
  const initials = person.displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '·';
  const bg = tone === 'sky' ? 'bg-[#E3F0FF]' : tone === 'amber' ? 'bg-[#FFF0CC]' : 'bg-[#E9E8FF]';
  const fg = tone === 'sky' ? 'text-[#2C6BB3]' : tone === 'amber' ? 'text-[#8A5600]' : 'text-[#4A43A8]';
  const dim = { width: size, height: size, borderRadius: Math.round(size * 0.34) };
  if (url) return <Image source={{ uri: url }} style={dim} />;
  return <View style={dim} className={`items-center justify-center ${bg}`}><Text className={`font-extrabold ${fg}`} style={{ fontSize: size * 0.36 }}>{initials}</Text></View>;
}

function StatusPill({ status }: { status: ComplaintStatus }) {
  const { t } = useTranslation('complaints');
  const colors = status === 'open' ? 'bg-[#FFF0CC] text-[#8A5600]' : status === 'in_progress' ? 'bg-[#E9E8FF] text-[#4A43A8]' : status === 'resolved' ? 'bg-[#DDF3E4] text-[#237A42]' : 'bg-segment text-muted';
  return <View className={`rounded-full px-2.5 py-1 ${colors}`}><Text className={`text-[10px] font-extrabold ${colors.split(' ')[1]}`}>{t(`statuses.${status}`)}</Text></View>;
}

function dateTime(value: string, language: string) {
  return new Intl.DateTimeFormat(language, { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
}

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Each complaint category gets its own icon + color pair, so a list or a detail
 *  header is legible and colorful at a glance. */
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

export function ComplaintsListScreen({ api, navigation, role, centerId }: { api: ComplaintsApi; navigation: Nav; role: 'parent' | 'teacher' | 'director'; centerId?: string | null }) {
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
  const activeFilters = (status ? 1 : 0) + (period !== 'all' ? 1 : 0);
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <Header
        title={t('title')}
        subtitle={t('subtitle')}
        back={navigation.back}
        right={role === 'parent' ? <Pressable onPress={navigation.create} hitSlop={8} className="h-10 w-10 items-center justify-center rounded-full bg-[#4A43A8] active:opacity-80"><Ionicons name="add" size={22} color="#FFF" /></Pressable> : undefined}
      />
      <View className="mx-4 mb-2 mt-3 flex-row gap-2">
        <View className="h-12 flex-1 flex-row items-center gap-2.5 rounded-full bg-segment px-4">
          <Ionicons name="search" size={18} color="#89919E" />
          <TextInput value={search} onChangeText={setSearch} placeholder={t('search')} placeholderTextColor="#89919E" returnKeyType="search" className="h-12 flex-1 text-[15px] text-foreground" />
          {search.length ? <Pressable onPress={() => setSearch('')} hitSlop={8}><Ionicons name="close-circle" size={18} color="#C4C9D1" /></Pressable> : null}
        </View>
        <Pressable onPress={() => setFilters(true)} className="relative h-12 w-12 items-center justify-center rounded-full bg-segment active:opacity-70">
          <Ionicons name="options-outline" size={20} color="#4A43A8" />
          {activeFilters ? <View className="absolute right-1.5 top-1.5 h-4 min-w-4 items-center justify-center rounded-full bg-[#4A43A8] px-1"><Text className="text-[9px] font-extrabold text-white">{activeFilters}</Text></View> : null}
        </Pressable>
      </View>
      {query.isLoading ? (
        <ActivityIndicator className="mt-20" color="#4A43A8" />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          onEndReached={() => query.hasNextPage && void query.fetchNextPage()}
          onEndReachedThreshold={0.4}
          contentContainerClassName={rows.length ? (role === 'parent' ? 'px-4 pb-28' : 'px-4 pb-8') : 'flex-1'}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center gap-2 px-8">
              <View className="h-16 w-16 items-center justify-center rounded-3xl bg-[#FFF0CC]"><Ionicons name="shield-checkmark" size={30} color="#B56E00" /></View>
              <Text className="mt-1 text-base font-extrabold text-foreground">{t('empty')}</Text>
              <Text className="text-center text-[13px] leading-5 text-muted">{t('emptyBody')}</Text>
              {role === 'parent' ? <Pressable onPress={navigation.create} className="mt-2 flex-row items-center gap-1.5 rounded-full bg-[#4A43A8] px-5 py-3 active:opacity-80"><Ionicons name="add" size={18} color="#FFF" /><Text className="font-bold text-white">{t('new')}</Text></Pressable> : null}
            </View>
          }
          renderItem={({ item }) => {
            const cv = categoryVisual(item.category);
            return (
              <Pressable onPress={() => navigation.open(item.id)} className="mb-3 rounded-2xl border border-border bg-card p-4 active:bg-segment">
                <View className="flex-row items-start gap-3">
                  <View className="relative h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: cv.bg }}>
                    <Ionicons name={cv.icon} size={20} color={cv.fg} />
                    {item.visibility === 'director_only' ? <View className="absolute -bottom-1 -right-1 h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-[#8A5600]"><Ionicons name="lock-closed" size={9} color="#FFF" /></View> : null}
                  </View>
                  <View className="min-w-0 flex-1">
                    <View className="flex-row items-start gap-2">
                      <Text numberOfLines={1} className="flex-1 text-[15px] font-extrabold text-foreground">{item.subject}</Text>
                      <StatusPill status={item.status} />
                    </View>
                    <Text numberOfLines={1} className="mt-1 text-[12.5px] text-muted">{item.child.displayName} · {t(`categories.${item.category}`)}</Text>
                    <Text className="mt-2 text-[11px] text-muted">{dateTime(item.lastActivityAt, i18n.language)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#C4C9D1" style={{ marginTop: 2 }} />
                </View>
              </Pressable>
            );
          }}
        />
      )}
      {role === 'parent' ? (
        <Pressable
          onPress={navigation.create}
          style={{ bottom: Math.max(insets.bottom, 16) + 8, shadowColor: '#4A43A8', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 6 }}
          className="absolute right-5 h-14 w-14 items-center justify-center rounded-full bg-[#4A43A8] active:opacity-90">
          <Ionicons name="add" size={30} color="#FFF" />
        </Pressable>
      ) : null}
      <Modal visible={filters} transparent animationType="slide" onRequestClose={() => setFilters(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setFilters(false)}>
          <Pressable className="rounded-t-3xl bg-card px-5 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 16) }} onPress={(event) => event.stopPropagation()}>
            <View className="mb-4 h-1.5 w-10 self-center rounded-full bg-segment" />
            <Text className="mb-4 text-xl font-extrabold text-foreground">{t('filters')}</Text>
            <Text className="mb-2 text-[12px] font-bold uppercase tracking-wider text-muted">{t('status')}</Text>
            <View className="mb-5 flex-row flex-wrap gap-2">
              <FilterChip active={!status} label={t('all')} onPress={() => setStatus(null)} />
              {statuses.map((item) => <FilterChip key={item} active={status === item} label={t(`statuses.${item}`)} onPress={() => setStatus(item)} />)}
            </View>
            <Text className="mb-2 text-[12px] font-bold uppercase tracking-wider text-muted">{t('period')}</Text>
            <View className="flex-row gap-2">
              <FilterChip active={period === 'all'} label={t('all')} onPress={() => setPeriod('all')} />
              <FilterChip active={period === 'month'} label={t('month')} onPress={() => setPeriod('month')} />
              <FilterChip active={period === 'day'} label={t('day')} onPress={() => setPeriod('day')} />
            </View>
            <View className="mt-6 flex-row gap-3">
              <Pressable onPress={() => { setStatus(null); setPeriod('all'); }} className="flex-1 items-center rounded-2xl border border-border py-3.5 active:bg-segment"><Text className="font-bold text-muted">{t('reset')}</Text></Pressable>
              <Pressable onPress={() => setFilters(false)} className="flex-1 items-center rounded-2xl bg-[#4A43A8] py-3.5 active:opacity-80"><Text className="font-extrabold text-white">{t('apply')}</Text></Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function FilterChip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) { return <Pressable onPress={onPress} className={`rounded-full border px-3.5 py-2 ${active ? 'border-[#4A43A8] bg-[#E9E8FF]' : 'border-border bg-card'}`}><Text className={`text-[12.5px] font-bold ${active ? 'text-[#4A43A8]' : 'text-muted'}`}>{label}</Text></Pressable>; }

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
        <ScrollView contentContainerClassName="p-4 pb-6" keyboardShouldPersistTaps="handled">
          <Text className="mb-1.5 text-[12px] font-bold uppercase tracking-wider text-muted">{t('child')}</Text>
          <Pressable onPress={() => setPicker(true)} className="mb-5 flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3 active:bg-segment">
            {selectedKid ? <Avatar person={{ displayName: selectedKid.name, photoMediaAssetId: selectedKid.photoMediaAssetId, photoUrl: selectedKid.photoUrl }} resolvePhoto={resolvePhoto} size={38} tone="sky" /> : <View className="h-[38px] w-[38px] rounded-xl bg-segment" />}
            <Text className="flex-1 text-[15px] font-semibold text-foreground">{selectedKid?.name ?? '—'}</Text>
            <Ionicons name="chevron-down" size={18} color="#89919E" />
          </Pressable>

          <Text className="mb-2 text-[12px] font-bold uppercase tracking-wider text-muted">{t('category')}</Text>
          <View className="mb-5 flex-row flex-wrap gap-2">
            {categories.map((item) => <FilterChip key={item} active={category === item} label={t(`categories.${item}`)} onPress={() => setCategory(item)} />)}
          </View>

          <Text className="mb-1.5 text-[12px] font-bold uppercase tracking-wider text-muted">{t('subject')}</Text>
          <TextInput value={subject} onChangeText={setSubject} maxLength={120} placeholderTextColor="#89919E" className="mb-5 rounded-2xl border border-border bg-card px-4 py-3.5 text-[15px] text-foreground" />

          <Text className="mb-1.5 text-[12px] font-bold uppercase tracking-wider text-muted">{t('body')}</Text>
          <TextInput value={body} onChangeText={setBody} maxLength={4000} multiline textAlignVertical="top" placeholderTextColor="#89919E" className="mb-5 min-h-36 rounded-2xl border border-border bg-card px-4 py-3.5 text-[15px] leading-[21px] text-foreground" />

          <Text className="mb-2 text-[12px] font-bold uppercase tracking-wider text-muted">{t('visibility')}</Text>
          {(['teacher_and_director', 'director_only'] as const).map((item) => {
            const on = visibility === item;
            const director = item === 'director_only';
            return (
              <Pressable key={item} onPress={() => setVisibility(item)} className={`mb-3 flex-row items-start gap-3 rounded-2xl border-2 p-4 ${on ? (director ? 'border-[#E3A52E] bg-[#FFF8E8]' : 'border-[#4A43A8] bg-[#F3F2FF]') : 'border-border bg-card'}`}>
                <Ionicons name={director ? 'lock-closed' : 'people'} size={22} color={director ? '#B56E00' : '#4A43A8'} />
                <View className="flex-1">
                  <Text className="font-extrabold text-foreground">{t(director ? 'directorOnly' : 'teacherAndDirector')}</Text>
                  <Text className="mt-1 text-[12px] leading-5 text-muted">{t(director ? 'directorOnlyHelp' : 'teacherAndDirectorHelp')}</Text>
                </View>
                <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={20} color={on ? (director ? '#B56E00' : '#4A43A8') : '#C4C9D1'} />
              </Pressable>
            );
          })}

          <View className="mt-1 flex-row gap-2.5 rounded-2xl bg-[#E9E8FF] p-4">
            <Ionicons name="information-circle" size={20} color="#4A43A8" />
            <Text className="flex-1 text-[12px] leading-5 text-[#3C377E]">{t('immutableWarning')}</Text>
          </View>
        </ScrollView>
        <View className="border-t border-border bg-card px-4 pt-2.5" style={{ paddingBottom: Math.max(insets.bottom, 10) }}>
          <Pressable disabled={!canSend} onPress={() => create.mutate()} className="flex-row items-center justify-center gap-2 rounded-2xl bg-[#4A43A8] py-4 disabled:opacity-40 active:opacity-90">
            <Ionicons name="send" size={16} color="#FFFFFF" />
            <Text className="font-extrabold text-white">{create.isPending ? t('sending') : t('send')}</Text>
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
                {kid.id === selectedId ? <Ionicons name="checkmark-circle" size={20} color="#4A43A8" /> : null}
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
  const send = useMutation({ mutationFn: () => api.reply({ complaintId, body: reply }), onSuccess: () => { setReply(''); refresh(); } });
  const status = useMutation({ mutationFn: (value: { status: 'in_progress' | 'resolved'; resolutionNote?: string }) => api.setStatus({ complaintId, ...value }), onSuccess: refresh });
  const withdraw = useMutation({ mutationFn: () => api.withdraw({ complaintId }), onSuccess: refresh });
  const data = query.data;
  const timeline = useMemo(() => data ? [...data.replies.map((item) => ({ type: 'reply' as const, at: item.createdAt, item })), ...data.statusEvents.map((item) => ({ type: 'status' as const, at: item.createdAt, item }))].sort((a, b) => a.at.localeCompare(b.at)) : [], [data]);
  if (!data) return <SafeAreaView edges={['top']} className="flex-1 bg-background"><Header title={t('title')} back={navigation.back} /><ActivityIndicator className="mt-20" color="#4A43A8" /></SafeAreaView>;
  const isParent = role === 'parent';
  // Which side of the thread an author sits on: the family (complainant) reads
  // sky-blue, the center's staff read indigo — so avatars and names are tellable
  // apart at a glance. Roles aren't in the payload, but the parent's userId is.
  const side = (userId: string) => userId === data.parent.userId ? { tone: 'sky' as const, name: '#2C6BB3', tint: '#F1F7FF' } : { tone: 'indigo' as const, name: '#4A43A8', tint: '#F5F4FE' };
  const labelName = (person: { userId: string; displayName: string }) => person.userId === currentUserId ? t('you') : person.displayName;
  const cv = categoryVisual(data.category);
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <Header title={data.subject} back={navigation.back} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerClassName="p-4 pb-10" keyboardShouldPersistTaps="handled">
          <View className="mb-5 flex-row items-center gap-3 overflow-hidden rounded-2xl border border-border bg-card p-4" style={{ borderLeftWidth: 4, borderLeftColor: cv.fg }}>
            <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: cv.bg }}>
              <Ionicons name={cv.icon} size={24} color={cv.fg} />
            </View>
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} className="text-[15px] font-extrabold" style={{ color: cv.fg }}>{t(`categories.${data.category}`)}</Text>
              <Text numberOfLines={1} className="mt-0.5 text-[12px] text-muted">{data.child.displayName}{data.classLabel ? ` · ${data.classLabel}` : ''}</Text>
            </View>
            <View className="items-end gap-1">
              <StatusPill status={data.status} />
              {data.visibility === 'director_only' ? <View className="flex-row items-center gap-1"><Ionicons name="lock-closed" size={11} color="#8A5600" /><Text className="text-[10px] font-bold text-[#8A5600]">{t('confidential')}</Text></View> : null}
            </View>
          </View>

          <Text className="mb-3 text-[12px] font-bold uppercase tracking-wider text-muted">{t('timeline')}</Text>

          <TimelineItem person={data.parent} resolvePhoto={resolvePhoto} name={labelName(data.parent)} label={t('original')} labelColor={side(data.parent.userId).name} tone={side(data.parent.userId).tone} tint={side(data.parent.userId).tint} at={data.createdAt} language={i18n.language} accent="#E3A52E">
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
            const sc = statusColor(entry.item.toStatus);
            return (
              <TimelineItem key={`status-${entry.item.id}`} person={person} resolvePhoto={resolvePhoto} name={labelName(person)} label={t('changedStatus', { from: t(`statuses.${entry.item.fromStatus}`), to: t(`statuses.${entry.item.toStatus}`) })} labelColor={sc} tone={s.tone} at={entry.at} language={i18n.language} accent={sc}>
                {entry.item.note ? <Text className="rounded-xl px-3 py-2 text-[13px] leading-5" style={{ backgroundColor: `${sc}14`, color: sc }}>{entry.item.note}</Text> : null}
              </TimelineItem>
            );
          })}

          {data.status !== 'withdrawn' && (isParent || data.status !== 'resolved') ? (
            <View className="mt-4 rounded-2xl border border-border bg-card p-3">
              <TextInput multiline value={reply} onChangeText={setReply} placeholder={t('replyPlaceholder')} placeholderTextColor="#89919E" textAlignVertical="top" className="min-h-20 text-[15px] leading-[21px] text-foreground" />
              <Pressable disabled={!reply.trim() || send.isPending} onPress={() => send.mutate()} className="mt-1 flex-row items-center justify-center gap-2 rounded-xl bg-[#4A43A8] py-3 disabled:opacity-40 active:opacity-90"><Ionicons name="send" size={15} color="#FFFFFF" /><Text className="font-bold text-white">{t('reply')}</Text></Pressable>
            </View>
          ) : null}

          {!isParent && data.status !== 'resolved' && data.status !== 'withdrawn' ? (
            <View className="mt-4 gap-2">
              <Pressable disabled={data.status === 'in_progress'} onPress={() => status.mutate({ status: 'in_progress' })} className="items-center rounded-2xl border border-[#4A43A8] py-3 disabled:opacity-40 active:bg-segment"><Text className="font-bold text-[#4A43A8]">{t('markInProgress')}</Text></Pressable>
              <TextInput value={resolution} onChangeText={setResolution} multiline textAlignVertical="top" placeholder={t('resolutionPlaceholder')} placeholderTextColor="#89919E" className="min-h-20 rounded-2xl border border-border bg-card p-3 text-foreground" />
              <Pressable disabled={!resolution.trim()} onPress={() => status.mutate({ status: 'resolved', resolutionNote: resolution })} className="items-center rounded-2xl bg-[#237A42] py-3 disabled:opacity-40 active:opacity-90"><Text className="font-bold text-white">{t('resolve')}</Text></Pressable>
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

function statusColor(s: ComplaintStatus) {
  return s === 'resolved' ? '#237A42' : s === 'in_progress' ? '#4A43A8' : s === 'withdrawn' ? '#6B7280' : '#8A5600';
}

/** One timeline entry: author photo, role-tinted name, a colored action label,
 *  and an optional left accent bar that sets the original complaint and status
 *  changes apart from plain replies. */
function TimelineItem({ person, resolvePhoto, name, label, labelColor, tone, tint, at, language, accent, children }: { person: Person; resolvePhoto?: ResolvePhoto; name: string; label: string; labelColor: string; tone: 'indigo' | 'sky' | 'amber'; tint?: string; at: string; language: string; accent?: string; children?: ReactNode }) {
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
