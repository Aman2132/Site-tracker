import React, { useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { INVENTORY } from '@/constants/config';
import { colors, fontFamily, radius, spacing, typography } from '@/constants/theme';
import { InventoryEntry } from '@/types/domain';
import { formatQuantity, parseQuantity, remainingQuantity } from '@/utils/inventory';

/**
 * "How much was used" for one delivery, usually at check-out. Presentational:
 * the controller decides who may log and saves it. Same over-the-screen
 * keyboard pattern as InventoryEntrySheet.
 */
export default function InventoryUsageSheet({
  entry,
  onSave,
  onClose,
}: {
  /** Null keeps the sheet closed. */
  entry: InventoryEntry | null;
  /** Resolves with what's wrong, or null when saved. */
  onSave: (entry: InventoryEntry, quantity: number, note: string) => Promise<string | null>;
  onClose: () => void;
}) {
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!entry) return;
    setQuantity('');
    setNote('');
    setError(null);
  }, [entry]);

  useEffect(() => {
    if (!entry) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [entry, onClose]);

  if (!entry) return null;
  const left = remainingQuantity(entry);

  const save = async (amount: number | null) => {
    if (amount == null) {
      setError('Enter how much was used (a number above 0).');
      return;
    }
    setBusy(true);
    const problem = await onSave(entry, amount, note);
    setBusy(false);
    if (problem) setError(problem);
    else onClose();
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.overlay}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.sheet}>
        <Text style={styles.title}>How much {entry.name} was used?</Text>
        <Text style={styles.sub}>
          {formatQuantity(left)} {entry.unit} left of {formatQuantity(entry.quantity)}
        </Text>

        <Text style={styles.label}>USED</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.quantity]}
            value={quantity}
            onChangeText={text => {
              setQuantity(text);
              setError(null);
            }}
            placeholder="0"
            placeholderTextColor={colors.textFaint}
            keyboardType="decimal-pad"
            autoFocus
            maxLength={12}
          />
          <Text style={styles.unit}>{entry.unit}</Text>
          <TouchableOpacity
            style={styles.all}
            onPress={() => setQuantity(formatQuantity(left))}
            activeOpacity={0.8}
          >
            <Text style={styles.allText}>All left</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>NOTE (OPTIONAL)</Text>
        <TextInput
          style={[styles.input, styles.note]}
          value={note}
          onChangeText={setNote}
          placeholder="Where it went, wastage…"
          placeholderTextColor={colors.textFaint}
          maxLength={INVENTORY.maxNoteChars}
          multiline
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={styles.save}
          onPress={() => save(parseQuantity(quantity))}
          disabled={busy}
          activeOpacity={0.85}
        >
          <Text style={styles.saveText}>Save usage</Text>
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
    gap: spacing.sm,
  },
  title: { fontFamily: fontFamily.extrabold, fontSize: 18, color: colors.text },
  sub: { ...typography.bodySmall, color: colors.textMuted },
  label: { ...typography.label, color: colors.textMuted, marginTop: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontFamily: fontFamily.medium,
    fontSize: 16,
    color: colors.text,
  },
  quantity: { flex: 1, fontFamily: fontFamily.bold, fontSize: 22 },
  unit: { fontFamily: fontFamily.semibold, fontSize: 15, color: colors.textMuted },
  all: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.workerSoft,
  },
  allText: { fontFamily: fontFamily.bold, fontSize: 13, color: colors.workerDeep },
  note: { minHeight: 64, textAlignVertical: 'top' },
  error: { fontFamily: fontFamily.medium, fontSize: 13, color: colors.dangerText },
  save: {
    minHeight: 52,
    marginTop: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.worker,
  },
  saveText: { fontFamily: fontFamily.bold, fontSize: 15, color: colors.white },
});
