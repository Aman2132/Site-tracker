import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LoadingView from '@/components/common/LoadingView';
import LiveCrewMap from '@/components/owner/LiveCrewMap';
import MapControls from '@/components/owner/MapControls';
import PersonDetailSheet from '@/components/owner/PersonDetailSheet';
import StaticCrewMap from '@/components/owner/StaticCrewMap';
import { colors, fontFamily, gradients, radius, shadow, spacing } from '@/constants/theme';
import { useLiveMapController } from '@/controllers/useLiveMapController';

export default function MapScreen() {
  const map = useLiveMapController();
  const insets = useSafeAreaInsets();

  if (!map.loaded || !map.initialCamera) return <LoadingView />;

  return (
    <View style={styles.flex}>
      {map.hasLiveMap ? (
        <LiveCrewMap
          people={map.people}
          trails={map.trails}
          headings={map.headings}
          initialCamera={map.initialCamera}
          camera={map.camera}
          mapStyle={map.mapStyle}
          onSelectPerson={map.selectPerson}
        />
      ) : (
        <StaticCrewMap people={map.people} onSelectPerson={map.selectPerson} />
      )}

      <View style={[styles.headerCard, shadow.lg, { top: insets.top + spacing.sm }]}>
        <LinearGradient colors={gradients.primaryRadiant} style={styles.headerIconWrap}>
          <Ionicons name="people" size={17} color={colors.white} />
        </LinearGradient>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Live crew</Text>
          <Text style={styles.headerSub}>{map.people.length} tracked · tap a bubble for details</Text>
        </View>
      </View>

      {map.hasLiveMap && (
        <View style={[styles.controls, { top: insets.top + spacing.sm + 76 }]} pointerEvents="box-none">
          <MapControls
            is3d={map.is3d}
            onToggle3d={map.toggle3d}
            mapStyle={map.mapStyle}
            onCycleMapStyle={map.cycleMapStyle}
            motionMode={map.motionMode}
            onToggleMotionMode={map.toggleMotionMode}
            heading={map.heading}
            onRecenter={map.recenter}
            onMyLocation={map.goToMyLocation}
            locating={map.locating}
          />
        </View>
      )}

      {map.notice && (
        <View style={[styles.notice, shadow.md, { bottom: spacing.xl }]} pointerEvents="none">
          <Ionicons name="navigate-circle-outline" size={16} color={colors.white} />
          <Text style={styles.noticeText}>{map.notice}</Text>
        </View>
      )}

      {map.selectedPerson && <PersonDetailSheet person={map.selectedPerson} onClose={map.clearSelection} />}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerCard: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
  },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  headerTitle: { fontFamily: fontFamily.bold, fontSize: 15, color: colors.text },
  headerSub: { fontFamily: fontFamily.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  controls: { position: 'absolute', right: spacing.md },
  notice: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md - 2,
  },
  noticeText: { flex: 1, fontFamily: fontFamily.medium, fontSize: 13, color: colors.white },
});
