import { ActivityIndicator, View } from 'react-native';

import { colors } from '@/constants/theme';

/** Full-bleed loading state for a screen waiting on its data query. */
export function Loader() {
  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}
