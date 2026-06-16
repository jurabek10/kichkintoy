import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReportListItem } from '@/components/report-list-item';
import { ScreenHeader } from '@/components/screen-header';
import { Loader } from '@/components/ui/loader';
import { colors } from '@/constants/theme';
import { useChildReports } from '@/data/parent';
import { formatMonthYear, parseIsoDate } from '@/lib/date';

export default function ReportsScreen() {
  const { t, i18n } = useTranslation(['nav', 'reports']);
  const { data: reports, isPending } = useChildReports();

  const monthLabel = reports.length
    ? (() => {
        const { year, monthIndex } = parseIsoDate(reports[0].reportDate);
        return formatMonthYear(year, monthIndex, i18n.language);
      })()
    : '';

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={t('items.reports', { ns: 'nav' })} />
      {isPending ? (
        <Loader />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-6">
          {/* Month selector */}
          <View className="px-4 py-3">
            <Pressable className="flex-row items-center gap-1 self-start">
              <Text className="text-base font-bold text-foreground">{monthLabel}</Text>
              <Ionicons name="chevron-down" size={18} color={colors.textPrimary} />
            </Pressable>
          </View>

          {/* Prompt banner */}
          <View className="mx-4 mb-2 flex-row items-center gap-3 rounded-lg bg-coral px-4 py-3">
            <Ionicons name="heart" size={18} color="#E8674E" />
            <Text className="flex-1 text-sm font-semibold text-coral-ink">
              {t('parentDescription', { ns: 'reports' })}
            </Text>
          </View>

          {/* Timeline */}
          {reports.map((report) => (
            <ReportListItem key={report.id} report={report} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
