import { InventoryEntry } from '@/types/domain';
import {
  draftProblem,
  formatPack,
  formatQuantity,
  isUsedUp,
  itemSuggestions,
  lastUnitFor,
  linkableEntries,
  mergeInventory,
  packTotal,
  parseQuantity,
  remainingQuantity,
  usageProblem,
  usedShare,
} from '@/utils/inventory';

const LIMITS = { maxNameChars: 80, maxUnitChars: 20, maxNoteChars: 300, maxQuantity: 1_000_000 };

const entry = (id: string, name: string, unit: string, receivedAt: number): InventoryEntry => ({
  id,
  personId: 'p1',
  personName: 'Ram',
  siteId: 's1',
  name,
  quantity: 1,
  unit,
  receivedAt,
});

describe('parseQuantity', () => {
  it('reads whole numbers, decimals and a decimal comma', () => {
    expect(parseQuantity('12')).toBe(12);
    expect(parseQuantity(' 2.5 ')).toBe(2.5);
    expect(parseQuantity('2,5')).toBe(2.5);
    expect(parseQuantity('.5')).toBe(0.5);
  });
  it('rejects zero, negatives, words and empty', () => {
    for (const bad of ['0', '-3', 'ten', '', '1.2.3', '5 bags']) expect(parseQuantity(bad)).toBeNull();
  });
});

describe('formatQuantity', () => {
  it('drops float noise', () => {
    expect(formatQuantity(0.1 + 0.2)).toBe('0.3');
    expect(formatQuantity(40)).toBe('40');
  });
});

describe('draftProblem', () => {
  const ok = { siteId: 's1', name: 'Cement', quantity: 40, unit: 'bags' };
  it('accepts a complete draft', () => expect(draftProblem(ok, LIMITS)).toBeNull());
  it('names the first missing piece', () => {
    expect(draftProblem({ ...ok, siteId: '' }, LIMITS)).toMatch(/site/);
    expect(draftProblem({ ...ok, name: '   ' }, LIMITS)).toMatch(/received/);
    expect(draftProblem({ ...ok, quantity: 0 }, LIMITS)).toMatch(/how many/);
    expect(draftProblem({ ...ok, quantity: 5_000_000 }, LIMITS)).toMatch(/too large/);
    expect(draftProblem({ ...ok, unit: '' }, LIMITS)).toMatch(/unit/);
    expect(draftProblem({ ...ok, note: 'x'.repeat(301) }, LIMITS)).toMatch(/Note/);
  });
});

describe('itemSuggestions', () => {
  const history = [
    entry('1', 'Cement', 'kg', 1),
    entry('2', 'cement ', 'bags', 3),
    entry('3', 'Rebar 12mm', 'pcs', 2),
    entry('4', 'White cement', 'bags', 4),
  ];
  it('lists each item once, most recent first, with its latest unit', () => {
    expect(itemSuggestions(history, '', 5)).toEqual([
      { name: 'White cement', unit: 'bags' },
      { name: 'cement ', unit: 'bags' },
      { name: 'Rebar 12mm', unit: 'pcs' },
    ]);
  });
  it('puts names that start with the text before names that only contain it', () => {
    expect(itemSuggestions(history, 'cem', 5).map(s => s.name)).toEqual(['cement ', 'White cement']);
  });
  it('leaves out what is already typed exactly', () => {
    expect(itemSuggestions(history, 'Cement', 5).map(s => s.name)).toEqual(['White cement']);
  });
});

describe('lastUnitFor', () => {
  it('ignores case and spacing and takes the newest', () => {
    const history = [entry('1', 'Cement', 'kg', 1), entry('2', ' cement', 'bags', 3)];
    expect(lastUnitFor(history, 'CEMENT')).toBe('bags');
    expect(lastUnitFor(history, 'Sand')).toBeUndefined();
  });
});

describe('mergeInventory', () => {
  it('prefers the server copy and marks phone-only entries pending, newest first', () => {
    const server = [entry('a', 'Sand', 'tonne', 1)];
    const outbox = [entry('a', 'Sand', 'tonne', 1), entry('b', 'Brick', 'pcs', 2)];
    const merged = mergeInventory(server, outbox);
    expect(merged.map(e => [e.id, !!e.pending])).toEqual([
      ['b', true],
      ['a', false],
    ]);
  });
});

describe('remainingQuantity and usageProblem', () => {
  const delivered = { ...entry('u', 'Cement', 'bags', 1), quantity: 40, usedQuantity: 15 };
  it('subtracts what was used, never below zero', () => {
    expect(remainingQuantity(delivered)).toBe(25);
    expect(remainingQuantity({ ...delivered, usedQuantity: 50 })).toBe(0);
    expect(remainingQuantity(entry('n', 'Sand', 'tonne', 1))).toBe(1);
  });
  it('accepts up to what is left and rejects more, zero or a long note', () => {
    expect(usageProblem(delivered, 25, '', 300)).toBeNull();
    expect(usageProblem(delivered, 26, '', 300)).toMatch(/Only 25 bags left/);
    expect(usageProblem(delivered, 0, '', 300)).toMatch(/above 0/);
    expect(usageProblem(delivered, 1, 'x'.repeat(301), 300)).toMatch(/Note/);
  });
});

describe('linkableEntries', () => {
  it("offers only the person's own synced entries at the photo's site, newest first", () => {
    const list: InventoryEntry[] = [
      { ...entry('1', 'Cement', 'bags', 1), siteId: 's1' },
      { ...entry('2', 'Sand', 'tonne', 3), siteId: 's1' },
      { ...entry('3', 'Brick', 'pcs', 2), siteId: 's2' },
      { ...entry('4', 'Rebar', 'pcs', 4), siteId: 's1', personId: 'other' },
      { ...entry('5', 'Pipe', 'm', 5), siteId: 's1', pending: true },
      { ...entry('6', 'Tile', 'box', 6), siteId: 's1', usedQuantity: 1 },
    ];
    expect(linkableEntries(list, 'p1', 's1').map(e => e.id)).toEqual(['2', '1']);
    expect(linkableEntries(list, 'p1', undefined).map(e => e.id)).toEqual(['2', '3', '1']);
  });
});

describe('packs and used-up', () => {
  const base = { siteId: 's1', name: 'Wire', unit: 'm' };
  it('accepts pieces whose total matches, and rejects a mismatch or a half-filled pack', () => {
    expect(draftProblem({ ...base, quantity: 25, packCount: 5, packSize: 5 }, LIMITS)).toBeNull();
    expect(draftProblem({ ...base, quantity: 0.3, packCount: 3, packSize: 0.1 }, LIMITS)).toBeNull();
    expect(draftProblem({ ...base, quantity: 20, packCount: 5, packSize: 5 }, LIMITS)).toMatch(/match/);
    expect(draftProblem({ ...base, quantity: 25, packCount: 5 }, LIMITS)).toMatch(/pieces/);
  });
  it('formats packs and knows when everything is used', () => {
    const wire = { ...entry('w', 'Wire', 'm', 1), quantity: 25, packCount: 5, packSize: 5 };
    expect(formatPack(wire)).toBe('5 × 5 m');
    expect(formatPack(entry('x', 'Sand', 'tonne', 1))).toBeNull();
    expect(packTotal(3, 0.1)).toBe(0.3);
    expect(isUsedUp({ ...wire, usedQuantity: 25 })).toBe(true);
    expect(isUsedUp({ ...wire, usedQuantity: 24.5 })).toBe(false);
    expect(usedShare({ ...wire, usedQuantity: 10 })).toBe(0.4);
  });
});
