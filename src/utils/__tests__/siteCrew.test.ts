import { PersonProfile } from '@/types/domain';
import { buildSiteCrew, crewStatus, hereCount } from '@/utils/siteCrew';

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
