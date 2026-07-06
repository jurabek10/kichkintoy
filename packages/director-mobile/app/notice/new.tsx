import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { NoticeTargetType } from '@kichkintoy/shared';
import { ScreenHeader } from '@/components/common/screen-header';
import { Card } from '@/components/ui/card';
import { colors } from '@/constants/theme';
import { useCreateNotice, useNoticeAudience } from '@/data/notices';
import { useAuth } from '@/lib/auth';
import { useCenterId } from '@/data/teacher';
import { cn } from '@/lib/utils';

const SKY = '#3E8FE0';

/** A labelled switch row — one composer toggle. */
function ToggleRow({
  icon,
  label,
  value,
  onChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View className="flex-row items-center gap-3">
      <Ionicons name={icon} size={18} color={colors.textSecondary} />
      <Text className="flex-1 text-[15px] font-semibold text-foreground">{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: SKY, false: colors.textMuted }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

export default function NoticeComposerScreen() {
  const { t } = useTranslation('notices');
  const router = useRouter();
  const centerId = useCenterId();
  const { session } = useAuth();
  const director = session?.user.role === 'director';

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState<NoticeTargetType>(director ? 'center' : 'class');
  const [targetIds, setTargetIds] = useState<string[]>([]);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);
  const [allowComments, setAllowComments] = useState(true);
  const [isPinned, setIsPinned] = useState(false);
  const [isImportant, setIsImportant] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audience = useNoticeAudience();
  const create = useCreateNotice();

  const choices = useMemo<{ id: string; name: string; className: string | null }[]>(() => {
    if (targetType === 'class') {
      return audience.data.classes.map((c) => ({ id: c.id, name: c.name, className: null }));
    }
    return audience.data.children.map((c) => ({ id: c.id, name: c.name, className: c.className }));
  }, [audience.data, targetType]);

  const audienceTabs: NoticeTargetType[] = director ? ['center', 'class', 'child'] : ['class', 'child'];

  function pickAudience(value: NoticeTargetType) {
    setTargetType(value);
    setTargetIds([]);
  }

  function toggleTarget(id: string) {
    setTargetIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }

  function save(publish: boolean) {
    setError(null);
    if (!centerId) return setError(t('validation.centerRequired'));
    if (!title.trim()) return setError(t('validation.titleRequired'));
    if (!body.trim()) return setError(t('validation.bodyRequired'));
    if (targetType !== 'center' && targetIds.length === 0) {
      return setError(t('validation.targetRequired'));
    }
    create.mutate(
      {
        centerId,
        title: title.trim(),
        body: body.trim(),
        targetType,
        targetIds: targetType === 'center' ? [] : targetIds,
        requiresConfirmation,
        allowComments,
        isPinned: director ? isPinned : false,
        isImportant,
        publish,
      },
      {
        onSuccess: (notice) => router.replace({ pathname: '/notice/[id]', params: { id: notice.id } }),
        onError: () => setError(t('composer.saveFailed')),
      },
    );
  }

  const busy = create.isPending;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={t('composer.newTitle')} back />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerClassName="gap-3 p-4 pb-10"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Message */}
          <Card className="gap-4">
            <View>
              <Text className="mb-1.5 text-[13px] font-semibold text-muted">{t('composer.title')}</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                maxLength={120}
                placeholder={t('composer.titlePlaceholder')}
                placeholderTextColor={colors.textMuted}
                className="h-11 rounded-md border border-border bg-background px-3 text-[15px] text-foreground"
              />
            </View>
            <View>
              <Text className="mb-1.5 text-[13px] font-semibold text-muted">{t('composer.body')}</Text>
              <TextInput
                value={body}
                onChangeText={setBody}
                maxLength={6000}
                multiline
                placeholder={t('composer.bodyPlaceholder')}
                placeholderTextColor={colors.textMuted}
                className="min-h-[150px] rounded-md border border-border bg-background p-3 text-[15px] leading-6 text-foreground"
              />
            </View>
          </Card>

          {/* Audience */}
          <Card className="gap-3">
            <Text className="text-base font-extrabold text-foreground">{t('composer.audience')}</Text>
            <View className="flex-row gap-2">
              {audienceTabs.map((value) => {
                const active = targetType === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => pickAudience(value)}
                    className={cn(
                      'flex-1 items-center rounded-md border py-2.5',
                      active ? 'border-sky-ink bg-sky' : 'border-border bg-background',
                    )}>
                    <Text className={cn('text-[13px] font-bold', active ? 'text-sky-ink' : 'text-muted')}>
                      {t(`audience.${value}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {targetType === 'center' ? (
              <View className="flex-row items-center gap-2 rounded-md bg-sky/60 px-3 py-2.5">
                <Ionicons name="business-outline" size={16} color={SKY} />
                <Text className="flex-1 text-[13px] text-sky-ink">{t('composer.centerHint')}</Text>
              </View>
            ) : audience.isPending ? (
              <View className="py-3">
                <ActivityIndicator size="small" color={SKY} />
              </View>
            ) : choices.length === 0 ? (
              <Text className="py-2 text-[13px] text-muted">
                {targetType === 'class' ? t('composer.noClasses') : t('composer.noChildren')}
              </Text>
            ) : (
              <View className="gap-1.5">
                {choices.map((choice) => {
                  const checked = targetIds.includes(choice.id);
                  return (
                    <Pressable
                      key={choice.id}
                      onPress={() => toggleTarget(choice.id)}
                      className={cn(
                        'flex-row items-center gap-3 rounded-md border px-3 py-2.5',
                        checked ? 'border-sky-ink bg-sky/50' : 'border-border bg-background',
                      )}>
                      <Ionicons
                        name={checked ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={checked ? SKY : colors.textMuted}
                      />
                      <View className="flex-1">
                        <Text className="text-[14px] font-semibold text-foreground">{choice.name}</Text>
                        {choice.className ? (
                          <Text className="text-[11px] text-muted">{choice.className}</Text>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </Card>

          {/* Options */}
          <Card className="gap-4">
            <Text className="text-base font-extrabold text-foreground">{t('composer.options')}</Text>
            <ToggleRow
              icon="checkmark-done-outline"
              label={t('composer.requiresConfirmation')}
              value={requiresConfirmation}
              onChange={setRequiresConfirmation}
            />
            <ToggleRow
              icon="chatbubbles-outline"
              label={t('composer.allowComments')}
              value={allowComments}
              onChange={setAllowComments}
            />
            <ToggleRow
              icon="star-outline"
              label={t('composer.important')}
              value={isImportant}
              onChange={setIsImportant}
            />
            {director ? (
              <ToggleRow
                icon="bookmark-outline"
                label={t('composer.pinNotice')}
                value={isPinned}
                onChange={setIsPinned}
              />
            ) : null}
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
              onPress={() => save(false)}
              className="h-12 flex-1 flex-row items-center justify-center gap-1.5 rounded-md border border-border bg-card px-2">
              <Ionicons name="save-outline" size={18} color={colors.textPrimary} />
              <Text numberOfLines={1} className="shrink text-[14px] font-bold text-foreground">
                {t('composer.saveDraft')}
              </Text>
            </Pressable>
            <Pressable
              disabled={busy}
              onPress={() => save(true)}
              style={{ backgroundColor: SKY }}
              className="h-12 flex-1 flex-row items-center justify-center gap-1.5 rounded-md px-2">
              {busy ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={17} color="#FFFFFF" />
              )}
              <Text numberOfLines={1} className="shrink text-[14px] font-bold text-white">
                {t('composer.publish')}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
