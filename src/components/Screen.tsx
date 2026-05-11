import React from 'react';
import { SafeAreaView, ScrollView, View, ViewStyle, StyleSheet } from 'react-native';
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
 * Screen wrapper: SafeAreaView with the app background. Optional ScrollView
 * (or KeyboardAwareScrollView) so screens don't keep redeclaring the pattern.
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
  return <SafeAreaView style={[s.root, style]}>{inner}</SafeAreaView>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.spacing.lg },
});
