import { PersonProfile } from '@/types/domain';

/** Where a crew member is relative to the site, for the Home screen's crew card. */
export type CrewStatus = 'here' | 'paused' | 'noSignal' | 'away';

export interface CrewPresence {
  paused?: boolean;
  lastFixAt?: number;
}

export interface SiteCrewMember {
  id: string;
  name: string;
  role: string;
  color: string;
  avatar?: string;
  status: CrewStatus;
}

/** Checked in here = they have a live record for this site. Silent for too long = no signal. */
export function crewStatus(
  presence: CrewPresence | undefined,
  now: number,
  signalLostAfterMs: number
): CrewStatus {
  if (!presence) return 'away';
  if (presence.paused) return 'paused';
  if (presence.lastFixAt == null || now - presence.lastFixAt > signalLostAfterMs) return 'noSignal';
  return 'here';
}

const ORDER: Record<CrewStatus, number> = { here: 0, paused: 1, noSignal: 2, away: 3 };

/**
 * The people assigned to the site, minus me and anyone deactivated, each with
 * their live status. Sorted by who is actually here first, then by name.
 */
export function buildSiteCrew(
  assigned: PersonProfile[],
  presence: Record<string, CrewPresence>,
  myId: string,
  now: number,
  signalLostAfterMs: number
): SiteCrewMember[] {
  return assigned
    .filter(person => person.id !== myId && person.active !== false)
    .map(person => ({
      id: person.id,
      name: person.name,
      role: person.role,
      color: person.color,
      ...(person.avatar ? { avatar: person.avatar } : {}),
      status: crewStatus(presence[person.id], now, signalLostAfterMs),
    }))
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.name.localeCompare(b.name));
}

/** How many of the crew are actually on site with me right now. */
export const hereCount = (crew: SiteCrewMember[]) => crew.filter(member => member.status === 'here').length;
