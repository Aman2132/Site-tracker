import React from 'react';

import OwnerTabNavigator from './OwnerTabNavigator';
import WorkerTabNavigator from './WorkerTabNavigator';

import { useRoleStore } from '@/store/useRoleStore';

/** Role decides the whole tab set. See DevRoleSwitchButton for how role changes today. */
export default function RootNavigator() {
  const role = useRoleStore(state => state.role);
  return role === 'owner' ? <OwnerTabNavigator /> : <WorkerTabNavigator />;
}
