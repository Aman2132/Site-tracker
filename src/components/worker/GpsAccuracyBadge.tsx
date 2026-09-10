import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GEOTAG_ACCURACY } from '@/constants/config';
import { colors, fontFamily, radius, spacing } from '@/constants/theme';
import { formatAccuracy } from '@/utils/formatters';

/** Live GPS accuracy readout for the Camera screen — see usePhotoCaptureController's watch. */
export default function GpsAccuracyBadge({ accuracyMeters }: { accuracyMeters: number | null }) {
  const isPrecise = accuracyMeters != null && accuracyMeters <= GEOTAG_ACCURACY.goodMeters;

  return (
    <View style={[styles.badge, isPrecise ? styles.badgePrecise : styles.badgeSeeking]}>
      <Ionicons name={isPrecise ? 'checkmark-circle' : 'locate'} size={12} color={colors.white} />
      <Text style={styles.text}>
        {accuracyMeters == null ? 'Locking GPS…' : formatAccuracy(accuracyMeters)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
  },
  badgeSeeking: { backgroundColor: 'rgba(226,103,15,0.88)' },
  badgePrecise: { backgroundColor: 'rgba(15,157,88,0.88)' },
  text: { fontFamily: fontFamily.bold, color: colors.white, fontSize: 11.5 },
});
