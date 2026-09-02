import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';

import RootNavigator from '@/navigation/RootNavigator';

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <RootNavigator />
    </NavigationContainer>
  );
}
