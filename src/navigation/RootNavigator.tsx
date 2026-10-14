import React from 'react';

import OwnerTabNavigator from './OwnerTabNavigator';
import WorkerTabNavigator from './WorkerTabNavigator';

import LoadingView from '@/components/common/LoadingView';
import { useAuthSessionController } from '@/controllers/useAuthController';
import { useGpsWarmupController } from '@/controllers/useGpsWarmupController';
import LoginScreen from '@/screens/common/LoginScreen';
import { hasOwnerAccess } from '@/utils/roles';

/** Gated by real auth: signed out -> LoginScreen, else appRole decides the tab set. */
export default function RootNavigator() {
  const { profile, initializing } = useAuthSessionController();
  useGpsWarmupController(!!profile);

  if (initializing) return <LoadingView />;
  if (!profile) return <LoginScreen />;
  return hasOwnerAccess(profile.appRole) ? <OwnerTabNavigator /> : <WorkerTabNavigator />;
}
