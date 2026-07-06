import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { useSignup, type UserRole } from './context';
import { OptionRow } from './parts';
import { StepFooter } from './step-footer';

const ROLES: { value: UserRole; titleKey: string; descKey: string }[] = [
  { value: 'parent', titleKey: 'signup.parent', descKey: 'signup.parentDesc' },
  { value: 'teacher', titleKey: 'signup.teacher', descKey: 'signup.teacherDesc' },
  { value: 'director', titleKey: 'signup.director', descKey: 'signup.directorDesc' },
];

export function RoleStep() {
  const { t } = useTranslation('app');
  const { draft, update, next } = useSignup();
  const [role, setRole] = useState<UserRole>(draft.role);

  return (
    <View className="gap-4">
      <View>
        <Text className="text-xl font-extrabold text-foreground">{t('signup.roleTitle')}</Text>
        <Text className="mt-1 text-sm text-muted">{t('signup.roleDescription')}</Text>
      </View>

      <View className="gap-2.5">
        {ROLES.map((option) => (
          <OptionRow
            key={option.value}
            title={t(option.titleKey)}
            subtitle={t(option.descKey)}
            selected={role === option.value}
            onPress={() => setRole(option.value)}
          />
        ))}
      </View>

      {role !== 'parent' ? (
        <Text className="text-sm text-coral-ink">{t('login.centerHelpText')}</Text>
      ) : null}

      <StepFooter
        nextLabel={t('actions.continue')}
        nextDisabled={role !== 'parent'}
        onNext={() => {
          update({ role });
          next();
        }}
      />
    </View>
  );
}
