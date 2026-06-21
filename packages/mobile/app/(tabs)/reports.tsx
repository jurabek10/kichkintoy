import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReportListItem } from '@/components/report/report-list-item';
import { ScreenHeader } from '@/components/common/screen-header';
import { Loader } from '@/components/ui/loader';
import { colors } from '@/constants/theme';
import { useChildReports } from '@/data/reports';
import { formatMonthYear, parseIsoDate } from '@/lib/date';

export default function ReportsScreen() {
  const { t, i18n } = useTranslation(['nav', 'reports']);
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const { data: reports, isPending } = useChildReports();

  async function onRefresh() {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ refetchType: 'active' });
    } finally {
      setRefreshing(false);
    }
  }

  const reportGroups = reports.reduce<{ key: string; label: string; reports: typeof reports }[]>(
    (groups, report) => {
      const { year, monthIndex } = parseIsoDate(report.reportDate);
      const key = `${year}-${monthIndex}`;
      const lastGroup = groups[groups.length - 1];
      if (lastGroup?.key === key) {
        lastGroup.reports.push(report);
      } else {
        groups.push({
          key,
          label: formatMonthYear(year, monthIndex, i18n.language),
          reports: [report],
        });
      }
      return groups;
    },
    [],
  );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={t('items.reports', { ns: 'nav' })} />
      {isPending ? (
        <Loader />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="pb-6"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }>
          {/* Prompt banner */}
          <View className="mx-4 my-3 flex-row items-center gap-3 rounded-lg bg-coral px-4 py-3">
            <Ionicons name="heart" size={18} color="#E8674E" />
            <Text className="flex-1 text-sm font-semibold text-coral-ink">
              {t('parentDescription', { ns: 'reports' })}
            </Text>
          </View>

          {/* Timeline */}
          {reportGroups.map((group) => (
            <View key={group.key}>
              <View className="bg-background px-4 py-3">
                <Text className="text-base font-bold text-foreground">{group.label}</Text>
              </View>
              {group.reports.map((report) => (
                <ReportListItem key={report.id} report={report} />
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
