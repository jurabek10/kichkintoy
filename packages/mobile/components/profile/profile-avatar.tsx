import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';

import { SignedImage } from '@/components/medication/signed-image';
import { cn } from '@/lib/utils';

/**
 * A round profile photo. Prefers an uploaded media asset (signed-download flow),
 * falls back to a legacy direct URL, then to a monogram. Add a camera badge +
 * onPress to make it an uploader.
 */
export function ProfileAvatar({
  avatarMediaAssetId = null,
  photoUrl = null,
  name,
  size = 96,
  onPress,
  busy,
  showCamera,
  fallbackClassName = 'bg-white/25',
  fallbackTextClassName = 'text-white',
}: {
  avatarMediaAssetId?: string | null;
  photoUrl?: string | null;
  name: string;
  size?: number;
  onPress?: () => void;
  busy?: boolean;
  showCamera?: boolean;
  fallbackClassName?: string;
  fallbackTextClassName?: string;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || '·';
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  const inner = (
    <View style={dimension} className="overflow-hidden">
      {avatarMediaAssetId ? (
        <SignedImage assetId={avatarMediaAssetId} className="h-full w-full" resizeMode="cover" />
      ) : photoUrl ? (
        <Image source={{ uri: photoUrl }} style={dimension} />
      ) : (
        <View className={cn('h-full w-full items-center justify-center', fallbackClassName)}>
          <Text className={cn('font-extrabold', fallbackTextClassName)} style={{ fontSize: size * 0.4 }}>
            {initial}
          </Text>
        </View>
      )}
    </View>
  );

  const content = (
    <View style={dimension} className="relative">
      {inner}
      {busy ? (
        <View style={dimension} className="absolute items-center justify-center bg-black/30">
          <ActivityIndicator color="#FFFFFF" />
        </View>
      ) : null}
      {showCamera ? (
        <View className="absolute -bottom-0.5 -right-0.5 h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-primary">
          <Ionicons name="camera" size={15} color="#FFFFFF" />
        </View>
      ) : null}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} disabled={busy} hitSlop={6}>
      {content}
    </Pressable>
  );
}
