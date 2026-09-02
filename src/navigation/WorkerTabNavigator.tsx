import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';

import CameraScreen from '@/screens/worker/CameraScreen';
import HomeScreen from '@/screens/worker/HomeScreen';
import QueueScreen from '@/screens/worker/QueueScreen';
import { WorkerTabParamList } from '@/types/navigation';

const Tab = createBottomTabNavigator<WorkerTabParamList>();

export default function WorkerTabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Camera" component={CameraScreen} />
      <Tab.Screen name="MyPhotos" component={QueueScreen} options={{ title: 'Photos' }} />
    </Tab.Navigator>
  );
}
