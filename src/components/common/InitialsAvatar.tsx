import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, shadow } from '@/constants/theme';
import { initials } from '@/utils/formatters';

interface InitialsAvatarProps {
  name: string;
  color: string;
  size?: number;
  faded?: boolean;
  /** Adds a white ring + shadow, for use floating over imagery (e.g. map markers). */
  ringed?: boolean;
}

/** Colored initials bubble used for crew members on the map, list and chips. */
export default function InitialsAvatar({
  name,
  color,
  size = 40,
  faded = false,
  ringed = false,
}: InitialsAvatarProps) {
  return (
    <View
      style={[
        styles.bubble,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: faded ? 0.65 : 1,
        },
        ringed && [styles.ringed, shadow.sm],
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.32 }]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { alignItems: 'center', justifyContent: 'center' },
  ringed: { borderWidth: 2.5, borderColor: colors.white },
  text: { fontFamily: fontFamily.extrabold, color: colors.white },
});
