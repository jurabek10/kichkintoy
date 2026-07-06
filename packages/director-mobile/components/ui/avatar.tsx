import { Ionicons } from '@expo/vector-icons';
import { Image, View } from 'react-native';

import { SignedImage } from '@/components/medication/signed-image';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type AvatarProps = {
  /** A media-asset id (loaded through the signed flow) or a direct image URL. */
  uri?: string | null;
  size?: number;
};

/** Round profile image with a neutral icon fallback. Accepts either a media-asset
 *  id (the `photo_url`/`avatar_url` columns store one) or a legacy direct URL. */
export function Avatar({ uri, size = 48 }: AvatarProps) {
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  if (uri && UUID_PATTERN.test(uri)) {
    return (
      <View style={dimension} className="overflow-hidden bg-segment">
        <SignedImage assetId={uri} className="h-full w-full" resizeMode="cover" />
      </View>
    );
  }

  if (uri) {
    return <Image source={{ uri }} style={dimension} className="bg-segment" />;
  }

  return (
    <View style={dimension} className="items-center justify-center bg-muted-soft">
      <Ionicons name="person" size={size * 0.55} color="#FFFFFF" />
    </View>
  );
}
