import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ProfileAvatarEditor from '@/components/common/ProfileAvatarEditor';
import SignOutButton from '@/components/common/SignOutButton';
import { KEYBOARD, PROFILE } from '@/constants/config';
import { colors, fontFamily, radius, shadow, spacing, typography } from '@/constants/theme';
import { useProfileController } from '@/controllers/useProfileController';

/** Profile tab, for owners and workers: their own name and photo, account details, sign out. */
export default function ProfileScreen() {
  const { profile, email, saving, error, saveName, changeAvatar, removeAvatar } = useProfileController();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(profile?.name ?? '');
  useEffect(() => setName(profile?.name ?? ''), [profile?.name]);

  if (!profile) return null;
  const isOwner = profile.appRole === 'owner';
  const accent = isOwner ? colors.primary : colors.worker;
  const nameChanged = name.trim().length > 0 && name.trim() !== profile.name;

  return (
    <KeyboardAwareScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xxxl * 2 },
      ]}
      bottomOffset={KEYBOARD.formBottomOffset}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Profile</Text>

      <ProfileAvatarEditor
        name={profile.name}
        color={profile.color}
        avatar={profile.avatar}
        accent={accent}
        disabled={saving}
        onChange={changeAvatar}
        onRemove={removeAvatar}
      />

      <View style={[styles.card, shadow.sm]}>
        <Text style={styles.label}>YOUR NAME</Text>
        <View style={styles.nameRow}>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            maxLength={PROFILE.maxNameChars}
            autoCapitalize="words"
            autoComplete="name"
            editable={!saving}
            returnKeyType="done"
            onSubmitEditing={() => nameChanged && saveName(name)}
          />
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: accent }, !nameChanged && styles.saveDisabled]}
            disabled={!nameChanged || saving}
            onPress={() => saveName(name)}
          >
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>This is how you appear to the rest of the crew.</Text>
      </View>

      {saving && <ActivityIndicator color={accent} />}
      {error && <Text style={styles.error}>{error}</Text>}

      <View style={[styles.card, shadow.sm]}>
        <DetailRow label="Email" value={email ?? '—'} />
        <DetailRow label="Job title" value={profile.role} />
        <DetailRow label="Account" value={isOwner ? 'Owner' : 'Worker'} last />
      </View>

      <SignOutButton style={styles.signOut} />
    </KeyboardAwareScrollView>
  );
}

function DetailRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  title: { ...typography.title, color: colors.text, paddingHorizontal: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  label: { ...typography.label, color: colors.textFaint, marginBottom: spacing.sm },
  nameRow: { flexDirection: 'row', gap: spacing.sm },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontFamily: fontFamily.medium,
    fontSize: 15,
    color: colors.text,
  },
  saveButton: { borderRadius: radius.md, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  saveDisabled: { opacity: 0.4 },
  saveText: { fontFamily: fontFamily.bold, color: colors.white, fontSize: 14 },
  hint: { ...typography.bodySmall, color: colors.textFaint, marginTop: spacing.sm },
  error: { ...typography.bodySmall, color: colors.dangerText, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md - 2, gap: spacing.md },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { fontFamily: fontFamily.regular, fontSize: 13, color: colors.textMuted },
  rowValue: { flex: 1, textAlign: 'right', fontFamily: fontFamily.bold, fontSize: 13, color: colors.text },
  signOut: { alignSelf: 'center', marginTop: spacing.sm },
});
