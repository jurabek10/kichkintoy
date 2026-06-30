import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { languages, setLanguage, type Language } from '@/i18n';

export default function LanguageScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation('common');

  async function choose(language: Language) {
    await setLanguage(language);
    router.back();
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={26} color={colors.textPrimary} />
        </Pressable>
        <Text className="text-lg font-bold text-foreground">{t('language.label')}</Text>
        <View className="w-[26px]" />
      </View>

      <View className="mt-3 border-y border-border bg-card">
        {languages.map((language) => {
          const active = i18n.language === language;
          return (
            <Pressable
              key={language}
              onPress={() => choose(language)}
              className="flex-row items-center justify-between border-b border-border px-4 py-4">
              <Text className={active ? 'text-base font-bold text-primary' : 'text-base text-foreground'}>
                {t(`language.${language}`)}
              </Text>
              {active ? <Ionicons name="checkmark" size={22} color={colors.primary} /> : null}
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}
