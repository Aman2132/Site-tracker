import React, { useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { PHOTO_NOTE } from '@/constants/config';
import { colors, fontFamily, radius, spacing } from '@/constants/theme';

interface PhotoNoteSheetProps {
  visible: boolean;
  note: string;
  onSave: (note: string) => void;
  onClose: () => void;
}

/**
 * Sheet for the optional "what are you doing" note on one capture. Same
 * keyboard-controller overlay as TaskEditorSheet (not a Modal, so the keyboard
 * never covers the field), with a multiline field and a big Save button.
 */
export default function PhotoNoteSheet({ visible, note, onSave, onClose }: PhotoNoteSheetProps) {
  const [draft, setDraft] = useState(note);

  useEffect(() => {
    if (visible) setDraft(note);
  }, [visible, note]);

  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [visible, onClose]);

  if (!visible) return null;

  const save = () => {
    onSave(draft);
    onClose();
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.overlay}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.sheet}>
        <Text style={styles.title}>What are you doing?</Text>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Optional note, e.g. Pouring slab, east side"
          placeholderTextColor={colors.textFaint}
          maxLength={PHOTO_NOTE.maxChars}
          multiline
          autoFocus
          textAlignVertical="top"
          accessibilityLabel="Photo note"
        />
        <TouchableOpacity style={styles.save} onPress={save} activeOpacity={0.85} accessibilityRole="button">
          <Text style={styles.saveText}>Save note</Text>
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
    minHeight: 110,
    maxHeight: 180,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    padding: spacing.md,
    fontFamily: fontFamily.regular,
    fontSize: 16,
    color: colors.text,
  },
  save: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    alignItems: 'center',
    paddingVertical: spacing.lg - 2,
  },
  saveText: { fontFamily: fontFamily.bold, fontSize: 15, color: colors.white },
});
