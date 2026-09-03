import React, { PropsWithChildren } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '@/constants/theme';

interface ScreenContainerProps {
  style?: ViewStyle;
  /** Set false for screens that render their own full-bleed content (e.g. camera, map). */
  padded?: boolean;
}

/** Standard screen wrapper: background color + safe-area-aware top padding for all tab screens. */
export default function ScreenContainer({
  children,
  style,
  padded = true,
}: PropsWithChildren<ScreenContainerProps>) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.base, padded && { paddingTop: insets.top + spacing.sm }, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  base: { flex: 1, backgroundColor: colors.background },
});
