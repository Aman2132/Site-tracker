import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';

import { colors, fontFamily, glow, gradients, radius, spacing } from '@/constants/theme';
import { useRoleStore } from '@/store/useRoleStore';
import { Role } from '@/types/domain';

interface DevRoleSwitchButtonProps {
  targetRole: Role;
  label: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Demo-only affordance for jumping between the owner and worker experience
 * without a login flow. Replace with real auth/role switching before ship —
 * see README "Known gaps to close before shipping".
 */
export default function DevRoleSwitchButton({ targetRole, label, style }: DevRoleSwitchButtonProps) {
  const setRole = useRoleStore(state => state.setRole);
  return (
    <TouchableOpacity onPress={() => setRole(targetRole)} activeOpacity={0.85} style={style}>
      <LinearGradient
        colors={gradients.ink}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.button, glow(colors.ink, 0.4)]}
      >
        <Ionicons name="swap-horizontal" size={15} color={colors.white} />
        <Text style={styles.label}>{label}</Text>
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
  label: { fontFamily: fontFamily.bold, color: colors.white, fontSize: 12 },
});
