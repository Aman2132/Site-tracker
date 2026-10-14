import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';

import { colors, fontFamily, glow, gradients, radius, spacing } from '@/constants/theme';
import { performSignOut } from '@/controllers/useAuthController';
import { useAuthStore } from '@/store/useAuthStore';

export default function SignOutButton({ style }: { style?: StyleProp<ViewStyle> }) {
  const setProfile = useAuthStore(state => state.setProfile);
  return (
    <TouchableOpacity onPress={() => performSignOut(setProfile)} activeOpacity={0.85} style={style}>
      <LinearGradient
        colors={gradients.ink}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.button, glow(colors.ink, 0.4)]}
      >
        <Ionicons name="log-out-outline" size={15} color={colors.white} />
        <Text style={styles.label}>Sign out</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md - 2,
    borderRadius: radius.pill,
  },
  label: { color: colors.white, fontSize: 12, fontFamily: fontFamily.bold },
});
