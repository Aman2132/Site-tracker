import React from 'react';
import { FlatList } from 'react-native';

import EmptyState from '@/components/common/EmptyState';
import LoadingView from '@/components/common/LoadingView';
import ScreenContainer from '@/components/common/ScreenContainer';
import ScreenTitle from '@/components/common/ScreenTitle';
import ActivityFeedItem from '@/components/owner/ActivityFeedItem';
import { spacing } from '@/constants/theme';
import { useActivityFeedController } from '@/controllers/useActivityFeedController';

export default function ActivityScreen() {
  const { events, loaded } = useActivityFeedController();

  if (!loaded) return <LoadingView />;

  return (
    <ScreenContainer padded={false}>
      <ScreenTitle>Activity</ScreenTitle>
      <FlatList
        data={events}
        keyExtractor={event => event.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}
        renderItem={({ item }) => <ActivityFeedItem event={item} />}
        ListEmptyComponent={<EmptyState message="No activity yet." />}
      />
    </ScreenContainer>
  );
}
