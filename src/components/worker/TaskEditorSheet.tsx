import React, { useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { CAPTURE_TASK } from '@/constants/config';
import { colors, fontFamily, radius, spacing } from '@/constants/theme';

interface TaskEditorSheetProps {
  visible: boolean;
  task: string;
  recent: string[];
  onSave: (task: string) => void;
  onClose: () => void;
}

/**
 * Sheet for naming what the next captures show. Presentational: the
 * controller owns the value. Drawn over the screen rather than in a Modal,
 * because a Modal is its own window and the keyboard then covers its input
 * on Android; this follows the same keyboard-controller pattern as CrewScreen.
 */
export default function TaskEditorSheet({ visible, task, recent, onSave, onClose }: TaskEditorSheetProps) {
  const [draft, setDraft] = useState(task);

  // Start from the current label each time the sheet opens.
  useEffect(() => {
    if (visible) setDraft(task);
  }, [visible, task]);

  // Back closes the sheet instead of leaving the camera.
  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [visible, onClose]);

  if (!visible) return null;

  const save = (value: string) => {
    onSave(value);
    onClose();
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.overlay}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.sheet}>
        <Text style={styles.title}>What are you shooting?</Text>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="e.g. Column grid L4"
          placeholderTextColor={colors.textFaint}
          maxLength={CAPTURE_TASK.maxChars}
          autoFocus
          selectTextOnFocus
          returnKeyType="done"
          onSubmitEditing={() => save(draft)}
        />
        {recent.length > 0 && (
          <View style={styles.chips}>
            {recent.map(item => (
              <TouchableOpacity key={item} style={styles.chip} onPress={() => save(item)} activeOpacity={0.8}>
                <Text style={styles.chipText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <TouchableOpacity style={styles.save} onPress={() => save(draft)} activeOpacity={0.85}>
          <Text style={styles.saveText}>Use this label</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlayScrim },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: { fontFamily: fontFamily.extrabold, fontSize: 17, color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    fontFamily: fontFamily.regular,
    fontSize: 15,
    color: colors.text,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  chipText: { fontFamily: fontFamily.semibold, fontSize: 12.5, color: colors.primary },
  save: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  saveText: { fontFamily: fontFamily.bold, fontSize: 14, color: colors.white },
});
