import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { colors, fontFamily, radius, spacing, typography } from '@/constants/theme';
import { Person, Role } from '@/types/domain';

interface CrewMemberActionsProps {
  person: Person;
  /** Signed-in owner looking at themselves: role and deactivate are locked. */
  isMe: boolean;
  saving: boolean;
  error: string | null;
  onSaveJobTitle: (jobTitle: string) => void;
  onSetAppRole: (appRole: Role) => void;
  onSetActive: (active: boolean) => void;
}

const JOB_TITLE_MAX = 60;

/**
 * Owner-side edits for one crew member: job title, worker/owner access, and
 * deactivate/reactivate. Changes that lock someone out or hand over full
 * access ask for confirmation first.
 */
export default function CrewMemberActions({
  person,
  isMe,
  saving,
  error,
  onSaveJobTitle,
  onSetAppRole,
  onSetActive,
}: CrewMemberActionsProps) {
  const [jobTitle, setJobTitle] = useState(person.role);
  // Reset the draft when a different person is opened, or a save comes back.
  useEffect(() => setJobTitle(person.role), [person.id, person.role]);

  const isActive = person.active !== false;
  const titleChanged = jobTitle.trim().length > 0 && jobTitle.trim() !== person.role;

  const confirmAppRole = (appRole: Role) => {
    if (appRole === person.appRole) return;
    Alert.alert(
      appRole === 'owner' ? `Make ${person.name} an owner?` : `Make ${person.name} a worker?`,
      appRole === 'owner'
        ? 'Owners see everyone on the map, every photo, and can manage the crew. Takes effect next time they open the app.'
        : 'They lose the owner screens and get the worker app. Takes effect next time they open the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Change', onPress: () => onSetAppRole(appRole) },
      ]
    );
  };

  const confirmActive = () => {
    if (!isActive) {
      onSetActive(true);
      return;
    }
    Alert.alert(
      `Deactivate ${person.name}?`,
      "They're signed out and can't sign back in, and they drop off the live map. Their photos and history stay. You can reactivate them any time.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Deactivate', style: 'destructive', onPress: () => onSetActive(false) },
      ]
    );
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>JOB TITLE</Text>
      <View style={styles.titleRow}>
        <TextInput
          style={styles.input}
          value={jobTitle}
          onChangeText={setJobTitle}
          maxLength={JOB_TITLE_MAX}
          editable={!saving}
          placeholder="e.g. Mason · Crew A"
          placeholderTextColor={colors.textFaint}
          returnKeyType="done"
          onSubmitEditing={() => titleChanged && onSaveJobTitle(jobTitle)}
        />
        <TouchableOpacity
          style={[styles.saveButton, !titleChanged && styles.saveButtonDisabled]}
          disabled={!titleChanged || saving}
          onPress={() => onSaveJobTitle(jobTitle)}
        >
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>ACCESS</Text>
      <View style={[styles.segment, isMe && styles.locked]}>
        {(['worker', 'owner'] as const).map(appRole => {
          const selected = person.appRole === appRole;
          return (
            <TouchableOpacity
              key={appRole}
              style={[styles.segmentItem, selected && styles.segmentItemSelected]}
              disabled={isMe || saving || selected}
              onPress={() => confirmAppRole(appRole)}
            >
              <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                {appRole === 'owner' ? 'Owner' : 'Worker'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {isMe && <Text style={styles.hint}>You can't change your own access or deactivate yourself.</Text>}

      {!isMe && (
        <TouchableOpacity
          style={[styles.activeButton, isActive ? styles.deactivate : styles.reactivate]}
          disabled={saving}
          onPress={confirmActive}
        >
          <Ionicons
            name={isActive ? 'person-remove-outline' : 'person-add-outline'}
            size={16}
            color={isActive ? colors.dangerText : colors.successDeep}
          />
          <Text style={[styles.activeText, { color: isActive ? colors.dangerText : colors.successDeep }]}>
            {isActive ? 'Deactivate' : 'Reactivate'}
          </Text>
        </TouchableOpacity>
      )}

      {saving && <ActivityIndicator style={styles.spinner} color={colors.primary} />}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.lg },
  label: {
    ...typography.label,
    color: colors.textFaint,
    marginBottom: spacing.xs + 2,
    marginTop: spacing.md,
  },
  titleRow: { flexDirection: 'row', gap: spacing.sm },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.text,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  saveButtonDisabled: { opacity: 0.4 },
  saveText: { fontFamily: fontFamily.bold, color: colors.white, fontSize: 14 },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: 3,
  },
  locked: { opacity: 0.5 },
  segmentItem: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  segmentItemSelected: { backgroundColor: colors.surface },
  segmentText: { fontFamily: fontFamily.semibold, fontSize: 13, color: colors.textMuted },
  segmentTextSelected: { color: colors.text },
  hint: { ...typography.bodySmall, color: colors.textFaint, marginTop: spacing.xs + 2 },
  activeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    borderRadius: radius.md,
    paddingVertical: spacing.md - 2,
    marginTop: spacing.lg,
  },
  deactivate: { backgroundColor: colors.dangerBg },
  reactivate: { backgroundColor: colors.successBg },
  activeText: { fontFamily: fontFamily.bold, fontSize: 14 },
  spinner: { marginTop: spacing.md },
  error: { ...typography.bodySmall, color: colors.dangerText, marginTop: spacing.sm, textAlign: 'center' },
});
