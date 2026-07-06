import { relationshipTypeValues } from '@kichkintoy/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { useSignup, type RelationshipType } from './context';
import { OptionRow } from './parts';
import { StepFooter } from './step-footer';

export function RelationshipStep() {
  const { t } = useTranslation('app');
  const { draft, update, next } = useSignup();
  const [relationship, setRelationship] = useState<RelationshipType | ''>(draft.relationshipType);

  return (
    <View className="gap-4">
      <View>
        <Text className="text-xl font-extrabold text-foreground">
          {t('signup.relationshipTitle')}
        </Text>
        <Text className="mt-1 text-sm text-muted">{t('signup.relationshipDescription')}</Text>
      </View>

      <View className="gap-2">
        {relationshipTypeValues.map((value) => (
          <OptionRow
            key={value}
            title={t(`signup.relationshipOptions.${value}`)}
            selected={relationship === value}
            onPress={() => setRelationship(value)}
          />
        ))}
      </View>

      <StepFooter
        nextLabel={t('actions.continue')}
        nextDisabled={relationship === ''}
        onNext={() => {
          update({ relationshipType: relationship });
          next();
        }}
      />
    </View>
  );
}
