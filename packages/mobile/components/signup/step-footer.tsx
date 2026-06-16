import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { useSignup } from './context';
import { PrimaryButton } from './parts';

type StepFooterProps = {
  nextLabel: string;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLoading?: boolean;
};

/** Previous + Next actions for a signup step (Previous hidden on the first step). */
export function StepFooter({ nextLabel, onNext, nextDisabled, nextLoading }: StepFooterProps) {
  const { t } = useTranslation('app');
  const { stepIndex, back } = useSignup();

  return (
    <View className="flex-row gap-3 pt-2">
      {stepIndex > 0 ? (
        <Pressable
          onPress={back}
          className="flex-1 items-center justify-center rounded-md border border-border py-3.5">
          <Text className="text-base font-bold text-muted">{t('actions.back')}</Text>
        </Pressable>
      ) : null}
      <View className="flex-1">
        <PrimaryButton
          label={nextLabel}
          onPress={onNext}
          disabled={nextDisabled}
          loading={nextLoading}
        />
      </View>
    </View>
  );
}
