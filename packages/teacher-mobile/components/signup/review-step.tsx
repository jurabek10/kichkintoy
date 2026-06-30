import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { useAuth } from '@/lib/auth';
import { orpc } from '@/lib/orpc';

import { useSignup, type ChildGender, type RelationshipType } from './context';
import { StepFooter } from './step-footer';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between border-b border-border py-2.5">
      <Text className="text-sm text-muted">{label}</Text>
      <Text className="text-sm font-semibold text-foreground">{value}</Text>
    </View>
  );
}

export function ReviewStep() {
  const { t } = useTranslation('app');
  const router = useRouter();
  const { signIn } = useAuth();
  const { draft } = useSignup();
  const [error, setError] = useState<string | null>(null);

  const register = useMutation({
    mutationFn: () =>
      orpc.auth.register({
        fullName: draft.fullName,
        phoneNumber: draft.phoneNumber,
        phoneVerificationToken: draft.phoneVerificationToken,
        username: draft.username,
        password: draft.password,
        role: draft.role,
        centerSelection: draft.centerId
          ? { centerId: draft.centerId, classId: draft.classId ?? undefined }
          : undefined,
        child: {
          name: draft.childName,
          dateOfBirth: draft.childDateOfBirth,
          gender: draft.childGender as ChildGender,
          relationshipType: draft.relationshipType as RelationshipType,
        },
      }),
    onSuccess: async (response) => {
      await signIn(response);
      router.replace('/(tabs)');
    },
    onError: (err) => setError((err as { message?: string })?.message ?? 'Error'),
  });

  return (
    <View className="gap-4">
      <View>
        <Text className="text-xl font-extrabold text-foreground">{t('signup.reviewTitle')}</Text>
        <Text className="mt-1 text-sm text-muted">{t('signup.reviewDescription')}</Text>
      </View>

      <View className="rounded-md border border-border bg-card px-4 py-1">
        <Row label={t('signup.name')} value={draft.fullName} />
        <Row label={t('signup.phone')} value={draft.phoneNumber} />
        <Row label={t('signup.username')} value={draft.username} />
        <Row label={t('signup.centerTitle')} value={draft.centerName ?? '—'} />
        {draft.className ? <Row label={t('signup.classTitle')} value={draft.className} /> : null}
        <Row label={t('signup.childName')} value={draft.childName} />
        <Row label={t('signup.birthDate')} value={draft.childDateOfBirth} />
        <Row
          label={t('signup.relationshipTitle')}
          value={draft.relationshipType ? t(`signup.relationshipOptions.${draft.relationshipType}`) : '—'}
        />
      </View>

      {error ? <Text className="text-sm text-coral-ink">{error}</Text> : null}

      <StepFooter
        nextLabel={register.isPending ? t('signup.creating') : t('signup.completeRegistration')}
        nextLoading={register.isPending}
        onNext={() => {
          setError(null);
          register.mutate();
        }}
      />
    </View>
  );
}
