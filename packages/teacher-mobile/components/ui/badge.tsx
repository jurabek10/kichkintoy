import { Text, View } from 'react-native';

/** Small "NEW" flag pinned to the top-right of a feature tile. */
export function NewBadge({ label = 'NEW' }: { label?: string }) {
  return (
    <View className="absolute -right-1.5 -top-1.5 rounded-full bg-new-badge px-1.5 py-0.5">
      <Text className="text-[8px] font-extrabold text-white">{label}</Text>
    </View>
  );
}
