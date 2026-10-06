import { ACTIVITY_RECOGNITION } from '@/constants/config';
import { RecognizedActivity } from '@/types/domain';
import { activityFromSpeed, resolveActivity } from '@/utils/activity';

describe('activityFromSpeed', () => {
  it('treats a missing speed as still', () => {
    expect(activityFromSpeed(null)).toBe('still');
    expect(activityFromSpeed(undefined)).toBe('still');
  });

  it('treats the sentinel negative speed some devices report as still', () => {
    expect(activityFromSpeed(-1)).toBe('still');
  });

  it('classifies by the configured thresholds', () => {
    expect(activityFromSpeed(0)).toBe('still');
    expect(activityFromSpeed(1)).toBe('walk');
    expect(activityFromSpeed(10)).toBe('vehicle');
  });

  it('treats each threshold as exclusive, so a boundary speed stays in the lower band', () => {
    // Thresholds are `>`, not `>=` — 0.3 is still, 2.5 is walk.
    expect(activityFromSpeed(0.3)).toBe('still');
    expect(activityFromSpeed(0.31)).toBe('walk');
    expect(activityFromSpeed(2.5)).toBe('walk');
    expect(activityFromSpeed(2.51)).toBe('vehicle');
  });
});

describe('resolveActivity', () => {
  const now = 1_700_000_000_000;
  const reading = (overrides: Partial<RecognizedActivity>): RecognizedActivity => ({
    kind: 'vehicle',
    confidence: 90,
    at: now,
    ...overrides,
  });

  it('trusts a fresh, confident OS reading over GPS speed', () => {
    // Slow traffic: walking pace by GPS, but the phone knows it's in a vehicle.
    expect(resolveActivity(reading({ kind: 'vehicle' }), 1.2, now)).toBe('vehicle');
    // Standing at a bus stop with GPS drift reporting movement.
    expect(resolveActivity(reading({ kind: 'still' }), 1.2, now)).toBe('still');
  });

  it('falls back to speed when there is no reading', () => {
    expect(resolveActivity(null, 10, now)).toBe('vehicle');
  });

  it('falls back to speed when the reading is not confident enough', () => {
    const unsure = reading({ kind: 'vehicle', confidence: ACTIVITY_RECOGNITION.minConfidence - 1 });
    expect(resolveActivity(unsure, 1, now)).toBe('walk');
  });

  it('accepts a reading exactly at the confidence bar', () => {
    const atBar = reading({ kind: 'vehicle', confidence: ACTIVITY_RECOGNITION.minConfidence });
    expect(resolveActivity(atBar, 1, now)).toBe('vehicle');
  });

  it('falls back to speed when the reading is too old to describe now', () => {
    const old = reading({ kind: 'vehicle', at: now - ACTIVITY_RECOGNITION.maxAgeMs - 1 });
    expect(resolveActivity(old, 1, now)).toBe('walk');
  });
});
