import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { SignedMealImage } from '@/components/meal/signed-meal-image';
import { PhotoViewer } from '@/components/common/photo-viewer';
import { Loader } from '@/components/ui/loader';
import {
  eatingStatusKey,
  useDeleteMeal,
  usePublishMeal,
  useSetMealStatuses,
  useSignedMealUrls,
  useStaffMeal,
  type StaffMealDetail,
} from '@/data/meals';
import type { MealEatingStatus } from '@kichkintoy/shared';
import { cn } from '@/lib/utils';

const SUN = '#F4A621';

const EATING_OPTIONS: (MealEatingStatus | '')[] = ['ate_all', 'ate_most', 'ate_some', 'did_not_eat', ''];

function Header({ title }: { title: string }) {
  const router = useRouter();
  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: SUN }}>
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="flex-1 text-center text-lg font-bold text-white">{title}</Text>
        <View className="w-6" />
      </View>
    </SafeAreaView>
  );
}

function Badge({ label, tone = 'muted' }: { label: string; tone?: 'muted' | 'sun' | 'mint' }) {
  const styles =
    tone === 'sun' ? 'bg-sunshine text-sunshine-ink' : tone === 'mint' ? 'bg-mint text-mint-ink' : 'bg-pill text-muted';
  const [bg, text] = styles.split(' ');
  return (
    <View className={cn('rounded-full px-2.5 py-1', bg)}>
      <Text className={cn('text-[11px] font-bold', text)}>{label}</Text>
    </View>
  );
}

