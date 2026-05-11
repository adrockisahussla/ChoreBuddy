import React from 'react';
import { ScrollView, View, ViewStyle, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { theme } from '../theme';

interface Props {
  children: React.ReactNode;
  scroll?: boolean;
  keyboardAware?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

/**
 * Screen wrapper: SafeAreaView (from safe-area-context — Android-aware)
 * with the app background, optional Scroll/KeyboardAware content.
 *
 * Top edge is implicit because Header sits above content; bottom edge
 * adds padding for the Android system nav (the three-button bar).
 */
export default function Screen({ children, scroll, keyboardAware, style, contentStyle }: Props) {
  const inner = (
    keyboardAware ? (
      <KeyboardAwareScrollView
        contentContainerStyle={[s.content, contentStyle]}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={20}
      >
        {children}
      </KeyboardAwareScrollView>
    ) : scroll ? (
      <ScrollView contentContainerStyle={[s.content, contentStyle]}>{children}</ScrollView>
    ) : (
      <View style={[s.content, contentStyle]}>{children}</View>
    )
  );
  return (
    <SafeAreaView style={[s.root, style]} edges={['bottom']}>
      {inner}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.spacing.lg },
});
