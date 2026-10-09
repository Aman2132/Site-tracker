import { PersonProfile } from '@/types/domain';
import { buildSiteCrew, crewStatus, hereCount, myPosition } from '@/utils/siteCrew';

const NOW = 1_000_000_000;
const MIN = 60_000;
const LOST = 15 * MIN;

const person = (id: string, name: string, extra: Partial<PersonProfile> = {}): PersonProfile => ({
  id,
  name,
  role: 'Mason',
  color: '#123456',
  appRole: 'worker',
  ...extra,
});

describe('crewStatus', () => {
  it('is here with a fresh fix, paused when paused, no signal when silent, away when not checked in', () => {
    expect(crewStatus({ lastFixAt: NOW - MIN }, NOW, LOST)).toBe('here');
    expect(crewStatus({ lastFixAt: NOW - MIN, paused: true }, NOW, LOST)).toBe('paused');
    expect(crewStatus({ lastFixAt: NOW - 20 * MIN }, NOW, LOST)).toBe('noSignal');
    expect(crewStatus({}, NOW, LOST)).toBe('noSignal');
    expect(crewStatus(undefined, NOW, LOST)).toBe('away');
  });
});

describe('buildSiteCrew', () => {
  const assigned = [
    person('me', 'Me'),
    person('b', 'Bina'),
    person('a', 'Arun'),
    person('c', 'Chitra'),
    person('x', 'Gone', { active: false }),
  ];
  const presence = {
    a: { lastFixAt: NOW - MIN },
    c: { lastFixAt: NOW - MIN, paused: true },
    me: { lastFixAt: NOW },
  };

  it('leaves out me and deactivated people', () => {
    const ids = buildSiteCrew(assigned, presence, 'me', NOW, LOST).map(m => m.id);
    expect(ids).not.toContain('me');
    expect(ids).not.toContain('x');
  });

  it('puts whoever is here first, then paused, then the rest, by name', () => {
    const crew = buildSiteCrew(assigned, presence, 'me', NOW, LOST);
    expect(crew.map(m => [m.name, m.status])).toEqual([
      ['Arun', 'here'],
      ['Chitra', 'paused'],
      ['Bina', 'away'],
    ]);
    expect(hereCount(crew)).toBe(1);
  });
});

describe('crew positions for the site map', () => {
  const assigned = [
    person('me', 'Me'),
    person('a', 'Arun'),
    person('c', 'Chitra'),
    person('d', 'Dev'),
    person('e', 'Esha'),
  ];
  const presence = {
    a: { lastFixAt: NOW - MIN, lat: 27.7, lng: 85.3 },
    c: { lastFixAt: NOW - MIN, lat: 27.71, lng: 85.31, paused: true },
    d: { lastFixAt: NOW - 20 * MIN, lat: 27.72, lng: 85.32 },
    e: { lastFixAt: NOW - MIN, lat: 0, lng: 0 },
    me: { lastFixAt: NOW, lat: 27.69, lng: 85.29 },
  };
  const byId = Object.fromEntries(buildSiteCrew(assigned, presence, 'me', NOW, LOST).map(m => [m.id, m]));

  it('shows here and no-signal people where they last were, never someone on a break', () => {
    expect(byId.a.position).toEqual({ lat: 27.7, lng: 85.3, lastFixAt: NOW - MIN });
    expect(byId.d.position?.lat).toBe(27.72);
    expect(byId.c.position).toBeUndefined();
  });
  it('ignores an unset 0,0 position and finds my own', () => {
    expect(byId.e.position).toBeUndefined();
    expect(myPosition(presence, 'me')).toEqual({ lat: 27.69, lng: 85.29, lastFixAt: NOW });
    expect(myPosition(presence, 'nobody')).toBeUndefined();
  });
});
