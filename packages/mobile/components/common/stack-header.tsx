import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

type StackHeaderProps = {
  title: string;
  /** Text shown next to the back chevron (e.g. the account username). */
  leftLabel?: string;
  /** Left control: a back chevron (default) or a close X. */
  left?: 'back' | 'close';
  onLeftPress?: () => void;
  /** Optional right-aligned text action (e.g. "Save"). */
  right?: { label: string; onPress: () => void };
};

/**
 * The Kidsnote-style blue header for pushed/modal screens: a left control
 * (back chevron + optional label, or a close X), a centred title, and an
 * optional right text action. One module so safe-area, alignment, and colour
 * fixes land once.
 */
export function StackHeader({ title, leftLabel, left = 'back', onLeftPress, right }: StackHeaderProps) {
  const router = useRouter();
  const handleLeft = onLeftPress ?? (() => router.back());

  return (
    <View className="flex-row items-center justify-center py-3">
      <Pressable onPress={handleLeft} hitSlop={8} className="absolute left-3 flex-row items-center">
        <Ionicons
          name={left === 'close' ? 'close' : 'chevron-back'}
          size={left === 'close' ? 26 : 24}
          color="#FFFFFF"
        />
        {leftLabel ? <Text className="text-base text-white">{leftLabel}</Text> : null}
      </Pressable>

      <Text className="text-lg font-bold text-white">{title}</Text>

      {right ? (
        <Pressable onPress={right.onPress} hitSlop={8} className="absolute right-4">
          <Text className="text-base font-semibold text-white">{right.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
