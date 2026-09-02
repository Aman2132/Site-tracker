import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';

import ActivityScreen from '@/screens/owner/ActivityScreen';
import CrewScreen from '@/screens/owner/CrewScreen';
import MapScreen from '@/screens/owner/MapScreen';
import PhotosScreen from '@/screens/owner/PhotosScreen';
import SitesScreen from '@/screens/owner/SitesScreen';
import { OwnerTabParamList } from '@/types/navigation';

const Tab = createBottomTabNavigator<OwnerTabParamList & { Activity: undefined }>();

export default function OwnerTabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Crew" component={CrewScreen} />
      <Tab.Screen name="Photos" component={PhotosScreen} />
      <Tab.Screen name="Sites" component={SitesScreen} />
      <Tab.Screen name="Activity" component={ActivityScreen} />
    </Tab.Navigator>
  );
}
