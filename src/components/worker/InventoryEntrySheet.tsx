import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { INVENTORY } from '@/constants/config';
import { colors, fontFamily, radius, spacing, typography } from '@/constants/theme';
import { InventoryDraft, Site } from '@/types/domain';
import { formatQuantity, ItemSuggestion, packTotal, parseQuantity } from '@/utils/inventory';

const OTHER = 'Other…';

interface InventoryEntrySheetProps {
  visible: boolean;
  sites: Site[];
  defaultSiteId: string;
  /** Pre-fills name + unit ("+ again" on a past entry). */
  preset?: ItemSuggestion;
  suggest: (typed: string) => ItemSuggestion[];
  unitFor: (name: string) => string | undefined;
  /** Resolves with what's wrong, or null when saved. */
  onSave: (draft: InventoryDraft) => Promise<string | null>;
  onClose: () => void;
}

/**
 * "Received at site" form: item, how many, unit, optional note. Built for one
 * hand on site: big fields, a number keypad, unit chips instead of typing, and
 * past items one tap away (with the unit they were last logged in). "Save &
 * add another" keeps the sheet open for a delivery with several items.
 * Drawn over the screen rather than in a Modal so the keyboard doesn't cover
 * it on Android (same pattern as TaskEditorSheet).
 */