/** Bottom sheet to pick a child's eating status. */
function StatusSheet({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (status: MealEatingStatus | '') => void;
}) {
  const { t } = useTranslation('meals');
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable className="rounded-t-3xl bg-card px-4 pt-3" style={{ paddingBottom: insets.bottom + 12 }} onPress={() => {}}>
          <View className="mb-3 items-center">
            <View className="h-1 w-10 rounded-full bg-segment" />
          </View>
          <Text className="mb-1 text-base font-extrabold text-foreground">{t('detail.eatingStatus')}</Text>
          {EATING_OPTIONS.map((option) => (
            <Pressable
              key={option || 'unset'}
              onPress={() => {
                onPick(option);
                onClose();
              }}
              className="py-3.5">
              <Text className="text-[15px] text-foreground">
                {option ? t(eatingStatusKey(option)) : t('detail.notRecorded')}
              </Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Publish / delete controls for the meal's author (or a director). */
function ManageBar({ meal }: { meal: StaffMealDetail }) {
  const { t } = useTranslation('meals');
  const router = useRouter();
  const publish = usePublishMeal(meal.id);
  const remove = useDeleteMeal(meal.id);

  function confirmDelete() {
    Alert.alert(t('detail.deleteConfirmTitle'), t('detail.deleteConfirmBody'), [
      { text: t('detail.cancel'), style: 'cancel' },
      { text: t('detail.delete'), style: 'destructive', onPress: () => remove.mutate(undefined, { onSuccess: () => router.back() }) },
    ]);
  }

  return (
    <View className="mx-4 mt-5 flex-row gap-2">
      {meal.status === 'draft' ? (
        <Pressable
          onPress={() => publish.mutate()}
          disabled={publish.isPending}
          style={{ backgroundColor: SUN }}
          className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-md px-2">
          {publish.isPending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="send" size={16} color="#FFFFFF" />}
          <Text numberOfLines={1} className="shrink text-[14px] font-bold text-white">{t('detail.publish')}</Text>
        </Pressable>
      ) : null}
      <Pressable
        onPress={confirmDelete}
        disabled={remove.isPending}
        className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-md border border-coral-ink/30 bg-coral px-2">
        <Ionicons name="trash-outline" size={16} color="#E8674E" />
        <Text numberOfLines={1} className="shrink text-[14px] font-bold text-coral-ink">{t('detail.delete')}</Text>
      </Pressable>
    </View>
  );
}

export default function MealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const mealId = String(id);
  const { t } = useTranslation('meals');
  const { data: meal, isPending } = useStaffMeal(mealId);
  const setStatuses = useSetMealStatuses(mealId);
  const photoUrls = useSignedMealUrls(meal?.media ?? []);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [statuses, setLocal] = useState<Record<string, MealEatingStatus | ''>>({});
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    if (!meal) return;
    setLocal(Object.fromEntries(meal.childStatuses.map((s) => [s.childId, s.status])));
  }, [meal]);

  if (isPending) {
    return (
      <View className="flex-1 bg-background">
        <Header title={t('title')} />
        <Loader />
      </View>
    );
  }

  if (!meal) {
    return (
      <View className="flex-1 bg-background">
        <Header title={t('title')} />
        <View className="flex-1 items-center justify-center">
          <Text className="text-sm text-muted">{t('detail.notFound')}</Text>
        </View>
      </View>
    );
  }

  function saveStatuses() {
    const payload = Object.entries(statuses)
      .filter(([, status]) => status)
      .map(([childId, status]) => ({ childId, status: status as MealEatingStatus }));
    setStatuses.mutate(payload);
  }

  return (
    <View className="flex-1 bg-background">
      <Header title={t('title')} />

      <ScrollView className="flex-1" contentContainerClassName="pb-10" showsVerticalScrollIndicator={false}>
        {/* Badges + menu */}
        <View className="gap-3 bg-card px-4 pb-4 pt-4">
          <View className="flex-row flex-wrap items-center gap-2">
            <Badge label={t(`mealType.${meal.mealType}`)} tone="sun" />
            <Badge label={meal.dateLabel} />
            <Badge label={t(meal.status === 'draft' ? 'status.draft' : 'status.published')} tone={meal.status === 'published' ? 'mint' : 'muted'} />
            <Badge label={meal.className || t('audience.wholeCenter')} />
          </View>
          <Text className="text-[17px] font-bold leading-6 text-foreground">{meal.menuText}</Text>
        </View>

        {/* Photos */}
        {meal.media.length > 0 ? (
          <View className="flex-row flex-wrap gap-1.5 p-4">
            {meal.media.map((media, index) => (
              <Pressable key={media.id} className="aspect-square w-[31.8%]" onPress={() => setViewerIndex(index)}>
                <SignedMealImage media={media} className="h-full w-full rounded-md" />
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* Allergy */}
        {meal.allergyNote ? (
          <View className="mx-4 mt-1 flex-row items-center gap-2 rounded-md bg-coral px-3 py-2.5">
            <Ionicons name="alert-circle" size={16} color="#E8674E" />
            <Text className="flex-1 text-[13px] text-foreground">
              {t('labels.allergy')}: {meal.allergyNote}
            </Text>
          </View>
        ) : null}

        {/* Manage */}
        <ManageBar meal={meal} />

        {/* Eating status editor */}
        <View className="mx-4 mt-6 rounded-2xl border border-border bg-card p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-bold text-foreground">{t('detail.eatingStatus')}</Text>
            {meal.childStatuses.length > 0 ? (
              <Pressable
                onPress={saveStatuses}
                disabled={setStatuses.isPending}
                className="flex-row items-center gap-1.5 rounded-full bg-sunshine px-3 py-1.5">
                {setStatuses.isPending ? (
                  <ActivityIndicator size="small" color={SUN} />
                ) : (
                  <Ionicons name="save-outline" size={15} color={SUN} />
                )}
                <Text className="text-[13px] font-bold text-sunshine-ink">{t('detail.saveStatus')}</Text>
              </Pressable>
            ) : null}
          </View>

          {meal.childStatuses.length === 0 ? (
            <Text className="mt-3 text-[13px] text-muted">{t('detail.noEatingStatus')}</Text>
          ) : (
            <View className="mt-2">
              {meal.childStatuses.map((child) => {
                const value = statuses[child.childId] ?? '';
                return (
                  <View key={child.childId} className="flex-row items-center gap-3 border-b border-border py-3">
                    <View className="flex-1">
                      <Text className="text-[14px] font-semibold text-foreground">{child.name}</Text>
                      <Text className="text-[11px] text-muted">{child.className ?? t('detail.noClass')}</Text>
                    </View>
                    <Pressable
                      onPress={() => setEditing(child.childId)}
                      className={cn('flex-row items-center gap-1 rounded-full px-3 py-1.5', value ? 'bg-sunshine' : 'bg-pill')}>
                      <Text className={cn('text-[12px] font-bold', value ? 'text-sunshine-ink' : 'text-muted')}>
                        {value ? t(eatingStatusKey(value)) : t('detail.notRecorded')}
                      </Text>
                      <Ionicons name="chevron-down" size={13} color={value ? SUN : '#AEB4BE'} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <StatusSheet
        open={!!editing}
        onClose={() => setEditing(null)}
        onPick={(status) => {
          if (editing) setLocal((current) => ({ ...current, [editing]: status }));
        }}
      />

      <PhotoViewer photos={photoUrls.map((url) => url ?? '')} index={viewerIndex} onClose={() => setViewerIndex(null)} />
    </View>
  );
}
