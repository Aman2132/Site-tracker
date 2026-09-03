import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, glow, gradients, radius, spacing } from '@/constants/theme';

export default function ShareStatusCard({ paused }: { paused: boolean }) {
  const tint = paused ? colors.worker : colors.success;

  return (
    <LinearGradient
      colors={paused ? gradients.worker : gradients.success}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, glow(tint, 0.28)]}
    >
      <View style={styles.head}>
        <View style={styles.iconWrap}>
          <Ionicons name={paused ? 'pause' : 'navigate'} size={15} color={colors.white} />
        </View>
        <Text style={styles.title}>{paused ? 'Sharing is paused' : 'Location is on'}</Text>
      </View>
      <Text style={styles.body}>
        {paused
          ? 'Your supervisor can see that you paused, and the last place you were.'
          : 'Your supervisor can see where you are. Photos you take are tagged with the exact spot.'}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, padding: spacing.xl - 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, marginBottom: spacing.md - 2 },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: fontFamily.extrabold, fontSize: 17, color: colors.white },
  body: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19, color: 'rgba(255,255,255,0.92)' },
});
