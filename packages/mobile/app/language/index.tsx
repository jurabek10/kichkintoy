import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StackHeader } from '@/components/common/stack-header';
import { languages, setLanguage, type Language } from '@/i18n';
import { cn } from '@/lib/utils';

const SUN_INK = '#F4A621';

export default function LanguageScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation(['common', 'profile']);

  async function choose(language: Language) {
    await setLanguage(language);
    router.back();
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-header-blue">
      <StackHeader title={t('language.label', { ns: 'common' })} left="close" />

      <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4">
        <Text className="mb-4 px-1 text-[13px] leading-5 text-muted">
          {t('preferences.subtitle', { ns: 'profile' })}
        </Text>

        <View className="overflow-hidden rounded-2xl border border-border">
          {languages.map((language, index) => {
            const active = i18n.language === language;
            return (
              <Pressable
                key={language}
                onPress={() => choose(language)}
                className={cn(
                  'flex-row items-center gap-3 bg-card px-4 py-4 active:bg-pill',
                  index < languages.length - 1 && 'border-b border-border',
                )}>
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-sunshine">
                  <Ionicons name="globe-outline" size={20} color={SUN_INK} />
                </View>
                <Text
                  className={cn(
                    'flex-1 text-[16px] text-foreground',
                    active ? 'font-extrabold' : 'font-medium',
                  )}>
                  {t(`language.${language}`, { ns: 'common' })}
                </Text>
                {active ? (
                  <View className="h-6 w-6 items-center justify-center rounded-full bg-primary">
                    <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                  </View>
                ) : (
                  <View className="h-6 w-6 rounded-full border-2 border-border" />
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
