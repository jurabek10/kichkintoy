import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { cn } from '@/lib/utils';

export type SelectOption = { id: string; label: string; subtitle?: string };

type SelectFieldProps = {
  placeholder: string;
  value: SelectOption | null;
  options: SelectOption[];
  onChange: (option: SelectOption) => void;
  disabled?: boolean;
  loading?: boolean;
  searchable?: boolean;
  /** Title shown at the top of the picker sheet. */
  title?: string;
  searchPlaceholder?: string;
};

/**
 * A dropdown that opens a searchable, scrollable bottom-sheet — handles long
 * lists (regions, districts) far better than a row of chips.
 */
export function SelectField({
  placeholder,
  value,
  options,
  onChange,
  disabled,
  loading,
  searchable,
  title,
  searchPlaceholder,
}: SelectFieldProps) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = searchable
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  return (
    <>
      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        className={cn(
          'flex-1 flex-row items-center justify-between rounded-full border border-border px-4 py-3',
          disabled ? 'bg-segment' : 'bg-card',
        )}>
        <Text className={cn('flex-1 text-[15px]', value ? 'text-foreground' : 'text-muted')} numberOfLines={1}>
          {value?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={disabled ? colors.textMuted : colors.textSecondary} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-end bg-black/40">
          <Pressable className="flex-1" onPress={() => setOpen(false)} />
          <View
            className="max-h-[78%] rounded-t-3xl bg-card"
            style={{ paddingBottom: insets.bottom }}>
            <View className="flex-row items-center justify-between border-b border-border px-4 py-3.5">
            <Text className="text-base font-bold text-foreground">{title ?? placeholder}</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          {searchable ? (
            <View className="m-3 flex-row items-center gap-2 rounded-md bg-background px-3 py-2.5">
              <Ionicons name="search" size={18} color={colors.textSecondary} />
              <TextInput
                className="flex-1 p-0 text-[15px] text-foreground"
                placeholder={searchPlaceholder ?? placeholder}
                placeholderTextColor={colors.textMuted}
                value={query}
                onChangeText={setQuery}
                autoFocus
              />
            </View>
          ) : null}

          {loading ? (
            <Text className="p-6 text-center text-sm text-muted">…</Text>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const selected = value?.id === item.id;
                return (
                  <Pressable
                    onPress={() => {
                      onChange(item);
                      setOpen(false);
                      setQuery('');
                    }}
                    className="flex-row items-center justify-between border-b border-border px-4 py-3.5">
                    <View className="flex-1">
                      <Text className={cn('text-[15px]', selected ? 'font-bold text-primary' : 'text-foreground')}>
                        {item.label}
                      </Text>
                      {item.subtitle ? (
                        <Text className="mt-0.5 text-xs text-muted">{item.subtitle}</Text>
                      ) : null}
                    </View>
                    {selected ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
                  </Pressable>
                );
              }}
            />
          )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
