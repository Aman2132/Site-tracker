import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import DevRoleSwitchButton from '@/components/common/DevRoleSwitchButton';
import ScreenContainer from '@/components/common/ScreenContainer';
import StatRow from '@/components/common/StatRow';
import PauseToggleRow from '@/components/worker/PauseToggleRow';
import ShareStatusCard from '@/components/worker/ShareStatusCard';
import { colors, fontFamily, glow, gradients, radius, spacing, typography } from '@/constants/theme';
import { useLocationSharingController } from '@/controllers/useLocationSharingController';
import { usePhotoQueueController } from '@/controllers/usePhotoQueueController';

const WORKER_NAME = 'Suryakant';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const { paused, togglePause } = useLocationSharingController();
  const { pendingCount } = usePhotoQueueController();
  const insets = useSafeAreaInsets();

  return (
    <ScreenContainer padded={false} style={styles.screen}>
      <LinearGradient
        colors={gradients.worker}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + spacing.lg }, glow(colors.worker, 0.32)]}
      >
        <View>
          <Text style={styles.eyebrow}>{greeting().toUpperCase()}</Text>
          <Text style={styles.greeting}>{WORKER_NAME}</Text>
        </View>
        <LinearGradient colors={gradients.sheen} style={styles.avatarWrap}>
          <Ionicons name="construct" size={20} color={colors.white} />
        </LinearGradient>
      </LinearGradient>

      <View style={styles.body}>
        <ShareStatusCard paused={paused} />
        <PauseToggleRow paused={paused} onToggle={togglePause} />
        <StatRow
          label="Waiting to upload"
          value={pendingCount}
          icon="cloud-upload-outline"
          gradient={gradients.worker}
        />

        <DevRoleSwitchButton targetRole="owner" label="View as owner" style={styles.roleSwitch} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
  },
  eyebrow: { ...typography.eyebrow, color: 'rgba(255,255,255,0.8)' },
  greeting: { fontFamily: fontFamily.extrabold, fontSize: 25, color: colors.white, marginTop: 3 },
  avatarWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  body: { flex: 1, paddingHorizontal: spacing.lg, marginTop: -spacing.lg },
  roleSwitch: { marginTop: 'auto', marginBottom: spacing.xl, alignSelf: 'center' },
});
