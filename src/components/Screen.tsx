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
 * Screen wrapper: SafeAreaView (Android-aware via safe-area-context)
 * with the app background + bottom inset for the system nav bar.
 *
 * For screens that render their own internal ScrollView (after a fixed
 * Header), pass contentStyle={padding: 0} and use the SCREEN_BOTTOM_PAD
 * constant on that ScrollView's contentContainerStyle.
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

/** Default bottom padding for inner ScrollViews so content clears
 *  the Android nav bar in addition to the SafeAreaView inset. */
export const SCREEN_BOTTOM_PAD = 96;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.spacing.lg },
});
