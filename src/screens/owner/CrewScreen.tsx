import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import LoadingView from '@/components/common/LoadingView';
import ScreenContainer from '@/components/common/ScreenContainer';
import ScreenTitle from '@/components/common/ScreenTitle';
import CrewListItem from '@/components/owner/CrewListItem';
import CrewMemberActions from '@/components/owner/CrewMemberActions';
import PersonDetailSheet from '@/components/owner/PersonDetailSheet';
import { spacing } from '@/constants/theme';
import { useCrewManagementController } from '@/controllers/useCrewManagementController';
import { OwnerTabParamList } from '@/types/navigation';

export default function CrewScreen() {
  const crew = useCrewManagementController();
  const person = crew.selectedPerson;
  const route = useRoute<RouteProp<OwnerTabParamList, 'Crew'>>();
  const navigation = useNavigation();

  // Arriving from an Activity entry: open that person's sheet, then drop the param so it applies once.
  const focusPersonId = route.params?.personId;
  const { select } = crew;
  useEffect(() => {
    if (!focusPersonId) return;
    select(focusPersonId);
    navigation.setParams({ personId: undefined } as never);
  }, [focusPersonId, select, navigation]);

  if (!crew.loaded) return <LoadingView />;

  return (
    <ScreenContainer padded={false}>
      <ScreenTitle>Crew</ScreenTitle>
      <FlatList
        data={crew.crew}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <CrewListItem person={item} subtitle={crew.subtitleOf(item)} onPress={() => crew.select(item.id)} />
        )}
      />
      {person && (
        // Lifts the sheet (and its job-title field) above the keyboard. The
        // keyboard-controller version tracks the keyboard frame by frame, so
        // it also works with the app's edge-to-edge layout on Android.
        <KeyboardAvoidingView behavior="padding" style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <PersonDetailSheet
            person={person}
            onClose={() => crew.select(null)}
            onOpenMaps={() => crew.openInMaps(person)}
          >
            <CrewMemberActions
              person={person}
              isMe={crew.selectedIsMe}
              canChangeRole={crew.canChangeRole}
              saving={crew.saving}
              error={crew.error}
              onSaveJobTitle={jobTitle => crew.saveJobTitle(person, jobTitle)}
              onSetAppRole={appRole => crew.setAppRole(person, appRole)}
              onSetActive={active => crew.setActive(person, active)}
            />
          </PersonDetailSheet>
        </KeyboardAvoidingView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
});
