import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, Text, View } from 'react-native';

import { MOOD_EMOJI, type ReportSummary } from '@/constants/data';
import { colors } from '@/constants/theme';
import { parseIsoDate, weekdayShort } from '@/lib/date';

function Counter({ icon, n }: { icon: ComponentProps<typeof Ionicons>['name']; n: number }) {
  return (
    <View className="flex-row items-center gap-1">
      <Ionicons name={icon} size={13} color={colors.textSecondary} />
      <Text className="text-xs text-muted">{n}</Text>
    </View>
  );
}

/** One day's report in the timeline: date rail + mood, note preview, thumbnail. */
export function ReportListItem({ report }: { report: ReportSummary }) {
  const { i18n } = useTranslation();
  const { day } = parseIsoDate(report.reportDate);

  return (
    <Link href={{ pathname: '/report/[id]', params: { id: report.id } }} asChild>
      <Pressable className="flex-row gap-4 border-b border-border bg-card px-4 py-4">
        <View className="w-10 items-center">
          <Text className="text-2xl font-extrabold text-foreground">{day}</Text>
          <Text className="text-[11px] text-muted">{weekdayShort(report.reportDate, i18n.language)}</Text>
          <Text className="mt-1 text-lg">{MOOD_EMOJI[report.mood]}</Text>
        </View>

        <View className="flex-1">
          <Text className="text-[15px] font-bold text-coral-ink">{report.className}</Text>
          <Text numberOfLines={2} className="mt-1 text-sm leading-5 text-muted">
            {report.teacherNote}
          </Text>
          {report.photoCount > 0 || report.commentCount > 0 ? (
            <View className="mt-2 flex-row items-center gap-3">
              {report.photoCount > 0 ? <Counter icon="image-outline" n={report.photoCount} /> : null}
              {report.commentCount > 0 ? <Counter icon="chatbubble-outline" n={report.commentCount} /> : null}
            </View>
          ) : null}
        </View>

        {report.coverPhoto ? (
          <Image source={{ uri: report.coverPhoto }} className="h-16 w-16 rounded-md bg-segment" />
        ) : null}
      </Pressable>
    </Link>
  );
}
