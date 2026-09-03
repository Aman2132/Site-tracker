import React, { useState } from 'react';
import { FlatList } from 'react-native';

import LoadingView from '@/components/common/LoadingView';
import ScreenContainer from '@/components/common/ScreenContainer';
import ScreenTitle from '@/components/common/ScreenTitle';
import CrewListItem from '@/components/owner/CrewListItem';
import PersonDetailSheet from '@/components/owner/PersonDetailSheet';
import { spacing } from '@/constants/theme';
import { useCrewTrackingController } from '@/controllers/useCrewTrackingController';
import { Person } from '@/types/domain';

export default function CrewScreen() {
  const { people, loaded } = useCrewTrackingController();
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  if (!loaded) return <LoadingView />;

  return (
    <ScreenContainer padded={false}>
      <ScreenTitle>Crew</ScreenTitle>
      <FlatList
        data={people}
        keyExtractor={person => person.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}
        renderItem={({ item }) => <CrewListItem person={item} onPress={() => setSelectedPerson(item)} />}
      />
      {selectedPerson && (
        <PersonDetailSheet person={selectedPerson} onClose={() => setSelectedPerson(null)} />
      )}
    </ScreenContainer>
  );
}
