import 'react-native';
import 'react-native-safe-area-context';

declare module 'react-native' {
  interface ViewProps { className?: string }
  interface TextProps { className?: string }
  interface TextInputProps { className?: string }
  interface PressableProps { className?: string }
  interface KeyboardAvoidingViewProps { className?: string }
  interface ImageProps { className?: string }
  interface ScrollViewProps {
    className?: string;
    contentContainerClassName?: string;
  }
  interface FlatListProps<ItemT> {
    className?: string;
    contentContainerClassName?: string;
  }
}

declare module 'react-native-safe-area-context' {
  interface NativeSafeAreaViewProps { className?: string }
}
