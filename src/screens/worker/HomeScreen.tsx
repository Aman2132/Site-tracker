import React from 'react';
import { StyleSheet, Text } from 'react-native';

import DevRoleSwitchButton from '@/components/common/DevRoleSwitchButton';
import ScreenContainer from '@/components/common/ScreenContainer';
import StatRow from '@/components/common/StatRow';
import PauseToggleRow from '@/components/worker/PauseToggleRow';
import ShareStatusCard from '@/components/worker/ShareStatusCard';
import { colors } from '@/constants/theme';
import { useLocationSharingController } from '@/controllers/useLocationSharingController';
import { usePhotoQueueController } from '@/controllers/usePhotoQueueController';

export default function HomeScreen() {
  const { paused, togglePause } = useLocationSharingController();
  const { pendingCount } = usePhotoQueueController();

  return (
    <ScreenContainer style={styles.screen}>
      <Text style={styles.greeting}>Suryakant</Text>

      <ShareStatusCard paused={paused} />
      <PauseToggleRow paused={paused} onToggle={togglePause} />
      <StatRow label="Waiting to upload" value={pendingCount} />

      <DevRoleSwitchButton targetRole="owner" label="View as owner" style={styles.roleSwitch} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 16 },
  greeting: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 14 },
  roleSwitch: { marginTop: 'auto', marginBottom: 20, alignSelf: 'center' },
});
