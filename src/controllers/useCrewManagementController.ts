import { useCallback, useMemo, useState } from 'react';

import { logEvent } from '@/api/eventsApi';
import { updatePersonProfile } from '@/api/peopleApi';
import { HAS_FIREBASE_CONFIG } from '@/constants/config';
import { useCrewTrackingController } from '@/controllers/useCrewTrackingController';
import { useAuthStore } from '@/store/useAuthStore';
import { Person, PersonProfileChanges, Role } from '@/types/domain';

/** Active people first, then alphabetical — deactivated ones collect at the bottom. */
function byActiveThenName(a: Person, b: Person): number {
  const aInactive = a.active === false ? 1 : 0;
  const bInactive = b.active === false ? 1 : 0;
  return aInactive - bInactive || a.name.localeCompare(b.name);
}

/**
 * Owner Crew screen: the roster, plus the owner's edits to it — job title,
 * worker/owner role, and deactivate/reactivate. Changes go straight to
 * Firestore; the roster subscription brings them back into the list, so
 * there's no local copy to keep in sync. Each change is also logged to the
 * Activity feed as an audit trail.
 */
export function useCrewManagementController() {
  const { people, loaded } = useCrewTrackingController();
  const myId = useAuthStore(state => state.profile?.id);
  const myName = useAuthStore(state => state.profile?.name);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const crew = useMemo(() => [...people].sort(byActiveThenName), [people]);
  // Looked up live, so the sheet shows each saved change as soon as it lands.
  const selectedPerson = crew.find(person => person.id === selectedId) ?? null;

  const select = useCallback((personId: string | null) => {
    setSelectedId(personId);
    setError(null);
  }, []);

  const apply = useCallback(
    async (person: Person, changes: PersonProfileChanges, auditText: string) => {
      if (!HAS_FIREBASE_CONFIG) {
        setError('Connect a Firebase project to manage the crew.');
        return;
      }
      setError(null);
      setSaving(true);
      try {
        await updatePersonProfile(person.id, changes);
        logEvent(`${myName ?? 'The owner'} ${auditText}`, 'info').catch(() => {});
      } catch {
        setError("Couldn't save that change. Check your connection and try again.");
      } finally {
        setSaving(false);
      }
    },
    [myName]
  );

  const saveJobTitle = useCallback(
    (person: Person, jobTitle: string) => {
      const role = jobTitle.trim();
      if (!role || role === person.role) return Promise.resolve();
      return apply(person, { role }, `changed ${person.name}'s job title to ${role}`);
    },
    [apply]
  );

  const setAppRole = useCallback(
    (person: Person, appRole: Role) =>
      apply(
        person,
        { appRole },
        appRole === 'owner' ? `made ${person.name} an owner` : `made ${person.name} a worker`
      ),
    [apply]
  );

  const setActive = useCallback(
    (person: Person, active: boolean) =>
      apply(person, { active }, `${active ? 'reactivated' : 'deactivated'} ${person.name}`),
    [apply]
  );

  return {
    crew,
    loaded,
    selectedPerson,
    /** The owner can't change their own role or deactivate themselves. */
    selectedIsMe: selectedPerson != null && selectedPerson.id === myId,
    select,
    saveJobTitle,
    setAppRole,
    setActive,
    saving,
    error,
  };
}
