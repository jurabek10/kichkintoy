import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { Text, View } from 'react-native';

type EmptyStateProps = {
  icon?: ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
};

export function EmptyState({ icon = 'happy-outline', title, body }: EmptyStateProps) {
  return (
    <View className="items-center gap-2 rounded-lg bg-card p-6">
      <Ionicons name={icon} size={32} color="#AEB4BE" />
      <Text className="text-base font-bold text-foreground">{title}</Text>
      <Text className="text-center text-sm leading-5 text-muted">{body}</Text>
    </View>
  );
}
