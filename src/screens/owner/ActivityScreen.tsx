import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { SectionList, StyleSheet, Text } from 'react-native';

import EmptyState from '@/components/common/EmptyState';
import FilterSheet from '@/components/common/FilterSheet';
import LoadingView from '@/components/common/LoadingView';
import ScreenContainer from '@/components/common/ScreenContainer';
import ScreenTitle from '@/components/common/ScreenTitle';
import ActivityFeedItem from '@/components/owner/ActivityFeedItem';
import { colors, fontFamily, spacing } from '@/constants/theme';
import { useActivityFeedController } from '@/controllers/useActivityFeedController';
import { OwnerTabParamList } from '@/types/navigation';

/** Owner Activity tab: a compact timeline by day, filterable, each entry opening its person or photos. */
export default function ActivityScreen() {
  const feed = useActivityFeedController();
  const { filters } = feed;
  const navigation = useNavigation<BottomTabNavigationProp<OwnerTabParamList>>();

  if (!feed.loaded) return <LoadingView />;

  return (
    <ScreenContainer padded={false}>
      <ScreenTitle>Activity</ScreenTitle>
      {feed.hasEvents && (
        <FilterSheet
          summary={feed.summary}
          activeCount={feed.activeFilterCount}
          onReset={feed.reset}
          sections={[
            {
              title: 'Event',
              options: filters.categories,
              selectedId: filters.category,
              onSelect: filters.setCategory,
            },
            {
              title: 'Site',
              options: filters.sites,
              selectedId: filters.siteId,
              onSelect: filters.setSiteId,
            },
            {
              title: 'Person',
              options: filters.people,
              selectedId: filters.personId,
              onSelect: filters.setPersonId,
            },
          ]}
        />
      )}
      <SectionList
        sections={feed.sections}
        keyExtractor={entry => entry.event.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => <Text style={styles.dayHeader}>{section.title}</Text>}
        renderItem={({ item, index, section }) => {
          const target = feed.targetOf(item.event);
          return (
            <ActivityFeedItem
              event={item.event}
              count={item.count}
              last={index === section.data.length - 1}
              onPress={
                target
                  ? () =>
                      target.tab === 'Photos'
                        ? navigation.navigate('Photos', { personId: target.personId })
                        : navigation.navigate('Crew', { personId: target.personId })
                  : undefined
              }
            />
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="pulse-outline"
            message={feed.hasEvents ? 'No activity matches these filters.' : 'No activity yet.'}
          />
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  dayHeader: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.text,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
});
