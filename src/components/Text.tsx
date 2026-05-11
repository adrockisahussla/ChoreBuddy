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
 * Text: typography presets pulled from theme.text. Eliminates the
 * fontSize/fontWeight/letterSpacing repetition across screens.
 *
 * - h1/h2/h3: page/section/card titles (text color)
 * - sectionLabel: 11px uppercase tracked label (muted)
 * - body/meta/tiny: progressively smaller body text
 * - empty: italic muted, used for empty-state messages
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
  h1: { color: theme.colors.text, fontSize: 24, fontWeight: '900' },
  h2: { color: theme.colors.text, fontSize: 20, fontWeight: '900' },
  h3: { color: theme.colors.text, fontSize: 16, fontWeight: '900' },
  sectionLabel: {
    color: theme.colors.muted, fontSize: 11, fontWeight: '900',
    letterSpacing: 1.5, textTransform: 'uppercase',
    marginTop: 4, marginBottom: 10,
  },
  body: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
  meta: { color: theme.colors.muted, fontSize: 12, fontWeight: '700' },
  tiny: { color: theme.colors.muted, fontSize: 10, fontWeight: '700' },
  empty: {
    color: theme.colors.muted, fontSize: 13, fontWeight: '700',
    textAlign: 'center', padding: 20, fontStyle: 'italic',
  },
};

