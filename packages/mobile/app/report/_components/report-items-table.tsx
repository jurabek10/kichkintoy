import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { ReportItem } from '@/constants/data';
import { cn } from '@/lib/utils';

/** "Day at a glance" — the report's structured items as a label/value table. */
export function ReportItemsTable({ items }: { items: ReportItem[] }) {
  const { t } = useTranslation('reports');

  return (
    <View className="mx-4 mt-4 overflow-hidden rounded-lg border border-border bg-card">
      {items.map((item, index) => (
        <View
          key={item.id}
          className={cn(
            'flex-row items-center justify-between px-4 py-3',
            index > 0 && 'border-t border-border',
          )}>
          <Text className="text-sm text-muted">{t(`itemTypes.${item.itemType}`)}</Text>
          <Text className="text-sm font-semibold text-foreground">
            {item.valueKey ? t(`composer.${item.valueKey}`) : item.value}
          </Text>
        </View>
      ))}
    </View>
  );
}
