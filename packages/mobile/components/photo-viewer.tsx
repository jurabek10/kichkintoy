import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type PhotoViewerProps = {
  photos: string[];
  /** Index to open at, or null when the viewer is closed. */
  index: number | null;
  onClose: () => void;
};

/** Fullscreen, swipeable photo viewer (lightbox) for an album's media. */
export function PhotoViewer({ photos, index, onClose }: PhotoViewerProps) {
  // Read insets here (inside the SafeAreaProvider). SafeAreaView would not work
  // inside the Modal, which renders in a separate native view hierarchy.
  const insets = useSafeAreaInsets();
  const width = Dimensions.get('window').width;
  const open = index !== null;
  const [current, setCurrent] = useState(index ?? 0);

  useEffect(() => {
    if (index !== null) setCurrent(index);
  }, [index]);

  function onScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    setCurrent(Math.round(event.nativeEvent.contentOffset.x / width));
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      {open ? (
        <View className="flex-1 bg-black">
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: index * width, y: 0 }}
            onMomentumScrollEnd={onScrollEnd}>
            {photos.map((photo) => (
              <View key={photo} style={{ width }} className="flex-1 items-center justify-center">
                <Image source={{ uri: photo }} className="h-full w-full" resizeMode="contain" />
              </View>
            ))}
          </ScrollView>

          {/* Top bar — padded below the status bar / notch so the close button
              is reachable and not under the Dynamic Island. */}
          <View
            style={{ paddingTop: insets.top + 6 }}
            className="absolute inset-x-0 top-0 flex-row items-center justify-between px-3 pb-2">
            <Pressable
              onPress={onClose}
              hitSlop={16}
              className="h-10 w-10 items-center justify-center rounded-full bg-black/45">
              <Ionicons name="close" size={26} color="#FFFFFF" />
            </Pressable>
            <Text className="text-base font-semibold text-white">
              {current + 1} / {photos.length}
            </Text>
            <View className="w-10" />
          </View>
        </View>
      ) : null}
    </Modal>
  );
}
