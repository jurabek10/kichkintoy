import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { cn } from '@/lib/utils';

import { useSignup, type ChildGender } from './context';
import { Field } from './parts';
import { StepFooter } from './step-footer';

const GENDERS: { value: ChildGender; key: string }[] = [
  { value: 'boy', key: 'signup.boy' },
  { value: 'girl', key: 'signup.girl' },
  { value: 'prefer_not_to_say', key: 'signup.preferNot' },
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function ChildStep() {
  const { t } = useTranslation('app');
  const { draft, update, next } = useSignup();
  const [name, setName] = useState(draft.childName);
  const [dob, setDob] = useState(draft.childDateOfBirth);
  const [gender, setGender] = useState<ChildGender | ''>(draft.childGender);

  const dobOk = ISO_DATE.test(dob);
  const canContinue = name.trim().length > 0 && dobOk && gender !== '';

  return (
    <View className="gap-4">
      <View>
        <Text className="text-xl font-extrabold text-foreground">{t('signup.childTitle')}</Text>
        <Text className="mt-1 text-sm text-muted">
          {t('signup.childDescription', { center: draft.centerName ?? t('signup.yourKindergarten') })}
        </Text>
      </View>

      <Field label={t('signup.childName')} value={name} onChangeText={setName} autoCapitalize="words" />
      <Field
        label={t('signup.birthDate')}
        value={dob}
        onChangeText={setDob}
        placeholder="2023-12-04"
        keyboardType="numbers-and-punctuation"
        error={dob.length > 0 && !dobOk ? 'YYYY-MM-DD' : undefined}
      />

      <View className="gap-1.5">
        <Text className="text-sm font-semibold text-muted">{t('signup.gender')}</Text>
        <View className="flex-row gap-2">
          {GENDERS.map((option) => {
            const active = gender === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setGender(option.value)}
                className={cn(
                  'flex-1 items-center rounded-md border py-2.5',
                  active ? 'border-primary bg-primary' : 'border-border bg-card',
                )}>
                <Text className={cn('text-sm font-semibold', active ? 'text-white' : 'text-muted')}>
                  {t(option.key)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <StepFooter
        nextLabel={t('actions.continue')}
        nextDisabled={!canContinue}
        onNext={() => {
          update({ childName: name.trim(), childDateOfBirth: dob, childGender: gender });
          next();
        }}
      />
    </View>
  );
}
