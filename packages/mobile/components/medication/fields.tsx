import { useMemo } from 'react';
import { Text, TextInput, View } from 'react-native';

import { SelectField, type SelectOption } from '@/components/ui/select-field';
import { colors } from '@/constants/theme';
import { formatLongDate, todayIsoDate, weekdayLong } from '@/lib/date';
import { cn } from '@/lib/utils';

/** A labelled text input. `multiline` turns it into a textarea. */
export function FormField({
  label,
  value,
  onChange,
  placeholder,
  required,
  multiline,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
  maxLength?: number;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-[11px] font-semibold uppercase text-muted">
        {label}
        {required ? <Text className="text-coral-ink"> *</Text> : null}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        maxLength={maxLength}
        textAlignVertical={multiline ? 'top' : 'center'}
        className={cn(
          'rounded-2xl border border-border bg-card px-4 py-3 text-[15px] text-foreground',
          multiline && 'min-h-[88px]',
        )}
      />
    </View>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Today through the next two weeks — the window a medication request targets. */
function dateOptions(lang: string): SelectOption[] {
  const base = new Date(`${todayIsoDate()}T00:00:00`);
  const options: SelectOption[] = [];
  for (let i = 0; i <= 14; i += 1) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    options.push({ id: iso, label: formatLongDate(iso, lang), subtitle: weekdayLong(iso, lang) });
  }
  return options;
}

/** A date field that opens the shared picker sheet over a near-term date list. */
export function FormDateField({
  label,
  value,
  onChange,
  lang,
  title,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  lang: string;
  title: string;
}) {
  const options = useMemo(() => dateOptions(lang), [lang]);
  const selected: SelectOption | null = value
    ? (options.find((o) => o.id === value) ?? { id: value, label: formatLongDate(value, lang) })
    : null;
  return (
    <View className="gap-1.5">
      <Text className="text-[11px] font-semibold uppercase text-muted">{label}</Text>
      <SelectField
        placeholder={title}
        title={title}
        value={selected}
        options={options}
        onChange={(option) => onChange(option.id)}
      />
    </View>
  );
}
