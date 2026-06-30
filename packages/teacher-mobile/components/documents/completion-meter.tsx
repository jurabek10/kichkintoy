import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

const MINT_INK = '#46B06A';

/** A slim progress bar over required fields — turns a wall of inputs into a
 *  finishable checklist. Hidden when the form has no required fields. */
export function CompletionMeter({ done, total }: { done: number; total: number }) {
  const { t } = useTranslation('documents');
  if (total === 0) return null;
  const complete = done >= total;
  const pct = Math.round((done / total) * 100);
  return (
    <View className="gap-2 rounded-2xl border border-border bg-card p-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-[13px] font-bold text-foreground">
          {t('form.progress', { done, total })}
        </Text>
        {complete ? (
          <Ionicons name="checkmark-circle" size={20} color={MINT_INK} />
        ) : (
          <Text className="text-xs font-bold text-muted">{pct}%</Text>
        )}
      </View>
      <View className="h-2 overflow-hidden rounded-full bg-segment">
        <View className="h-full rounded-full bg-mint-ink" style={{ width: `${pct}%` }} />
      </View>
    </View>
  );
}
