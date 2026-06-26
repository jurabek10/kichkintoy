import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AttendanceDayRow } from '@/components/attendance/attendance-day-row';
import { ReportAbsenceSheet } from '@/components/attendance/report-absence-sheet';
import { ScreenHeader } from '@/components/common/screen-header';
import { AttendanceCalendar } from '@/components/home/attendance-calendar';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { monthDayList, useAttendanceCalendar } from '@/data/attendance';
import { useChildren } from '@/data/parent';
import { formatMonthYear, parseIsoDate, todayIsoDate } from '@/lib/date';

export default function AttendanceScreen() {
  const { t, i18n } = useTranslation(['nav', 'app', 'attendance']);
  const today = parseIsoDate(todayIsoDate());
  const [month, setMonth] = useState({ year: today.year, monthIndex: today.monthIndex });
  const [absenceOpen, setAbsenceOpen] = useState(false);
  const { data: days, isPending } = useAttendanceCalendar(month.year, month.monthIndex);
  const children = useChildren();
  const list = monthDayList(days);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={t('items.attendance', { ns: 'nav' })} back />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-3 p-4">
        {/* Report absence — the parent's one action on this screen. */}
        <Pressable
          onPress={() => setAbsenceOpen(true)}
          className="flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3.5">
          <Ionicons name="add-circle-outline" size={19} color="#FFFFFF" />
          <Text className="text-base font-bold text-white">
            {t('reportAbsence', { ns: 'attendance' })}
          </Text>
        </Pressable>

        {/* Shared calendar, controlled so the list below tracks the same month. */}
        <AttendanceCalendar value={month} onChange={setMonth} />

        <View className="mt-1 flex-row items-center justify-between px-1">
          <Text className="text-lg font-extrabold text-foreground">
            {formatMonthYear(month.year, month.monthIndex, i18n.language)}
          </Text>
          {list.length > 0 ? (
            <View className="rounded-full bg-pill px-2.5 py-1">
              <Text className="text-xs font-bold text-muted">{list.length}</Text>
            </View>
          ) : null}
        </View>

        {isPending ? (
          <Loader />
        ) : list.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title={t('parentHome.calendar.empty', { ns: 'app' })}
            body={t('parentHome.calendar.emptyBody', { ns: 'app' })}
          />
        ) : (
          list.map((day) => <AttendanceDayRow key={day.date} day={day} />)
        )}
      </ScrollView>

      <ReportAbsenceSheet
        visible={absenceOpen}
        onClose={() => setAbsenceOpen(false)}
        childrenList={(children.data ?? []).map((c) => ({ id: c.id, name: c.name }))}
        onSubmitted={(date) => {
          const parts = parseIsoDate(date);
          setMonth({ year: parts.year, monthIndex: parts.monthIndex });
        }}
      />
    </SafeAreaView>
  );
}
