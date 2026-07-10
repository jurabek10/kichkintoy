import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/screen-header';
import { PickupForm, type PickupFormValues } from '@/components/pickup/pickup-form';
import { useCreatePickupNotice, usePickupChildren } from '@/data/pickups';
import { todayIsoDate } from '@/lib/date';
import { useSelectedChildId } from '@/lib/selected-child';

export default function NewPickupScreen() {
  const { t, i18n } = useTranslation('pickups');
  const router = useRouter();
  const { data: children } = usePickupChildren();
  const create = useCreatePickupNotice();
  const [error, setError] = useState<string | null>(null);

  // Default to the globally selected kid (header switcher).
  const { selectedChildId } = useSelectedChildId();
  const [initialChildId, setInitialChildId] = useState('');
  useEffect(() => {
    if (initialChildId || children.length === 0) return;
    const preferred = children.find((c) => c.id === selectedChildId) ?? children[0];
    if (preferred) setInitialChildId(preferred.id);
  }, [children, initialChildId, selectedChildId]);

  function submit(values: PickupFormValues) {
    setError(null);
    create.mutate(
      {
        childId: values.childId,
        pickupDate: values.pickupDate,
        pickupTime: values.pickupTime,
        pickupPersonName: values.pickupPersonName,
        relationship: values.relationship,
        note: values.note || undefined,
      },
      {
        onSuccess: (notice) =>
          router.replace({ pathname: '/pickups/[id]', params: { id: notice.id } }),
        onError: (err) =>
          setError(err instanceof Error ? err.message : t('validation.personRequired')),
      },
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={t('composer.newTitle')} back />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="gap-4 p-4 pb-8">
          <Text className="text-sm leading-5 text-muted">{t('composer.description')}</Text>

          {error ? (
            <View className="rounded-2xl bg-coral px-4 py-3">
              <Text className="text-sm font-semibold text-coral-ink">{error}</Text>
            </View>
          ) : null}

          {/* key on the default child so the form re-inits once children load */}
          <PickupForm
            key={initialChildId}
            mode="create"
            childOptions={children}
            lang={i18n.language}
            initial={{
              childId: initialChildId,
              pickupDate: todayIsoDate(),
              pickupTime: '17:30',
              pickupPersonName: '',
              relationship: 'mother',
              note: '',
            }}
            submitLabel={t('composer.sendNotice')}
            submitting={create.isPending}
            onSubmit={submit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
