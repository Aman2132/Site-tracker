import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  BackHandler,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { PHOTO_NOTE } from '@/constants/config';
import { colors, fontFamily, radius, spacing, typography } from '@/constants/theme';
import { InventoryEntry, Photo } from '@/types/domain';
import { formatQuantity, parseQuantity, remainingQuantity } from '@/utils/inventory';

interface PhotoNoteSheetProps {
  visible: boolean;
  note: string;
  /** The inventory entry the photo is currently proof for, if any. */
  inventoryId?: string;
  /** The person's own entries this photo may be attached to; none hides the picker. */
  items: InventoryEntry[];
  /**
   * `used`: how much of the linked item these photos show was consumed (null = not logging any).
   * Resolves with what's wrong (the sheet stays open and shows it), or null when saved.
   */
  onSave: (note: string, inventoryId: string | null, used: number | null) => Promise<string | null>;
  onClose: () => void;
  /** Camera tray: captures that can be ticked into the batch. Absent for a single capture (Queue). */
  choices?: Photo[];
  /** Which of `choices` the note applies to. */
  selectedIds?: string[];
  onToggle?: (id: string) => void;
}

/**
 * Sheet for the optional "what are you doing" note on one capture or a batch
 * from the camera tray (tick thumbnails in or out), and which of the person's
 * own inventory deliveries it is photo proof for (one tap; "Just a photo"
 * leaves it unlinked). Same keyboard-controller overlay as TaskEditorSheet
 * (not a Modal, so the keyboard never covers the field).
 */
export default function PhotoNoteSheet({
  visible,
  note,
  inventoryId,
  items,
  onSave,
  onClose,
  choices,
  selectedIds = [],
  onToggle,
}: PhotoNoteSheetProps) {
  const [draft, setDraft] = useState(note);
  const [linked, setLinked] = useState<string | null>(inventoryId ?? null);
  const [used, setUsed] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Prefill once per opening; ticking photos in or out must not wipe what was typed.
  useEffect(() => {
    if (!visible) return;
    setDraft(note);
    setLinked(inventoryId ?? null);
    setUsed('');
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on open
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [visible, onClose]);

  if (!visible) return null;

  const count = choices ? selectedIds.length : 1;
  const linkedItem = items.find(item => item.id === linked);
  const save = async () => {
    if (count === 0) return;
    const amount = linkedItem && used.trim() ? parseQuantity(used) : null;
    if (linkedItem && used.trim() && amount == null) {
      setError('Enter how much was used (a number above 0), or leave it empty.');
      return;
    }
    setBusy(true);
    const problem = await onSave(draft, linked, amount);
    setBusy(false);
    if (problem) setError(problem);
    else onClose();
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.overlay}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" />
      <ScrollView
        style={styles.sheet}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>
          {choices && count !== 1 ? `Note for ${count} captures` : 'What are you doing?'}
        </Text>
        {choices && choices.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.picks}>
            {choices.map(photo => {
              const picked = selectedIds.includes(photo.id);
              return (
                <TouchableOpacity
                  key={photo.id}
                  onPress={() => onToggle?.(photo.id)}
                  activeOpacity={0.85}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: picked }}
                >
                  {photo.mediaType === 'video' ? (
                    <View style={[styles.pick, styles.pickVideo, !picked && styles.pickOff]}>
                      <Ionicons name="videocam" size={18} color={colors.textMuted} />
                    </View>
                  ) : (
                    <Image source={{ uri: photo.uri }} style={[styles.pick, !picked && styles.pickOff]} />
                  )}
                  <View style={[styles.tick, picked && styles.tickOn]}>
                    {picked && <Ionicons name="checkmark" size={12} color={colors.white} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
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
        {items.length > 0 && (
          <>
            <Text style={styles.label}>PROOF FOR AN ITEM (OPTIONAL)</Text>
            <View style={styles.chips}>
              <Chip label="Just a photo" selected={linked == null} onPress={() => setLinked(null)} />
              {items.map(item => (
                <Chip
                  key={item.id}
                  label={`${formatQuantity(item.quantity)} ${item.unit} ${item.name}`}
                  selected={linked === item.id}
                  onPress={() => {
                    setLinked(item.id);
                    setUsed('');
                    setError(null);
                  }}
                  icon
                />
              ))}
            </View>
          </>
        )}
        {linkedItem && (
          <>
            <Text style={styles.label}>
              USED (OPTIONAL) · {formatQuantity(remainingQuantity(linkedItem))} {linkedItem.unit} LEFT
            </Text>
            <View style={styles.usedRow}>
              <TextInput
                style={[styles.usedInput]}
                value={used}
                onChangeText={text => {
                  setUsed(text);
                  setError(null);
                }}
                placeholder="0"
                placeholderTextColor={colors.textFaint}
                keyboardType="decimal-pad"
                maxLength={12}
                accessibilityLabel={`How much ${linkedItem.name} was used`}
              />
              <Text style={styles.usedUnit}>{linkedItem.unit}</Text>
              <TouchableOpacity
                style={styles.allLeft}
                onPress={() => setUsed(formatQuantity(remainingQuantity(linkedItem)))}
                activeOpacity={0.8}
              >
                <Text style={styles.allLeftText}>All left</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
        {error && <Text style={styles.error}>{error}</Text>}
        <TouchableOpacity
          style={[styles.save, (count === 0 || busy) && styles.saveDisabled]}
          onPress={save}
          disabled={count === 0 || busy}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <Text style={styles.saveText}>
            {count === 0 ? 'Pick at least one' : count > 1 ? `Save to ${count}` : 'Save'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Chip({
  label,
  selected,
  icon,
  onPress,
}: {
  label: string;
  selected: boolean;
  icon?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      {icon && <Ionicons name="cube-outline" size={14} color={selected ? colors.white : colors.textMuted} />}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlayScrim },
  sheet: {
    flexGrow: 0,
    maxHeight: '90%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  content: { padding: spacing.xl, gap: spacing.md },
  picks: { gap: spacing.sm, paddingVertical: spacing.xs },
  pick: { width: 64, height: 64, borderRadius: radius.sm, backgroundColor: colors.background },
  pickVideo: { alignItems: 'center', justifyContent: 'center' },
  pickOff: { opacity: 0.35 },
  tick: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass,
  },
  tickOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  saveDisabled: { opacity: 0.5 },
  usedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  usedInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: fontFamily.bold,
    fontSize: 20,
    color: colors.text,
  },
  usedUnit: { fontFamily: fontFamily.semibold, fontSize: 15, color: colors.textMuted },
  allLeft: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  allLeftText: { fontFamily: fontFamily.bold, fontSize: 13, color: colors.primary },
  error: { fontFamily: fontFamily.medium, fontSize: 13, color: colors.dangerText },
  label: { ...typography.label, color: colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 40,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { flexShrink: 1, fontFamily: fontFamily.semibold, fontSize: 13.5, color: colors.text },
  chipTextSelected: { color: colors.white },
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
