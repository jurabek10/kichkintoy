import { Ionicons } from '@expo/vector-icons';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, Text, View } from 'react-native';
import SignatureScreen, { type SignatureViewRef } from 'react-native-signature-canvas';

import { colors } from '@/constants/theme';

// Hide the library's built-in footer so we can use our own buttons, and strip
// the canvas chrome so it reads as a clean sheet of paper.
const WEB_STYLE = `
  .m-signature-pad { box-shadow: none; border: none; }
  .m-signature-pad--body { border: none; }
  .m-signature-pad--footer { display: none; margin: 0; }
  body, html { background-color: #ffffff; }
`;

/** A finger-drawn signature on a bottom sheet. Calls `onSave` with a base64 PNG
 *  data URL when the parent taps Save with ink on the pad. */
export function SignaturePad({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
}) {
  const { t } = useTranslation('medications');
  const ref = useRef<SignatureViewRef>(null);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="h-[72%] overflow-hidden rounded-t-3xl bg-card">
          <View className="flex-row items-center justify-between border-b border-border px-4 py-3.5">
            <Text className="text-base font-bold text-foreground">{t('signature.title')}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          <Text className="px-4 pt-3 text-xs text-muted">{t('signature.hint')}</Text>

          <View className="flex-1 px-4 py-3">
            <View className="flex-1 overflow-hidden rounded-2xl border border-border">
              <SignatureScreen
                ref={ref}
                onOK={onSave}
                webStyle={WEB_STYLE}
                backgroundColor="#ffffff"
                penColor="#2B2D31"
              />
            </View>
          </View>

          <View className="flex-row gap-3 border-t border-border px-4 pb-6 pt-3">
            <Pressable
              onPress={() => ref.current?.clearSignature()}
              className="flex-1 items-center justify-center rounded-full bg-pill py-3">
              <Text className="text-sm font-bold text-muted">{t('signature.clear')}</Text>
            </Pressable>
            <Pressable
              onPress={() => ref.current?.readSignature()}
              className="flex-1 items-center justify-center rounded-full bg-coral-ink py-3">
              <Text className="text-sm font-bold text-white">{t('signature.save')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
