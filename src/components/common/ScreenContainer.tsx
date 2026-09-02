import React, { PropsWithChildren } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { colors, layout } from '@/constants/theme';

interface ScreenContainerProps {
  style?: ViewStyle;
  /** Set false for screens that render their own full-bleed content (e.g. camera, map). */
  padded?: boolean;
}

/** Standard screen wrapper: background color + safe top padding for all tab screens. */
export default function ScreenContainer({
  children,
  style,
  padded = true,
}: PropsWithChildren<ScreenContainerProps>) {
  return <View style={[styles.base, padded && styles.padded, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: { flex: 1, backgroundColor: colors.background },
  padded: { paddingTop: layout.screenTopPadding },
});
