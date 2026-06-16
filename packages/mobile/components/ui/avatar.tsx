import { Ionicons } from '@expo/vector-icons';
import { Image, View } from 'react-native';

type AvatarProps = {
  uri?: string | null;
  size?: number;
};

/** Round profile image with a neutral icon fallback when there's no photo. */
export function Avatar({ uri, size = 48 }: AvatarProps) {
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={dimension} className="bg-segment" />;
  }

  return (
    <View style={dimension} className="items-center justify-center bg-muted-soft">
      <Ionicons name="person" size={size * 0.55} color="#FFFFFF" />
    </View>
  );
}
