import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, shadow } from '@/constants/theme';
import { initials } from '@/utils/formatters';

interface InitialsAvatarProps {
  name: string;
  color: string;
  size?: number;
  faded?: boolean;
  /** Adds a white ring + shadow, for use floating over imagery (e.g. map markers). */
  ringed?: boolean;
  /** The person's photo (data URI). Empty or missing shows their initials instead. */
  imageUri?: string;
}

/** A person's round avatar — their photo if they've set one, otherwise colored initials. */
export default function InitialsAvatar({
  name,
  color,
  size = 40,
  faded = false,
  ringed = false,
  imageUri,
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
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          accessibilityLabel={`${name}'s photo`}
        />
      ) : (
        <Text style={[styles.text, { fontSize: size * 0.32 }]}>{initials(name)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  ringed: { borderWidth: 2.5, borderColor: colors.white },
  text: { fontFamily: fontFamily.extrabold, color: colors.white },
});
