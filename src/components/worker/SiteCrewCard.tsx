import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import InitialsAvatar from '@/components/common/InitialsAvatar';
import { colors, fontFamily, radius, shadow, spacing } from '@/constants/theme';
import { CrewStatus, SiteCrewMember } from '@/utils/siteCrew';

interface SiteCrewCardProps {
  siteName: string;
  crew: SiteCrewMember[];
  hereCount: number;
  loading: boolean;
}

const STATUS: Record<CrewStatus, { label: string; text: string; background: string }> = {
  here: { label: 'Here now', text: colors.successText, background: colors.successBg },
  paused: { label: 'On a break', text: colors.warningText, background: colors.warningBg },
  noSignal: { label: 'No signal', text: colors.textMuted, background: colors.background },
  away: { label: 'Not checked in', text: colors.textFaint, background: colors.background },
};

/** "Crew at Tower B": the other people assigned to the site, with who is on site now. */
export default function SiteCrewCard({ siteName, crew, hereCount, loading }: SiteCrewCardProps) {
  return (
    <View style={[styles.card, shadow.sm]}>
      <Text style={styles.title}>Crew at {siteName}</Text>
      <Text style={styles.subtitle}>
        {crew.length === 0
          ? ' '
          : hereCount === 0
            ? 'Nobody else is checked in here right now'
            : `${hereCount} ${hereCount === 1 ? 'person is' : 'people are'} here with you`}
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.worker} style={styles.spinner} />
      ) : crew.length === 0 ? (
        <Text style={styles.empty}>No one else is assigned to this site.</Text>
      ) : (
        crew.map(member => {
          const status = STATUS[member.status];
          return (
            <View key={member.id} style={styles.row}>
              <InitialsAvatar
                name={member.name}
                color={member.color}
                imageUri={member.avatar}
                size={34}
                faded={member.status === 'away'}
              />
              <View style={styles.text}>
                <Text style={styles.name} numberOfLines={1}>
                  {member.name}
                </Text>
                <Text style={styles.role} numberOfLines={1}>
                  {member.role}
                </Text>
              </View>
              <View style={[styles.pill, { backgroundColor: status.background }]}>
                <Text style={[styles.pillText, { color: status.text }]}>{status.label}</Text>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  title: { fontFamily: fontFamily.extrabold, fontSize: 15.5, color: colors.text },
  subtitle: { fontFamily: fontFamily.regular, fontSize: 12, color: colors.textMuted, marginTop: -spacing.xs },
  spinner: { paddingVertical: spacing.md },
  empty: { fontFamily: fontFamily.medium, fontSize: 13, color: colors.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs },
  text: { flex: 1 },
  name: { fontFamily: fontFamily.semibold, fontSize: 14, color: colors.text },
  role: { fontFamily: fontFamily.regular, fontSize: 11.5, color: colors.textMuted, marginTop: 1 },
  pill: { borderRadius: radius.pill, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xxs + 1 },
  pillText: { fontFamily: fontFamily.bold, fontSize: 11 },
});
