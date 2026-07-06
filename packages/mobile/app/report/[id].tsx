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
import { moodEmoji, useAddReportComment, useReport, type ReportDetail } from '@/data/reports';
import { formatLongDate, weekdayLong } from '@/lib/date';

const CORAL = '#E8674E';

/** Coral identity header, including its own (coral) status-bar inset. */
function Header({ title }: { title: string }) {
  const router = useRouter();
  return (
    <SafeAreaView edges={['top']} className="bg-coral-ink">
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="flex-1 text-center text-lg font-bold text-white">{title}</Text>
        <View className="w-6" />
      </View>
    </SafeAreaView>
  );
}

/** The report opens on its warmest fact — how the child's day felt: a big mood
 *  tile over the weekday and date, with the teacher who wrote it just below. */
function Hero({ report, lang }: { report: ReportDetail; lang: string }) {
  return (
    <View className="mx-4 mt-4 overflow-hidden rounded-2xl border border-border bg-card">
      <View className="flex-row items-center gap-4 bg-coral p-4">
        <View className="h-16 w-16 items-center justify-center rounded-2xl bg-card">
          <Text className="text-4xl">{moodEmoji(report.mood)}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-[11px] font-bold uppercase tracking-wide text-coral-ink">
            {weekdayLong(report.reportDate, lang)}
          </Text>
          <Text className="text-lg font-extrabold text-foreground">
            {formatLongDate(report.reportDate, lang)}
          </Text>
          {report.mood ? (
            <Text numberOfLines={1} className="mt-0.5 text-[13px] font-semibold capitalize text-coral-ink">
              {report.mood}
            </Text>
          ) : null}
        </View>
      </View>
      <View className="flex-row items-center gap-3 border-t border-border px-4 py-3">
        <Avatar uri={report.authorPhoto} size={36} />
        <View className="flex-1">
          <Text className="text-sm font-bold text-foreground">{report.authorName}</Text>
          <Text className="text-xs text-muted">{report.className}</Text>
        </View>
      </View>
    </View>
  );
}

/** A section label with an optional count chip — the structural rhythm that runs
 *  down the screen (Photos, Teacher note, Day at a glance). */
function SectionTitle({ label, count }: { label: string; count?: number }) {
  return (
    <View className="mb-2 flex-row items-center gap-2 px-4">
      <Text className="text-base font-bold text-foreground">{label}</Text>
      {count !== undefined ? (
        <View className="rounded-full bg-pill px-2 py-0.5">
          <Text className="text-[11px] font-bold text-muted">{count}</Text>
        </View>
      ) : null}
    </View>
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
      <Header title={t('detail.report')} />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Hero report={report} lang={i18n.language} />

          {/* Photos */}
          {report.photos.length > 0 ? (
            <View className="mt-6">
              <SectionTitle label={t('detail.photosVideos')} count={report.photos.length} />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-3 px-4">
                {report.photos.map((photo) => (
                  <SignedReportMedia key={photo.id} media={photo} />
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* Teacher note */}
          {report.teacherNote ? (
            <View className="mt-6">
              <SectionTitle label={t('detail.teacherNote')} />
              <View className="mx-4 rounded-lg border border-border bg-card p-4">
                <Text className="text-[15px] leading-6 text-foreground">{report.teacherNote}</Text>
              </View>
            </View>
          ) : null}

          {/* Day at a glance */}
          {report.items.length > 0 ? (
            <View className="mt-6">
              <SectionTitle label={t('detail.dayAtAGlance')} />
              <ReportItemsTable items={report.items} />
            </View>
          ) : null}

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