export default function InventoryEntrySheet({
  visible,
  sites,
  defaultSiteId,
  preset,
  suggest,
  unitFor,
  onSave,
  onClose,
}: InventoryEntrySheetProps) {
  const [siteId, setSiteId] = useState(defaultSiteId);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  /** "5 pieces of 5 m" instead of a plain total. */
  const [byPieces, setByPieces] = useState(false);
  const [pieces, setPieces] = useState('');
  const [each, setEach] = useState('');
  const [unit, setUnit] = useState('');
  const [customUnit, setCustomUnit] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const quantityRef = useRef<TextInput>(null);

  const pickUnit = (value: string) => {
    setUnit(value);
    setCustomUnit(!!value && !INVENTORY.units.includes(value));
  };

  const reset = (keepSaved: boolean) => {
    setName(preset?.name ?? '');
    pickUnit(preset?.unit ?? '');
    setQuantity('');
    setByPieces(false);
    setPieces('');
    setEach('');
    setNote('');
    setError(null);
    if (!keepSaved) setSaved(null);
  };

  // Fresh form each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setSiteId(defaultSiteId);
    reset(false);
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

  const choose = (suggestion: ItemSuggestion) => {
    setName(suggestion.name);
    pickUnit(suggestion.unit);
    quantityRef.current?.focus();
  };

  const pieceCount = parseQuantity(pieces);
  const pieceSize = parseQuantity(each);
  const piecesTotal = pieceCount != null && pieceSize != null ? packTotal(pieceCount, pieceSize) : null;

  const save = async (andAnother: boolean) => {
    const amount = byPieces ? piecesTotal : parseQuantity(quantity);
    if (amount == null) {
      setError(
        byPieces ? 'Enter how many pieces and how much each is.' : 'Enter how many (a number above 0).'
      );
      return;
    }
    const pack =
      byPieces && pieceCount != null && pieceSize != null
        ? { packCount: pieceCount, packSize: pieceSize }
        : {};
    setBusy(true);
    const problem = await onSave({ siteId, name, quantity: amount, unit, note, ...pack });
    setBusy(false);
    if (problem) {
      setError(problem);
      return;
    }
    if (!andAnother) {
      onClose();
      return;
    }
    setSaved(`Saved ${formatQuantity(amount)} ${unit} ${name.trim()}`);
    reset(true);
  };

  const suggestions = suggest(name);
  const unitChips = [...INVENTORY.units, OTHER];

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.overlay}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.sheet}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Received at site</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityLabel="Close">
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {saved && (
            <View style={styles.savedBar}>
              <Ionicons name="checkmark-circle" size={16} color={colors.successText} />
              <Text style={styles.savedText} numberOfLines={1}>
                {saved}
              </Text>
            </View>
          )}

          {sites.length > 1 && (
            <>
              <Text style={styles.label}>SITE</Text>
              <View style={styles.chips}>
                {sites.map(site => (
                  <Chip
                    key={site.id}
                    label={site.name}
                    selected={site.id === siteId}
                    onPress={() => setSiteId(site.id)}
                  />
                ))}
              </View>
            </>
          )}

          <Text style={styles.label}>ITEM</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={text => {
              setName(text);
              setError(null);
            }}
            onEndEditing={() => !unit && pickUnit(unitFor(name) ?? '')}
            placeholder="e.g. Cement, Rebar 12mm, PVC pipe"
            placeholderTextColor={colors.textFaint}
            maxLength={INVENTORY.maxNameChars}
            autoFocus={!preset}
            returnKeyType="next"
            onSubmitEditing={() => quantityRef.current?.focus()}
          />
          {suggestions.length > 0 && (
            <View style={styles.chips}>
              {suggestions.map(s => (
                <Chip key={s.name} label={`${s.name} · ${s.unit}`} onPress={() => choose(s)} soft />
              ))}
            </View>
          )}

          <View style={styles.howRow}>
            <Text style={styles.label}>HOW MANY</Text>
            <View style={styles.modes}>
              <Chip label="Total" selected={!byPieces} onPress={() => setByPieces(false)} />
              <Chip label="Pieces of a size" selected={byPieces} onPress={() => setByPieces(true)} />
            </View>
          </View>
          {byPieces ? (
            <>
              <View style={styles.piecesRow}>
                <TextInput
                  ref={quantityRef}
                  style={[styles.input, styles.quantity, styles.piecesInput]}
                  value={pieces}
                  onChangeText={text => {
                    setPieces(text);
                    setError(null);
                  }}
                  placeholder="5"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="decimal-pad"
                  maxLength={9}
                  accessibilityLabel="How many pieces"
                />
                <Text style={styles.times}>pcs ×</Text>
                <TextInput
                  style={[styles.input, styles.quantity, styles.piecesInput]}
                  value={each}
                  onChangeText={text => {
                    setEach(text);
                    setError(null);
                  }}
                  placeholder="5"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="decimal-pad"
                  maxLength={9}
                  accessibilityLabel="How much each piece is"
                />
                <Text style={styles.times}>{unit || 'unit'} each</Text>
              </View>
              <Text style={styles.total}>
                {piecesTotal != null && unit
                  ? `= ${formatQuantity(piecesTotal)} ${unit} in total`
                  : 'Pick the unit each piece is measured in below (e.g. m for wire).'}
              </Text>
            </>
          ) : (
            <TextInput
              ref={quantityRef}
              style={[styles.input, styles.quantity]}
              value={quantity}
              onChangeText={text => {
                setQuantity(text);
                setError(null);
              }}
              placeholder="0"
              placeholderTextColor={colors.textFaint}
              keyboardType="decimal-pad"
              autoFocus={!!preset}
              maxLength={12}
            />
          )}

          <Text style={styles.label}>UNIT</Text>
          <View style={styles.chips}>
            {unitChips.map(u => {
              const selected = u === OTHER ? customUnit : !customUnit && unit === u;
              return (
                <Chip
                  key={u}
                  label={u}
                  selected={selected}
                  onPress={() => {
                    setError(null);
                    if (u === OTHER) {
                      setCustomUnit(true);
                      setUnit('');
                    } else pickUnit(u);
                  }}
                />
              );
            })}
          </View>
          {customUnit && (
            <TextInput
              style={styles.input}
              value={unit}
              onChangeText={setUnit}
              placeholder="Unit, e.g. sheets, trucks"
              placeholderTextColor={colors.textFaint}
              maxLength={INVENTORY.maxUnitChars}
              autoFocus
            />
          )}

          <Text style={styles.label}>NOTE (OPTIONAL)</Text>
          <TextInput
            style={[styles.input, styles.note]}
            value={note}
            onChangeText={setNote}
            placeholder="Supplier, challan no., condition…"
            placeholderTextColor={colors.textFaint}
            maxLength={INVENTORY.maxNoteChars}
            multiline
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.secondary]}
              onPress={() => save(true)}
              disabled={busy}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryText}>Save & add another</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.primary]}
              onPress={() => save(false)}
              disabled={busy}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryText}>Save</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function Chip({
  label,
  selected,
  soft,
  onPress,
}: {
  label: string;
  selected?: boolean;
  soft?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, soft && styles.chipSoft, selected && styles.chipSelected]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
    >
      <Text
        style={[styles.chipText, soft && styles.chipTextSoft, selected && styles.chipTextSelected]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlayScrim },
  sheet: {
    maxHeight: '92%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  content: { padding: spacing.xl, gap: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fontFamily.extrabold, fontSize: 18, color: colors.text },
  label: { ...typography.label, color: colors.textMuted, marginTop: spacing.sm },
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
  quantity: { fontFamily: fontFamily.bold, fontSize: 22 },
  howRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  modes: { flexDirection: 'row', gap: spacing.xs },
  piecesRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  piecesInput: { flex: 1, minWidth: 64 },
  times: { fontFamily: fontFamily.semibold, fontSize: 14, color: colors.textMuted },
  total: { fontFamily: fontFamily.bold, fontSize: 14, color: colors.workerDeep },
  note: { minHeight: 64, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  chipSoft: { backgroundColor: colors.workerSoft, borderColor: colors.workerSoft },
  chipSelected: { backgroundColor: colors.worker, borderColor: colors.worker },
  chipText: { fontFamily: fontFamily.semibold, fontSize: 14, color: colors.text },
  chipTextSoft: { color: colors.workerDeep },
  chipTextSelected: { color: colors.white },
  savedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: colors.successBg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  savedText: { flex: 1, fontFamily: fontFamily.semibold, fontSize: 13, color: colors.successText },
  error: { fontFamily: fontFamily.medium, fontSize: 13, color: colors.dangerText },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  button: {
    flex: 1,
    minHeight: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.worker },
  primaryText: { fontFamily: fontFamily.bold, fontSize: 15, color: colors.white },
  secondary: { backgroundColor: colors.workerSoft },
  secondaryText: { fontFamily: fontFamily.bold, fontSize: 14, color: colors.workerDeep },
});
