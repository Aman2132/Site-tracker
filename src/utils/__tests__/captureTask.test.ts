import { cleanTask, rememberTask } from '@/utils/captureTask';

describe('cleanTask', () => {
  it('trims, collapses whitespace and caps the length', () => {
    expect(cleanTask('  Column   grid  L4 ', 60, 'General')).toBe('Column grid L4');
    expect(cleanTask('abcdefghij', 5, 'General')).toBe('abcde');
  });

  it('falls back when blank', () => {
    expect(cleanTask('   ', 60, 'General')).toBe('General');
  });
});

describe('rememberTask', () => {
  it('puts the task first without repeating it, ignoring case', () => {
    expect(rememberTask(['A', 'B', 'C'], 'b', 5)).toEqual(['b', 'A', 'C']);
  });

  it('keeps only the most recent few', () => {
    expect(rememberTask(['1', '2', '3'], '4', 3)).toEqual(['4', '1', '2']);
  });
});
