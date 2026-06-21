import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { languages, setLanguage } from '@/i18n';
import { cn } from '@/lib/utils';

/** Compact uz/ru/en switch for the auth screens (before the account hub). */
export function LanguageSwitch() {
  const { i18n } = useTranslation();
  return (
    <View className="flex-row self-center rounded-full bg-segment p-1">
      {languages.map((language) => {
        const active = i18n.language === language;
        return (
          <Pressable
            key={language}
            onPress={() => setLanguage(language)}
            className={cn('rounded-full px-3 py-1', active && 'bg-card')}>
            <Text className={cn('text-xs font-bold', active ? 'text-primary' : 'text-muted')}>
              {language.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
