import { ActivityIndicator, Pressable, Text, TextInput, TextInputProps, View } from 'react-native';

import { colors } from '@/constants/theme';
import { cn } from '@/lib/utils';

/** Labeled text field used across the signup steps. */
export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-semibold text-muted">{label}</Text>
      <TextInput
        className="rounded-md border border-border bg-card px-4 py-3 text-[15px] text-foreground"
        placeholderTextColor={colors.textMuted}
        {...props}
      />
      {error ? <Text className="text-xs text-coral-ink">{error}</Text> : null}
    </View>
  );
}

/** Primary full-width action button with loading + disabled states. */
export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      className={cn('items-center rounded-md py-3.5', off ? 'bg-segment' : 'bg-primary')}>
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text className={cn('text-base font-bold', off ? 'text-muted' : 'text-white')}>{label}</Text>
      )}
    </Pressable>
  );
}

/** Selectable option card (role, relationship, region, center, class…). */
export function OptionRow({
  title,
  subtitle,
  selected,
  onPress,
}: {
  title: string;
  subtitle?: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'flex-row items-center justify-between rounded-md border bg-card px-4 py-3',
        selected ? 'border-primary' : 'border-border',
      )}>
      <View className="flex-1">
        <Text className="text-[15px] font-semibold text-foreground">{title}</Text>
        {subtitle ? <Text className="mt-0.5 text-xs text-muted">{subtitle}</Text> : null}
      </View>
      <View
        className={cn(
          'h-5 w-5 items-center justify-center rounded-full border-2',
          selected ? 'border-primary' : 'border-border',
        )}>
        {selected ? <View className="h-2.5 w-2.5 rounded-full bg-primary" /> : null}
      </View>
    </Pressable>
  );
}
