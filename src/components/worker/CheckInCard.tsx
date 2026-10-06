import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontFamily, radius, shadow, spacing } from '@/constants/theme';
import { Site } from '@/types/domain';

interface CheckInCardProps {
  sites: Site[];
  loading: boolean;
  busy: boolean;
  error: string | null;
  onCheckIn: (site: Site) => void;
  onRefresh: () => void;
}

/** Shown while checked out: one button per assigned site. Location is shared only once checked in. */
export default function CheckInCard({ sites, loading, busy, error, onCheckIn, onRefresh }: CheckInCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Start your shift</Text>
      <Text style={styles.body}>Check in at a site to start sharing your location with your supervisor.</Text>

      {loading ? (
        <ActivityIndicator color={colors.worker} style={styles.spinner} />
      ) : sites.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No site assigned to you yet. Ask your admin to assign one.</Text>
          <TouchableOpacity onPress={onRefresh} hitSlop={8}>
            <Text style={styles.refresh}>Check again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        sites.map(site => (
          <TouchableOpacity
            key={site.id}
            style={[styles.siteRow, busy && styles.disabled]}
            onPress={() => onCheckIn(site)}
            disabled={busy}
            activeOpacity={0.8}
          >
            <View style={styles.siteIcon}>
              <Ionicons name="business" size={16} color={colors.worker} />
            </View>
            <View style={styles.siteText}>
              <Text style={styles.siteName}>{site.name}</Text>
              {site.code ? <Text style={styles.siteCode}>{site.code}</Text> : null}
            </View>
            <Text style={styles.action}>Check in</Text>
          </TouchableOpacity>
        ))
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl - 1, gap: spacing.md, ...shadow.sm },
  title: { fontFamily: fontFamily.extrabold, fontSize: 17, color: colors.text },
  body: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19, color: colors.textMuted },
  spinner: { paddingVertical: spacing.lg },
  empty: { gap: spacing.sm },
  emptyText: { fontFamily: fontFamily.medium, fontSize: 13, color: colors.textMuted },
  refresh: { fontFamily: fontFamily.bold, fontSize: 13, color: colors.worker },
  siteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  disabled: { opacity: 0.5 },
  siteIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md - 2,
    backgroundColor: colors.workerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  siteText: { flex: 1 },
  siteName: { fontFamily: fontFamily.semibold, fontSize: 14.5, color: colors.text },
  siteCode: { fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  action: { fontFamily: fontFamily.bold, fontSize: 13, color: colors.worker },
  error: { fontFamily: fontFamily.medium, fontSize: 12.5, color: colors.dangerText },
});
