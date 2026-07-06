import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';

import { cn } from '@/lib/utils';

export type SummaryRow = { label: string; value: string };

/**
 * A centered Yes/No dialog. With `summary` rows it restates the safety-critical
 * facts before a medication request is sent; without them it's a plain confirm
 * (e.g. cancelling a request). The primary action is the medication identity
 * coral, kept warm so it reads as "confirm" rather than "submit a form".
 */
export function ConfirmModal({
  visible,
  title,
  body,
  summary,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  loading,
}: {
  visible: boolean;
  title: string;
  body?: string;
  summary?: SummaryRow[];
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center bg-black/40 px-8">
        <View className="w-full max-w-sm rounded-3xl bg-card p-5">
          <Text className="text-center text-lg font-extrabold text-foreground">{title}</Text>
          {body ? (
            <Text className="mt-1.5 text-center text-sm leading-5 text-muted">{body}</Text>
          ) : null}

          {summary?.length ? (
            <View className="mt-4 gap-2 rounded-2xl bg-background p-3.5">
              {summary.map((row) => (
                <View key={row.label} className="flex-row items-start gap-3">
                  <Text className="w-20 text-[11px] font-semibold uppercase text-muted">
                    {row.label}
                  </Text>
                  <Text className="flex-1 text-sm font-semibold text-foreground">{row.value}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View className="mt-5 flex-row gap-3">
            <Pressable
              onPress={onCancel}
              disabled={loading}
              className="flex-1 items-center justify-center rounded-full bg-pill py-3">
              <Text className="text-sm font-bold text-muted">{cancelLabel}</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={loading}
              className={cn(
                'flex-1 flex-row items-center justify-center gap-1.5 rounded-full bg-coral-ink py-3',
                loading && 'opacity-70',
              )}>
              {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
              <Text className="text-sm font-bold text-white">{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
