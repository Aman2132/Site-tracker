import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import { useRoleStore } from '@/store/useRoleStore';
import { Role } from '@/types/domain';

interface DevRoleSwitchButtonProps {
  targetRole: Role;
  label: string;
  style?: ViewStyle;
}

/**
 * Demo-only affordance for jumping between the owner and worker experience
 * without a login flow. Replace with real auth/role switching before ship —
 * see README "Known gaps to close before shipping".
 */
export default function DevRoleSwitchButton({ targetRole, label, style }: DevRoleSwitchButtonProps) {
  const setRole = useRoleStore(state => state.setRole);
  return (
    <TouchableOpacity style={[styles.button, style]} onPress={() => setRole(targetRole)}>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.text,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md - 2,
    borderRadius: radius.xl,
  },
  label: { color: colors.white, fontSize: 12, fontWeight: '600' },
});
