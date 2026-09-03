import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import InitialsAvatar from '@/components/common/InitialsAvatar';
import { colors, fontFamily, radius, shadow, spacing } from '@/constants/theme';
import { Person } from '@/types/domain';
import { formatAccuracy } from '@/utils/formatters';

const STATUS_COLOR: Record<Person['kind'], string> = {
  vehicle: colors.primary,
  walk: colors.success,
  still: colors.textFaint,
  stale: colors.stale,
};

export default function CrewListItem({ person, onPress }: { person: Person; onPress?: () => void }) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View>
        <InitialsAvatar name={person.name} color={person.color} faded={person.kind === 'stale'} />
        <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[person.kind] }]} />
      </View>
      <View style={styles.textColumn}>
        <Text style={styles.name}>{person.name}</Text>
        <Text style={styles.meta}>
          {person.role} · {formatAccuracy(person.accuracy)}
        </Text>
      </View>
      {onPress && <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md + 2,
    marginBottom: spacing.sm + 2,
    ...shadow.sm,
  },
  statusDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  textColumn: { flex: 1 },
  name: { fontFamily: fontFamily.bold, fontSize: 15, color: colors.text },
  meta: { fontFamily: fontFamily.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
