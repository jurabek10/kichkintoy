import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { useSignup } from './context';
import { Field } from './parts';
import { StepFooter } from './step-footer';

export function CredentialsStep() {
  const { t } = useTranslation('app');
  const { draft, update, next } = useSignup();
  const [username, setUsername] = useState(draft.username);
  const [password, setPassword] = useState(draft.password);
  const [confirm, setConfirm] = useState('');

  const usernameOk = username.trim().length >= 3;
  const passwordOk = password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
  const match = password === confirm;
  const canContinue = usernameOk && passwordOk && match;

  return (
    <View className="gap-4">
      <View>
        <Text className="text-xl font-extrabold text-foreground">{t('signup.credentialsTitle')}</Text>
        <Text className="mt-1 text-sm text-muted">{t('signup.credentialsDescription')}</Text>
      </View>

      <Field
        label={t('signup.username')}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
        error={username.length > 0 && !usernameOk ? t('signup.errors.usernameMin') : undefined}
      />
      <Field
        label={t('signup.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder={t('signup.passwordPlaceholder')}
        error={password.length > 0 && !passwordOk ? t('signup.errors.passwordMin') : undefined}
      />
      <Field
        label={t('signup.confirmPassword')}
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        placeholder={t('signup.confirmPasswordPlaceholder')}
        error={confirm.length > 0 && !match ? t('signup.errors.passwordMismatch') : undefined}
      />

      <StepFooter
        nextLabel={t('actions.continue')}
        nextDisabled={!canContinue}
        onNext={() => {
          update({ username: username.trim(), password });
          next();
        }}
      />
    </View>
  );
}
