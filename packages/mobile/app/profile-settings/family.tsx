import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, Share, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackHeader } from '@/components/common/stack-header';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { Loader } from '@/components/ui/loader';
import { orpc } from '@/lib/orpc';
import { queryKeys } from '@/lib/query-keys';
import { queryClient } from '@/lib/query';

const relationships = ['father', 'mother', 'grandfather', 'grandmother', 'other'] as const;
const bot = process.env.EXPO_PUBLIC_TELEGRAM_BOT_USERNAME || 'KichkintoyUzBot';
const grouped = (code: string) => `${code.slice(0, 3)} ${code.slice(3)}`;
const date = (value: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value)).replace(',', '');

export default function FamilyScreen() {
  const { t } = useTranslation('profile');
  const [open, setOpen] = useState(false); const [relationship, setRelationship] = useState<typeof relationships[number]>('father');
  const [created, setCreated] = useState<{ code: string; expiresAt: string } | null>(null);
  const family = useQuery({ queryKey: queryKeys.family.all, queryFn: () => orpc.family.listGuardians({}) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.family.all });
  const create = useMutation({ mutationFn: () => orpc.family.createInvitation({ relationship }), onSuccess: (result) => { setCreated(result); void refresh(); }, onError: (e) => Alert.alert(t('errors.saveFailed'), (e as Error).message) });
  const revoke = useMutation({ mutationFn: (invitationId: string) => orpc.family.revokeInvitation({ invitationId }), onSuccess: refresh });
  const remove = useMutation({ mutationFn: (userId: string) => orpc.family.removeGuardian({ userId }), onSuccess: refresh });
  const share = (code: string) => Share.share({ message: t('family.invite.shareMessage', { bot, code }) });
  const allAtCap = !!family.data?.children.length && family.data.children.every((child) => child.guardians.length >= 3);

  if (family.isPending) return <SafeAreaView edges={['top']} className="flex-1 bg-header-blue"><StackHeader title={t('family.title')} /><View className="flex-1 bg-background"><Loader /></View></SafeAreaView>;
  return <SafeAreaView edges={['top']} className="flex-1 bg-header-blue"><StackHeader title={t('family.title')} />
    <ScrollView className="flex-1 bg-background" refreshControl={<RefreshControl refreshing={family.isRefetching} onRefresh={() => family.refetch()} />} contentContainerClassName="gap-4 p-4 pb-28">
      {family.data?.children.map((child) => <View key={child.id} className="overflow-hidden rounded-2xl border border-border bg-card">
        <View className="border-b border-border bg-pill px-4 py-3"><Text className="text-base font-extrabold text-foreground">{child.fullName}</Text></View>
        {child.guardians.map((guardian) => <View key={guardian.userId} className="flex-row items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
          <ProfileAvatar photo={guardian.avatarUrl} name={guardian.fullName} size={42} fallbackClassName="bg-sky" fallbackTextClassName="text-sky-ink" />
          <View className="min-w-0 flex-1"><Text className="font-bold text-foreground">{guardian.fullName}</Text><View className="mt-1 flex-row gap-1.5"><Text className="rounded-full bg-segment px-2 py-0.5 text-[11px] font-semibold text-muted">{t(`family.relationship.${guardian.relationship}`)}</Text>{guardian.isPrimary ? <Text className="rounded-full bg-mint px-2 py-0.5 text-[11px] font-bold text-mint-ink">{t('family.primary')}</Text> : null}</View>{guardian.telegramUsername ? <Text className="mt-1 text-xs text-muted">@{guardian.telegramUsername}</Text> : null}</View>
          {family.data.canManage && !guardian.isPrimary ? <Pressable onPress={() => Alert.alert(t('family.remove.confirmTitle'), t('family.remove.confirmBody', { name: guardian.fullName }), [{ text: t('actions.cancel'), style: 'cancel' }, { text: t('family.remove.action'), style: 'destructive', onPress: () => remove.mutate(guardian.userId) }])}><Text className="font-bold text-coral-ink">{t('family.remove.action')}</Text></Pressable> : null}
        </View>)}
      </View>)}
      {family.data?.canManage && family.data.pendingInvitations.length ? <View><Text className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">{t('family.pendingTitle')}</Text><View className="overflow-hidden rounded-2xl border border-border bg-card">{family.data.pendingInvitations.map((invite) => <View key={invite.id} className="flex-row items-center gap-3 border-b border-border px-4 py-3"><View className="flex-1"><Text className="text-lg font-extrabold tracking-[3px] text-foreground">{grouped(invite.code)}</Text><Text className="text-xs text-muted">{t(`family.relationship.${invite.relationship}`)} · {t('family.invite.expires', { date: date(invite.expiresAt) })}</Text></View><Pressable onPress={() => share(invite.code)}><Ionicons name="share-outline" size={22} color="#229ED9" /></Pressable><Pressable onPress={() => revoke.mutate(invite.id)}><Ionicons name="trash-outline" size={21} color="#D5524A" /></Pressable></View>)}</View></View> : null}
    </ScrollView>
    {family.data?.canManage ? <View className="absolute bottom-0 left-0 right-0 border-t border-border bg-card p-4"><Pressable disabled={allAtCap} onPress={() => { setCreated(null); setOpen(true); }} className={`items-center rounded-xl py-3.5 ${allAtCap ? 'bg-segment' : 'bg-primary'}`}><Text className={`font-bold ${allAtCap ? 'text-muted' : 'text-white'}`}>{t('family.invite.cta')}</Text></Pressable>{allAtCap ? <Text className="mt-1 text-center text-xs text-muted">{t('family.invite.capReached')}</Text> : null}</View> : null}
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}><View className="flex-1 justify-end bg-black/35"><View className="rounded-t-3xl bg-card p-6 pb-10">{created ? <View className="items-center gap-4"><Text className="text-4xl font-black tracking-[6px] text-foreground">{grouped(created.code)}</Text><View className="w-full gap-2"><Text>1. {t('family.invite.step1', { bot })}</Text><Text>2. {t('family.invite.step2')}</Text><Text>3. {t('family.invite.step3')}</Text></View><Text className="text-xs text-muted">{t('family.invite.expires', { date: date(created.expiresAt) })}</Text><Pressable onPress={() => share(created.code)} className="w-full items-center rounded-xl bg-[#229ED9] py-3.5"><Text className="font-bold text-white">{t('family.invite.share')}</Text></Pressable></View> : <View className="gap-3"><Text className="text-xl font-extrabold text-foreground">{t('family.invite.cta')}</Text>{relationships.map((item) => <Pressable key={item} onPress={() => setRelationship(item)} className={`flex-row items-center justify-between rounded-xl border p-4 ${relationship === item ? 'border-primary bg-pill' : 'border-border'}`}><Text className="font-semibold">{t(`family.relationship.${item}`)}</Text>{relationship === item ? <Ionicons name="checkmark-circle" size={22} color="#2864DC" /> : null}</Pressable>)}<Pressable disabled={create.isPending} onPress={() => create.mutate()} className="items-center rounded-xl bg-primary py-3.5"><Text className="font-bold text-white">{t('family.invite.create')}</Text></Pressable></View>}<Pressable onPress={() => setOpen(false)} className="mt-4 items-center"><Text className="font-semibold text-muted">{t('actions.cancel')}</Text></Pressable></View></View></Modal>
  </SafeAreaView>;
}
