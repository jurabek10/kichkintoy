import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';

/** Track keyboard visibility so the bar drops its safe-area inset while open. */
function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, () => setVisible(true));
    const hide = Keyboard.addListener(hideEvent, () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}

type CommentBarProps = {
  placeholder: string;
  /** Colour of the active send icon (the feature's accent). */
  accentColor: string;
};

/**
 * Bottom comment composer shared by report and notice detail: a multiline
 * input + attachment actions, with a send button that stays disabled until
 * there's text. Pair it with a `KeyboardAvoidingView` so it rides the keyboard.
 */
export function CommentBar({ placeholder, accentColor }: CommentBarProps) {
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const [text, setText] = useState('');

  const canSend = text.trim().length > 0;

  return (
    <View
      className="border-t border-border bg-card px-4 pt-2"
      style={{ paddingBottom: keyboardVisible ? 8 : Math.max(insets.bottom, 8) }}>
      <TextInput
        className="py-2 text-[15px] text-foreground"
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={text}
        onChangeText={setText}
        multiline
      />
      <View className="flex-row items-center gap-4 pt-1">
        <Ionicons name="time-outline" size={22} color={colors.textSecondary} />
        <Ionicons name="image-outline" size={22} color={colors.textSecondary} />
        <Ionicons name="videocam-outline" size={22} color={colors.textSecondary} />
        <Ionicons name="attach" size={22} color={colors.textSecondary} />
        <View className="flex-1" />
        <Pressable
          hitSlop={8}
          disabled={!canSend}
          accessibilityState={{ disabled: !canSend }}
          onPress={() => setText('')}>
          <Ionicons name="send" size={22} color={canSend ? accentColor : colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}
