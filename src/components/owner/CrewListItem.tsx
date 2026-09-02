import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import InitialsAvatar from '@/components/common/InitialsAvatar';
import { colors, radius, spacing } from '@/constants/theme';
import { Person } from '@/types/domain';
import { formatAccuracy } from '@/utils/formatters';

export default function CrewListItem({ person }: { person: Person }) {
  return (
    <View style={styles.card}>
      <InitialsAvatar name={person.name} color={person.color} />
      <View style={styles.textColumn}>
        <Text style={styles.name}>{person.name}</Text>
        <Text style={styles.meta}>
          {person.role} · {formatAccuracy(person.accuracy)}
        </Text>
      </View>
    </View>
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
    borderWidth: 1,
    borderColor: colors.border,
  },
  textColumn: { flex: 1 },
  name: { fontSize: 15, color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
