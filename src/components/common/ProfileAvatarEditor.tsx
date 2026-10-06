import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import InitialsAvatar from '@/components/common/InitialsAvatar';
import { colors, fontFamily, shadow, spacing } from '@/constants/theme';

interface ProfileAvatarEditorProps {
  name: string;
  color: string;
  avatar?: string;
  accent: string;
  disabled: boolean;
  onChange: () => void;
  onRemove: () => void;
}

const SIZE = 104;

/** The big avatar at the top of the Profile tab, with change/remove actions. */
export default function ProfileAvatarEditor({
  name,
  color,
  avatar,
  accent,
  disabled,
  onChange,
  onRemove,
}: ProfileAvatarEditorProps) {
  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        onPress={onChange}
        disabled={disabled}
        activeOpacity={0.85}
        accessibilityLabel="Change photo"
      >
        <InitialsAvatar name={name} color={color} imageUri={avatar} size={SIZE} ringed />
        <View style={[styles.cameraBadge, shadow.sm, { backgroundColor: accent }]}>
          <Ionicons name="camera" size={16} color={colors.white} />
        </View>
      </TouchableOpacity>
      <View style={styles.actions}>
        <TouchableOpacity onPress={onChange} disabled={disabled} hitSlop={8}>
          <Text style={[styles.action, { color: accent }]}>{avatar ? 'Change photo' : 'Add photo'}</Text>
        </TouchableOpacity>
        {!!avatar && (
          <TouchableOpacity onPress={onRemove} disabled={disabled} hitSlop={8}>
            <Text style={[styles.action, styles.remove]}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.md },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: colors.white,
  },
  actions: { flexDirection: 'row', gap: spacing.xl },
  action: { fontFamily: fontFamily.bold, fontSize: 14 },
  remove: { color: colors.dangerText },
});
