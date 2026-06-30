import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Text, View } from 'react-native';

import { colors } from '@/constants/theme';

function BouncingDot({ color, delay }: { color: string; delay: number }) {
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(bounce, {
          toValue: -6,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(bounce, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.delay(360 - delay),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [bounce, delay]);

  return (
    <Animated.View
      className="h-2.5 w-2.5 rounded-full"
      style={{ backgroundColor: color, transform: [{ translateY: bounce }] }}
    />
  );
}

/** Full-bleed loading state for a screen waiting on its data query. */
export function Loader({ label }: { label?: string } = {}) {
  const { t } = useTranslation('common');
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: -5,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [float]);

  return (
    <View className="flex-1 items-center justify-center gap-4 py-8">
      <Animated.View
        className="h-16 w-16 items-center justify-center rounded-full bg-sunshine"
        style={{ transform: [{ translateY: float }] }}>
        <Ionicons name="sunny" size={38} color="#F4A621" />
      </Animated.View>
      <View className="flex-row items-center gap-2">
        <BouncingDot color="#E8674E" delay={0} />
        <BouncingDot color={colors.primary} delay={120} />
        <BouncingDot color="#41B883" delay={240} />
      </View>
      <Text className="text-sm font-semibold text-muted">{label ?? t('status.loading')}</Text>
    </View>
  );
}
