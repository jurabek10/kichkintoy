import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CommentBar } from '@/components/comment-bar';
import { Avatar } from '@/components/ui/avatar';
import { MOOD_EMOJI } from '@/constants/data';
import { useReport } from '@/data/parent';
import { formatLongDate } from '@/lib/date';

import { ReportComments } from './_components/report-comments';
import { ReportItemsTable } from './_components/report-items-table';

const CORAL = '#E8674E';

/** Coral identity header, including its own (coral) status-bar inset. */
function Header({ title, mood }: { title: string; mood?: string }) {
  const router = useRouter();
  return (
    <SafeAreaView edges={['top']} className="bg-coral-ink">
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="flex-1 text-center text-lg font-bold text-white">{title}</Text>
        {mood ? <Text className="text-xl">{mood}</Text> : <View className="w-6" />}
      </View>
    </SafeAreaView>
  );
}

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation('reports');
  const { data: report } = useReport(String(id));

  if (!report) {
    return (
      <View className="flex-1 bg-background">
        <Header title={t('detail.report')} />
        <View className="flex-1 items-center justify-center">
          <Text className="text-sm text-muted">{t('detail.notFound')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Header title={t('detail.report')} mood={MOOD_EMOJI[report.mood]} />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Author */}
          <View className="flex-row items-center gap-3 border-b border-border bg-card px-4 py-3">
            <Avatar size={40} />
            <View className="flex-1">
              <Text className="text-sm font-bold text-foreground">{report.authorName}</Text>
              <Text className="text-xs text-muted">
                {report.className} · {formatLongDate(report.reportDate, i18n.language)}
              </Text>
            </View>
          </View>

          {/* Photos */}
          {report.photos.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-2 p-4">
              {report.photos.map((photo) => (
                <Image key={photo} source={{ uri: photo }} className="h-56 w-72 rounded-lg bg-segment" />
              ))}
            </ScrollView>
          ) : null}

          {/* Teacher note */}
          <Text className="px-4 pt-3 text-[15px] leading-6 text-foreground">{report.teacherNote}</Text>

          {/* Day at a glance */}
          <ReportItemsTable items={report.items} />

          {/* Comments */}
          <ReportComments comments={report.comments} />
          <View className="h-6" />
        </ScrollView>

        <CommentBar placeholder={t('detail.writeComment')} accentColor={CORAL} />
      </KeyboardAvoidingView>
    </View>
  );
}
