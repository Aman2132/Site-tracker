import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';

import AppTabBar from '@/components/common/AppTabBar';
import { colors, gradients } from '@/constants/theme';
import CameraScreen from '@/screens/common/CameraScreen';
import ProfileScreen from '@/screens/common/ProfileScreen';
import ActivityScreen from '@/screens/owner/ActivityScreen';
import CrewScreen from '@/screens/owner/CrewScreen';
import MapScreen from '@/screens/owner/MapScreen';
import PhotosScreen from '@/screens/owner/PhotosScreen';
import { OwnerTabParamList } from '@/types/navigation';

const Tab = createBottomTabNavigator<OwnerTabParamList & { Activity: undefined }>();

const ICONS = {
  Map: 'map',
  Crew: 'people',
  Camera: 'camera',
  Photos: 'images',
  Activity: 'pulse',
  Profile: 'person-circle',
} as const;

export default function OwnerTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      // Back (the camera's close button, or the phone's back gesture) returns
      // to the tab you came from, not always the first one.
      backBehavior="history"
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
      {/* Full-screen viewfinder: the tab bar hides here, same as for workers. */}
      <Tab.Screen name="Camera" component={CameraScreen} options={{ tabBarStyle: { display: 'none' } }} />
      <Tab.Screen name="Photos" component={PhotosScreen} />
      <Tab.Screen name="Activity" component={ActivityScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
