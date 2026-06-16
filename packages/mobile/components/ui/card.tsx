import { View, type ViewProps } from 'react-native';

import { cn } from '@/lib/utils';

/** White rounded surface — the base container for most content blocks. */
export function Card({ className, ...props }: ViewProps) {
  return <View className={cn('rounded-lg bg-card p-4', className)} {...props} />;
}
