import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/screen-header';
import { Card } from '@/components/ui/card';
import { colors } from '@/constants/theme';
import { formatLongDate, todayIsoDate } from '@/lib/date';
import { orpc } from '@/lib/orpc';
import { teacherQueryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

const CORAL = '#E8674E';

// Option token sets — stored language-neutral, translated at render (see the web
// composer / report-item-i18n). Order mirrors the web dropdowns.
const MOOD = ['happy', 'calm', 'tired', 'sad', 'irritable', 'excited'];
const MEAL = ['all', 'most', 'half', 'little', 'none'];
const SLEEP = ['well_2h', 'well_1h30', 'well_1h', 'briefly', 'no_sleep', 'restless'];
const ACTIVITY = ['very_active', 'active', 'moderate', 'passive', 'solo'];
const HEALTH = ['healthy', 'slight_fever', 'cough', 'stomach', 'unwell'];

type Obs = {
  mood: string;
  breakfast: string;
  lunch: string;
  snack: string;
  sleep: string;
  activity: string;
  healthStatus: string;
  healthNote: string;
};

const EMPTY: Obs = {
  mood: '',
  breakfast: '',
  lunch: '',
  snack: '',
  sleep: '',
  activity: '',
  healthStatus: '',
  healthNote: '',
};

/** A tap-to-open picker: shows the chosen option (or a placeholder) and opens a
 *  bottom sheet of choices. Options are `{ value: token, label: translated }`. */
function SelectField({
  label,
  value,
  placeholder,
  options,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <View>
      <Text className="mb-1.5 text-[13px] font-semibold text-muted">{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        className="h-11 flex-row items-center justify-between rounded-md border border-border bg-background px-3">
        <Text className={cn('text-[15px]', current ? 'text-foreground' : 'text-muted-soft')}>
          {current ? current.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setOpen(false)}>
          <Pressable className="rounded-t-xl bg-card p-4 pb-9" onPress={() => {}}>
            <View className="mb-3 items-center">
              <View className="h-1 w-10 rounded-full bg-segment" />
            </View>
            <Text className="mb-1 text-base font-extrabold text-foreground">{label}</Text>
            {options.map((o) => {
              const active = value === o.value;
              return (
                <Pressable
                  key={o.value}
                  onPress={() => {
                    onChange(active ? '' : o.value);
                    setOpen(false);
                  }}
                  className="flex-row items-center justify-between py-3.5">
                  <Text className={cn('text-[15px]', active ? 'font-bold text-primary' : 'text-foreground')}>
                    {o.label}
                  </Text>
                  {active ? (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  ) : (
                    <View className="h-5 w-5 rounded-full border border-border" />
                  )}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export default function ReportComposerScreen() {
  const params = useLocalSearchParams<{
    childId: string;
    childName?: string;
    classId?: string;
    date?: string;
  }>();
  const childId = params.childId ?? '';
  const childName = params.childName ?? '';
  const classId = params.classId ?? '';
  const date = params.date ?? todayIsoDate();

  const { t, i18n } = useTranslation('reports');
  const lang = i18n.language;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [obs, setObs] = useState<Obs>(EMPTY);
  const [teacherNote, setTeacherNote] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Obs>(key: K, v: Obs[K]) => setObs((p) => ({ ...p, [key]: v }));

  const opts = (keys: string[], group: string) =>
    keys.map((k) => ({ value: k, label: t(`composer.${group}.${k}`) }));

  function buildItems() {
    type Item = {
      itemType: 'meal' | 'sleep' | 'activity' | 'health';
      title?: string;
      value?: string;
      note?: string;
    };
    const items: Item[] = [];
    if (obs.breakfast) items.push({ itemType: 'meal', title: 'breakfast', value: obs.breakfast });
    if (obs.lunch) items.push({ itemType: 'meal', title: 'lunch', value: obs.lunch });
    if (obs.snack) items.push({ itemType: 'meal', title: 'snack', value: obs.snack });
    if (obs.sleep) items.push({ itemType: 'sleep', title: 'nap', value: obs.sleep });
    if (obs.activity) items.push({ itemType: 'activity', title: 'mainActivity', value: obs.activity });
    if (obs.healthStatus)
      items.push({ itemType: 'health', value: obs.healthStatus, note: obs.healthNote || undefined });
    return items;
  }

  const save = useMutation({
    mutationFn: (publish: boolean) =>
      orpc.reports.create({
        childId,
        reportDate: date,
        mood: obs.mood || undefined,
        healthNote: obs.healthNote || undefined,
        teacherNote: teacherNote || undefined,
        items: buildItems(),
        photoAssetIds: [],
        publish,
      }),
    onSuccess: async () => {
      if (classId) {
        await queryClient.invalidateQueries({
          queryKey: teacherQueryKeys.classReportStatuses(classId, date),
        });
      }
      router.back();
    },
    onError: () => setError(t('composer.saveFailed')),
  });

  const hasObservations =
    !!obs.mood || !!obs.breakfast || !!obs.lunch || !!obs.snack || !!obs.sleep || !!obs.activity || !!obs.healthStatus;

  async function generateWithAI() {
    const language = lang === 'ru' ? 'ru' : 'uz';
    const aiItems: { itemType: 'meal' | 'sleep' | 'activity' | 'health'; title?: string; value?: string }[] = [];
    if (obs.breakfast) aiItems.push({ itemType: 'meal', title: t('composer.breakfast'), value: t(`composer.mealOptions.${obs.breakfast}`) });
    if (obs.lunch) aiItems.push({ itemType: 'meal', title: t('composer.lunch'), value: t(`composer.mealOptions.${obs.lunch}`) });
    if (obs.snack) aiItems.push({ itemType: 'meal', title: t('composer.snack'), value: t(`composer.mealOptions.${obs.snack}`) });
    if (obs.sleep) aiItems.push({ itemType: 'sleep', title: t('composer.nap'), value: t(`composer.sleepOptions.${obs.sleep}`) });
    if (obs.activity) aiItems.push({ itemType: 'activity', title: t('composer.mainActivity'), value: t(`composer.activityOptions.${obs.activity}`) });
    if (obs.healthStatus) aiItems.push({ itemType: 'health', value: t(`composer.healthOptions.${obs.healthStatus}`) });

    setAiBusy(true);
    setError(null);
    try {
      const result = await orpc.reports.generateNote({
        language,
        mood: obs.mood ? t(`composer.moodOptions.${obs.mood}`) : undefined,
        items: aiItems.length > 0 ? aiItems : undefined,
      });
      const placeholder = language === 'ru' ? 'ребёнок' : 'bola';
      const name = childName.trim() || placeholder;
      setTeacherNote(result.teacherNote.trim().replace(new RegExp(placeholder, 'gi'), name));
    } catch {
      setError(t('composer.saveFailed'));
    } finally {
      setAiBusy(false);
    }
  }

  const busy = save.isPending || aiBusy;
  const initial = (childName.trim().charAt(0) || '·').toUpperCase();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={t('composer.newReport')} back />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerClassName="gap-3 p-4 pb-10"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Who + when */}
          <Card className="flex-row items-center gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-coral">
              <Text className="text-base font-extrabold text-coral-ink">{initial}</Text>
            </View>
            <View className="flex-1">
              {childName ? (
                <Text className="text-[16px] font-bold text-foreground">{childName}</Text>
              ) : null}
              <Text className="text-[13px] text-muted">{formatLongDate(date, lang)}</Text>
            </View>
          </Card>

          {/* Day observations */}
          <Card className="gap-4">
            <Text className="text-base font-extrabold text-foreground">{t('composer.dayObservations')}</Text>
            <SelectField label={t('detail.mood')} value={obs.mood} placeholder={t('composer.selectOption')} options={opts(MOOD, 'moodOptions')} onChange={(v) => set('mood', v)} />
            <SelectField label={t('composer.breakfast')} value={obs.breakfast} placeholder={t('composer.selectOption')} options={opts(MEAL, 'mealOptions')} onChange={(v) => set('breakfast', v)} />
            <SelectField label={t('composer.lunch')} value={obs.lunch} placeholder={t('composer.selectOption')} options={opts(MEAL, 'mealOptions')} onChange={(v) => set('lunch', v)} />
            <SelectField label={t('composer.snack')} value={obs.snack} placeholder={t('composer.selectOption')} options={opts(MEAL, 'mealOptions')} onChange={(v) => set('snack', v)} />
            <SelectField label={t('composer.nap')} value={obs.sleep} placeholder={t('composer.selectOption')} options={opts(SLEEP, 'sleepOptions')} onChange={(v) => set('sleep', v)} />
            <SelectField label={t('composer.mainActivity')} value={obs.activity} placeholder={t('composer.selectOption')} options={opts(ACTIVITY, 'activityOptions')} onChange={(v) => set('activity', v)} />
            <SelectField label={t('composer.healthStatus')} value={obs.healthStatus} placeholder={t('composer.selectOption')} options={opts(HEALTH, 'healthOptions')} onChange={(v) => set('healthStatus', v)} />
            {obs.healthStatus && obs.healthStatus !== 'healthy' ? (
              <View>
                <Text className="mb-1.5 text-[13px] font-semibold text-muted">{t('composer.healthNoteLabel')}</Text>
                <TextInput
                  value={obs.healthNote}
                  onChangeText={(v) => set('healthNote', v)}
                  placeholder={t('composer.healthNotePlaceholderShort')}
                  placeholderTextColor={colors.textMuted}
                  multiline
                  className="min-h-[64px] rounded-md border border-border bg-background p-3 text-[15px] text-foreground"
                />
              </View>
            ) : null}
          </Card>

          {/* Note for parents + AI */}
          <Card className="gap-3">
            <Text className="text-base font-extrabold text-foreground">{t('composer.aiNoteTitle')}</Text>
            <Text className="text-[13px] leading-5 text-muted">{t('composer.aiNoteDescription')}</Text>
            <TextInput
              value={teacherNote}
              onChangeText={setTeacherNote}
              editable={!aiBusy}
              placeholder={t('composer.teacherNotePlaceholder')}
              placeholderTextColor={colors.textMuted}
              multiline
              className="min-h-[130px] rounded-md border border-border bg-background p-3 text-[15px] leading-6 text-foreground"
            />
            <Pressable
              onPress={generateWithAI}
              disabled={aiBusy || !hasObservations}
              className={cn(
                'h-11 flex-row items-center justify-center gap-2 rounded-md',
                aiBusy || !hasObservations ? 'bg-pill' : 'bg-primary',
              )}>
              {aiBusy ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : (
                <Ionicons name="sparkles" size={17} color={aiBusy || !hasObservations ? colors.textSecondary : '#FFFFFF'} />
              )}
              <Text className={cn('text-[14px] font-bold', aiBusy || !hasObservations ? 'text-muted' : 'text-white')}>
                {aiBusy ? t('composer.generating') : t('composer.generateWithAI')}
              </Text>
            </Pressable>
          </Card>

          {error ? (
            <View className="rounded-md bg-coral px-3 py-2.5">
              <Text className="text-[13px] font-semibold text-coral-ink">{error}</Text>
            </View>
          ) : null}

          {/* Actions */}
          <View className="mt-1 flex-row gap-2">
            <Pressable
              disabled={busy}
              onPress={() => {
                setError(null);
                save.mutate(false);
              }}
              className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-md border border-border bg-card">
              <Ionicons name="save-outline" size={18} color={colors.textPrimary} />
              <Text className="text-[15px] font-bold text-foreground">{t('composer.saveDraft')}</Text>
            </Pressable>
            <Pressable
              disabled={busy}
              onPress={() => {
                setError(null);
                save.mutate(true);
              }}
              style={{ backgroundColor: CORAL }}
              className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-md">
              {save.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={17} color="#FFFFFF" />
              )}
              <Text className="text-[15px] font-bold text-white">{t('composer.publish')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
