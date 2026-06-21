import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CommentBar } from '@/components/common/comment-bar';
import { ReportComments } from '@/components/report/report-comments';
import { ReportItemsTable } from '@/components/report/report-items-table';
import { SignedReportMedia } from '@/components/report/signed-report-media';
import { Avatar } from '@/components/ui/avatar';
import { Loader } from '@/components/ui/loader';
import { moodEmoji, useAddReportComment, useReport } from '@/data/reports';
import { formatLongDate } from '@/lib/date';

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
  const { data: report, isPending } = useReport(String(id));
  const addComment = useAddReportComment(String(id));

  if (isPending) {
    return (
      <View className="flex-1 bg-background">
        <Header title={t('detail.report')} />
        <Loader />
      </View>
    );
  }

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
      <Header title={t('detail.report')} mood={moodEmoji(report.mood)} />

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
                <SignedReportMedia key={photo.id} media={photo} />
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

        <CommentBar
          placeholder={t('detail.writeComment')}
          accentColor={CORAL}
          onSubmit={async (text) => {
            await addComment.mutateAsync(text);
          }}
        />
      </KeyboardAvoidingView>
    </View>
  );
}
