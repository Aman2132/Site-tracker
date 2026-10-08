import { InventoryEntry } from '@/types/domain';
import {
  draftProblem,
  formatQuantity,
  itemSuggestions,
  lastUnitFor,
  mergeInventory,
  parseQuantity,
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
