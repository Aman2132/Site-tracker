import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { initials } from '@/utils/formatters';

interface InitialsAvatarProps {
  name: string;
  color: string;
  size?: number;
  faded?: boolean;
}

/** Colored initials bubble used for crew members on the map, list and chips. */
export default function InitialsAvatar({ name, color, size = 40, faded = false }: InitialsAvatarProps) {
  return (
    <View
      style={[
        styles.bubble,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: faded ? 0.7 : 1,
        },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.32 }]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { alignItems: 'center', justifyContent: 'center' },
  text: { color: colors.white, fontWeight: '700' },
});
