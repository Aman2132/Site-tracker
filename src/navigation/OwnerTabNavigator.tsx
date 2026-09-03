import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';

import AppTabBar from '@/components/common/AppTabBar';
import { colors, gradients } from '@/constants/theme';
import ActivityScreen from '@/screens/owner/ActivityScreen';
import CrewScreen from '@/screens/owner/CrewScreen';
import MapScreen from '@/screens/owner/MapScreen';
import PhotosScreen from '@/screens/owner/PhotosScreen';
import SitesScreen from '@/screens/owner/SitesScreen';
import { OwnerTabParamList } from '@/types/navigation';

const Tab = createBottomTabNavigator<OwnerTabParamList & { Activity: undefined }>();

const ICONS = {
  Map: 'map',
  Crew: 'people',
  Photos: 'images',
  Sites: 'location',
  Activity: 'pulse',
} as const;

export default function OwnerTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={props => (
        <AppTabBar
          {...props}
          icons={ICONS}
          accent={colors.primary}
          accentGradient={gradients.primaryRadiant}
        />
      )}
    >
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Crew" component={CrewScreen} />
      <Tab.Screen name="Photos" component={PhotosScreen} />
      <Tab.Screen name="Sites" component={SitesScreen} />
      <Tab.Screen name="Activity" component={ActivityScreen} />
    </Tab.Navigator>
  );
}
