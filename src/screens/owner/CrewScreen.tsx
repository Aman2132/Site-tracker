import React from 'react';
import { FlatList } from 'react-native';

import LoadingView from '@/components/common/LoadingView';
import ScreenContainer from '@/components/common/ScreenContainer';
import ScreenTitle from '@/components/common/ScreenTitle';
import CrewListItem from '@/components/owner/CrewListItem';
import { spacing } from '@/constants/theme';
import { useCrewTrackingController } from '@/controllers/useCrewTrackingController';

export default function CrewScreen() {
  const { people, loaded } = useCrewTrackingController();

  if (!loaded) return <LoadingView />;

  return (
    <ScreenContainer padded={false}>
      <ScreenTitle>Crew</ScreenTitle>
      <FlatList
        data={people}
        keyExtractor={person => person.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}
        renderItem={({ item }) => <CrewListItem person={item} />}
      />
    </ScreenContainer>
  );
}
