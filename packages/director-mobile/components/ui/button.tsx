import { Pressable, Text } from 'react-native';

import { cn } from '@/lib/utils';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  /** primary = filled blue, soft = grey chip. */
  variant?: 'primary' | 'soft';
  className?: string;
};

const VARIANTS = {
  primary: { wrap: 'bg-primary', text: 'text-white' },
  soft: { wrap: 'bg-pill', text: 'text-muted' },
} as const;

/** Compact pill button used for inline actions (Save, Change photo, Edit). */
export function Button({ label, onPress, variant = 'primary', className }: ButtonProps) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      onPress={onPress}
      className={cn('items-center justify-center rounded-sm px-3 py-1.5', v.wrap, className)}>
      <Text className={cn('text-[13px] font-semibold', v.text)}>{label}</Text>
    </Pressable>
  );
}
