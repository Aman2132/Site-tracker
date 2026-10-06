import React from 'react';

import OwnerTabNavigator from './OwnerTabNavigator';
import WorkerTabNavigator from './WorkerTabNavigator';

import LoadingView from '@/components/common/LoadingView';
import { useAuthSessionController } from '@/controllers/useAuthController';
import LoginScreen from '@/screens/common/LoginScreen';

/** Gated by real auth: signed out -> LoginScreen, else appRole decides the tab set. */
export default function RootNavigator() {
  const { profile, initializing } = useAuthSessionController();

  if (initializing) return <LoadingView />;
  if (!profile) return <LoginScreen />;
  return profile.appRole === 'owner' ? <OwnerTabNavigator /> : <WorkerTabNavigator />;
}
