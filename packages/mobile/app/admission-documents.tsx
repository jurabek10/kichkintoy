import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/avatar';
import { colors } from '@/constants/theme';
import { useDocumentContacts } from '@/data/parent';

export default function AdmissionDocumentsScreen() {
  const router = useRouter();
  const { t } = useTranslation('nav');
  const { data: documentContacts } = useDocumentContacts();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-card">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="h-8 w-8 items-center justify-center rounded-sm bg-pill">
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text className="text-lg font-bold text-foreground">{t('items.documents')}</Text>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </Pressable>
      </View>

      {/* Contact list */}
      <View className="pt-4">
        {documentContacts.map((contact) => (
          <Pressable key={contact.id} className="flex-row items-center gap-3 px-4 py-3">
            <Avatar uri={contact.photo} size={48} />
            <View className="flex-1">
              <Text className="text-base font-semibold text-foreground">{contact.name}</Text>
              <Text className="mt-0.5 text-[13px] text-muted">{contact.phone}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}
