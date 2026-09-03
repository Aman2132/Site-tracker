import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';

import AppTabBar from '@/components/common/AppTabBar';
import { colors, gradients } from '@/constants/theme';
import CameraScreen from '@/screens/worker/CameraScreen';
import HomeScreen from '@/screens/worker/HomeScreen';
import QueueScreen from '@/screens/worker/QueueScreen';
import { WorkerTabParamList } from '@/types/navigation';

const Tab = createBottomTabNavigator<WorkerTabParamList>();

const ICONS = {
  Home: 'home',
  Camera: 'camera',
  MyPhotos: 'images',
} as const;

export default function WorkerTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={props => (
        <AppTabBar {...props} icons={ICONS} accent={colors.worker} accentGradient={gradients.worker} />
      )}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Camera" component={CameraScreen} options={{ tabBarStyle: { display: 'none' } }} />
      <Tab.Screen name="MyPhotos" component={QueueScreen} options={{ title: 'Photos' }} />
    </Tab.Navigator>
  );
}
