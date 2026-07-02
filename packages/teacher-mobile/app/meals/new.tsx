import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { MealAudienceType, MealType } from '@kichkintoy/shared';
import { DatePickerField } from '@/components/common/date-picker-field';
import { MealMediaPicker, type MealMediaItem } from '@/components/meal/meal-media-picker';
import { ScreenHeader } from '@/components/common/screen-header';
import { Card } from '@/components/ui/card';
import { colors } from '@/constants/theme';
import { MEAL_ORDER, useCreateMeal, useMealAudience } from '@/data/meals';
import { useCenterId } from '@/data/teacher';
import { useAuth } from '@/lib/auth';
import { todayIsoDate } from '@/lib/date';
import { cn } from '@/lib/utils';

const SUN = '#F4A621';

export default function MealComposerScreen() {
  const { t } = useTranslation('meals');
  const router = useRouter();
  const centerId = useCenterId();
  const { session } = useAuth();
  const director = session?.user.role === 'director';

  const [mealDate, setMealDate] = useState(todayIsoDate());
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [audienceType, setAudienceType] = useState<MealAudienceType>(director ? 'center' : 'class');
  const [classIds, setClassIds] = useState<string[]>([]);
  const [menuText, setMenuText] = useState('');
  const [allergyNote, setAllergyNote] = useState('');
  const [media, setMedia] = useState<MealMediaItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const audience = useMealAudience();
  const create = useCreateMeal();
  const mediaUploading = media.some((m) => m.uploading);

  function toggleClass(id: string) {
    setClassIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }

  function save(publish: boolean) {
    setError(null);
    if (!centerId) return setError(t('validation.centerRequired'));
    if (audienceType === 'class' && classIds.length === 0) return setError(t('validation.chooseClass'));
    if (!menuText.trim()) return setError(t('validation.menuRequired'));
    if (mediaUploading) return setError(t('validation.uploadInProgress'));

    create.mutate(
      {
        centerId,
        mealDate,
        mealType,
        audienceType,
        classIds: audienceType === 'class' ? classIds : [],
        menuText: menuText.trim(),
        allergyNote: allergyNote.trim() || undefined,
        mediaAssetIds: media.filter((m) => m.id).map((m) => m.id as string),
        childStatuses: [],
        publish,
      },
      {
        onSuccess: (meal) => router.replace({ pathname: '/meals/[id]', params: { id: meal.id } }),
        onError: () => setError(t('validation.uploadFailed')),
      },
    );
  }

  const busy = create.isPending || mediaUploading;
  const audienceTabs: MealAudienceType[] = director ? ['center', 'class'] : ['class'];

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={t('composer.newTitle')} back />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerClassName="gap-3 p-4 pb-10" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Date + type */}
          <Card className="gap-3">
            <DatePickerField value={mealDate} onChange={setMealDate} label={t('composer.date')} />
            <View>
              <Text className="mb-1.5 text-[13px] font-semibold text-muted">{t('composer.mealType')}</Text>
              <View className="flex-row gap-2">
                {MEAL_ORDER.map((type) => {
                  const active = mealType === type;
                  return (
                    <Pressable
                      key={type}
                      onPress={() => setMealType(type)}
                      className={cn('flex-1 items-center rounded-md border py-2.5', active ? 'border-sunshine-ink bg-sunshine' : 'border-border bg-background')}>
                      <Text numberOfLines={1} className={cn('text-[12px] font-bold', active ? 'text-sunshine-ink' : 'text-muted')}>
                        {t(`mealType.${type}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Card>

          {/* Audience */}
          <Card className="gap-3">
            <Text className="text-base font-extrabold text-foreground">{t('composer.audience')}</Text>
            <View className="flex-row gap-2">
              {audienceTabs.map((value) => {
                const active = audienceType === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => {
                      setAudienceType(value);
                      setClassIds([]);
                    }}
                    className={cn('flex-1 items-center rounded-md border py-2.5', active ? 'border-sunshine-ink bg-sunshine' : 'border-border bg-background')}>
                    <Text className={cn('text-[13px] font-bold', active ? 'text-sunshine-ink' : 'text-muted')}>
                      {t(value === 'center' ? 'audience.wholeCenter' : 'audience.selectedClasses')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {audienceType === 'class' ? (
              audience.data.classes.length === 0 ? (
                <Text className="text-[13px] text-muted">{t('table.allClasses')}</Text>
              ) : (
                <View className="gap-1.5">
                  {audience.data.classes.map((klass) => {
                    const checked = classIds.includes(klass.id);
                    return (
                      <Pressable
                        key={klass.id}
                        onPress={() => toggleClass(klass.id)}
                        className={cn('flex-row items-center gap-3 rounded-md border px-3 py-2.5', checked ? 'border-sunshine-ink bg-sunshine/50' : 'border-border bg-background')}>
                        <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={20} color={checked ? SUN : colors.textMuted} />
                        <Text className="text-[14px] font-semibold text-foreground">{klass.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )
            ) : null}
          </Card>

          {/* Menu + allergy */}
          <Card className="gap-4">
            <View>
              <Text className="mb-1.5 text-[13px] font-semibold text-muted">{t('composer.menuText')}</Text>
              <TextInput
                value={menuText}
                onChangeText={setMenuText}
                maxLength={4000}
                multiline
                placeholder={t('composer.menuPlaceholder')}
                placeholderTextColor={colors.textMuted}
                className="min-h-[90px] rounded-md border border-border bg-background p-3 text-[15px] leading-6 text-foreground"
              />
            </View>
            <View>
              <Text className="mb-1.5 text-[13px] font-semibold text-muted">{t('composer.allergyNote')}</Text>
              <TextInput
                value={allergyNote}
                onChangeText={setAllergyNote}
                maxLength={2000}
                multiline
                placeholder={t('composer.allergyPlaceholder')}
                placeholderTextColor={colors.textMuted}
                className="min-h-[56px] rounded-md border border-border bg-background p-3 text-[15px] text-foreground"
              />
            </View>
          </Card>

          {/* Photos */}
          <MealMediaPicker centerId={centerId} value={media} onChange={setMedia} onError={setError} />

          {error ? (
            <View className="rounded-md bg-coral px-3 py-2.5">
              <Text className="text-[13px] font-semibold text-coral-ink">{error}</Text>
            </View>
          ) : null}

          {/* Actions */}
          <View className="mt-1 flex-row gap-2">
            <Pressable
              disabled={busy}
              onPress={() => save(false)}
              className="h-12 flex-1 flex-row items-center justify-center gap-1.5 rounded-md border border-border bg-card px-2">
              <Ionicons name="save-outline" size={18} color={colors.textPrimary} />
              <Text numberOfLines={1} className="shrink text-[14px] font-bold text-foreground">{t('composer.saveDraft')}</Text>
            </Pressable>
            <Pressable
              disabled={busy}
              onPress={() => save(true)}
              style={{ backgroundColor: SUN }}
              className="h-12 flex-1 flex-row items-center justify-center gap-1.5 rounded-md px-2">
              {create.isPending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="send" size={17} color="#FFFFFF" />}
              <Text numberOfLines={1} className="shrink text-[14px] font-bold text-white">{t('composer.publish')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
