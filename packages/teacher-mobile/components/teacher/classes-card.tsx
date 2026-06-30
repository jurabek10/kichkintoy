import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { colors } from '@/constants/theme';
import type { TeacherClass } from '@/data/teacher';

function ClassRow({ klass }: { klass: TeacherClass }) {
  const router = useRouter();
  const { t } = useTranslation('teacher');
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/class/[id]', params: { id: klass.id } })}
      className="flex-row items-center gap-3 rounded-md bg-background px-3 py-3">
      <View className="h-10 w-10 items-center justify-center rounded-2xl bg-grape">
        <Text className="text-base font-extrabold text-grape-ink">
          {klass.name.trim().charAt(0).toUpperCase() || '·'}
        </Text>
      </View>
      <View className="flex-1">
        <Text numberOfLines={1} className="text-[15px] font-bold text-foreground">
          {klass.name}
        </Text>
        <Text className="mt-0.5 text-[13px] text-muted">
          {t('home.childrenCount', { count: klass.childCount })}
          {klass.ageGroup ? ` · ${klass.ageGroup}` : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

/** Home card listing the classes this teacher is assigned to. */
export function ClassesCard({ classes }: { classes: TeacherClass[] }) {
  const { t } = useTranslation(['teacher', 'nav']);
  const router = useRouter();

  if (classes.length === 0) return null;

  return (
    <Card className="mt-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-extrabold text-foreground">{t('items.myClasses', { ns: 'nav' })}</Text>
        <Pressable onPress={() => router.push('/classes')} hitSlop={8}>
          <Text className="text-sm font-semibold text-primary">{t('home.viewAll')}</Text>
        </Pressable>
      </View>
      <View className="mt-3 gap-2">
        {classes.slice(0, 4).map((klass) => (
          <ClassRow key={klass.id} klass={klass} />
        ))}
      </View>
    </Card>
  );
}
