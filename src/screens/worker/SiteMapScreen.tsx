import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import EmptyState from '@/components/common/EmptyState';
import LoadingView from '@/components/common/LoadingView';
import ScreenContainer from '@/components/common/ScreenContainer';
import SiteCrewCard from '@/components/worker/SiteCrewCard';
import SiteCrewMap from '@/components/worker/SiteCrewMap';
import { colors, spacing, typography } from '@/constants/theme';
import { useSiteMapController } from '@/controllers/useSiteMapController';

/** Worker "Map" tab: where I and my site-mates are, plus who is here. Only while checked in. */
export default function SiteMapScreen() {
  const map = useSiteMapController();
  const insets = useSafeAreaInsets();

  if (!map.checkedIn) {
    return (
      <ScreenContainer>
        <Text style={styles.title}>Site map</Text>
        <EmptyState icon="map-outline" message="Check in at a site on Home to see your crew here." />
      </ScreenContainer>
    );
  }
  if (map.loading) return <LoadingView />;

  const placed = map.crew.some(member => member.position) || map.me;
  return (
    <ScreenContainer padded={false}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <Text style={styles.title}>{map.siteName}</Text>
        {map.paused && <Text style={styles.paused}>You are on a break — your crew can't see you.</Text>}
      </View>
      {map.hasMap && placed ? (
        <View style={styles.mapArea}>
          <SiteCrewMap crew={map.crew} me={map.me} now={map.now} fill />
        </View>
      ) : (
        <EmptyState
          icon="map-outline"
          message={
            map.hasMap ? 'Nobody is sharing a position here yet.' : 'The map is not set up in this build.'
          }
        />
      )}
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        <SiteCrewCard
          siteName={map.siteName ?? ''}
          crew={map.crew}
          hereCount={map.hereCount}
          loading={map.loading}
        />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  title: { ...typography.title, color: colors.text, paddingHorizontal: spacing.xs },
  paused: { ...typography.bodySmall, color: colors.warningText, marginTop: spacing.xs },
  mapArea: { flex: 3 },
  list: { flex: 2 },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
});
