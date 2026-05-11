import React from 'react';
import { Text as RNText, TextStyle, TextProps } from 'react-native';
import { theme } from '../theme';

type Variant = 'h1' | 'h2' | 'h3' | 'sectionLabel' | 'body' | 'meta' | 'tiny' | 'empty';

interface Props extends Omit<TextProps, 'style'> {
  children: React.ReactNode;
  variant?: Variant;
  color?: string;
  style?: TextStyle | TextStyle[];
}

/**
 * Text: typography presets from the new design system.
 * Inter 400/500/700. Dark text on light bg.
 */
export default function Text({ children, variant = 'body', color, style, ...rest }: Props) {
  const v = variantStyles[variant];
  const colorOverride = color ? { color } : undefined;
  return (
    <RNText {...rest} style={[v, colorOverride, style]}>
      {children}
    </RNText>
  );
}

const variantStyles: Record<Variant, TextStyle> = {
  h1: { color: theme.colors.text, fontSize: 24, fontWeight: '700' },
  h2: { color: theme.colors.text, fontSize: 20, fontWeight: '700' },
  h3: { color: theme.colors.text, fontSize: 18, fontWeight: '700' },
  sectionLabel: {
    color: theme.colors.muted, fontSize: 11, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase',
    marginTop: 4, marginBottom: 10,
  },
  body: { color: theme.colors.text, fontSize: 16, fontWeight: '400' },
  meta: { color: theme.colors.muted, fontSize: 14, fontWeight: '500' },
  tiny: { color: theme.colors.muted, fontSize: 12, fontWeight: '500' },
  empty: {
    color: theme.colors.muted, fontSize: 14, fontWeight: '500',
    textAlign: 'center', padding: 20, fontStyle: 'italic',
  },
};
