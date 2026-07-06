import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { ReportItem } from '@/data/reports';
import { translateItemTitle, translateItemValue } from '@/lib/report-item-i18n';
import { cn } from '@/lib/utils';

/** "Day at a glance" — the report's structured items as a label/value table. */
export function ReportItemsTable({ items }: { items: ReportItem[] }) {
  const { t } = useTranslation('reports');

  return (
    <View className="mx-4 overflow-hidden rounded-lg border border-border bg-card">
      {items.map((item, index) => {
        const typeLabel = t(`itemTypes.${item.itemType}`, { defaultValue: item.itemType });
        const label =
          item.itemType === 'class_participation'
            ? classParticipationLabel(item.title, typeLabel, t)
            : translateItemTitle(item.title, t) || typeLabel;
        const value =
          item.itemType === 'class_participation'
            ? t(`participationLevels.${item.value}`, { defaultValue: item.value })
            : translateItemValue(item.itemType, item.value, t);
        return (
          <View
            key={item.id}
            className={cn(
              'flex-row items-center justify-between gap-4 px-4 py-3',
              index > 0 && 'border-t border-border',
            )}>
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} className="text-sm font-semibold text-foreground">
                {label}
              </Text>
              {item.title ? <Text className="mt-0.5 text-xs text-muted">{typeLabel}</Text> : null}
            </View>
            <Text numberOfLines={2} className="max-w-[52%] text-right text-sm font-semibold text-foreground">
              {value}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function classParticipationLabel(
  title: string | null,
  fallback: string,
  t: ReturnType<typeof useTranslation<'reports'>>['t'],
) {
  if (!title) return fallback;
  const normalized = title.trim().toLowerCase();
  if (normalized === 'class attendance' || normalized === 'class participation') return fallback;
  return t(`participation.subjects.${title}`, { defaultValue: title });
}
