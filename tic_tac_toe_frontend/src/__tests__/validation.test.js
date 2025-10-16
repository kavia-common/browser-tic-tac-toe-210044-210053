 /*
 ================================================================================
 REQUIREMENT TRACEABILITY
 ================================================================================
 Requirement ID: REQ-TTT-TEST-VALIDATION
 User Story: As QA, I need to validate that helper functions enforce constraints.
 Acceptance Criteria:
  - validateIndex: range and type checks
  - canUserPlay: only 'player' allowed
  - validateSettings: positive/negative paths for PvP/PvAI
  - validateTimerConfig: accepts positive durations and known behaviors, rejects invalid
  - validateLocalPersistenceToggle: normalization of booleans and string variants; errors on others
 GxP Impact: YES
 Risk Level: LOW
 Validation Protocol: VP-TTT-TEST-VALIDATION-001
 ================================================================================
 */
import {
  validateIndex,
  canUserPlay,
  validateSettings,
  validateTimerConfig,
  validateLocalPersistenceToggle,
} from '../lib/validation';

describe('validation helpers', () => {
  describe('validateIndex', () => {
    test('accepts 0..8', () => {
      for (let i = 0; i <= 8; i++) {
        expect(() => validateIndex(i)).not.toThrow();
      }
    });
    test('rejects out of range and non-integers', () => {
      expect(() => validateIndex(-1)).toThrow(/bounds|index/i);
      expect(() => validateIndex(9)).toThrow(/bounds|index/i);
      expect(() => validateIndex(1.2)).toThrow(/invalid/i);
      expect(() => validateIndex('1')).toThrow(/invalid/i);
      expect(() => validateIndex(NaN)).toThrow(/invalid/i);
    });
  });

  describe('canUserPlay', () => {
    test('player can play', () => {
      expect(canUserPlay('player')).toBe(true);
    });
    test('observer cannot play', () => {
      expect(canUserPlay('observer')).toBe(false);
    });
  });

  describe('validateSettings', () => {
    test('PvP minimal passes', () => {
      expect(() => validateSettings({ mode: 'PvP' })).not.toThrow();
    });
    test('PvAI valid passes', () => {
      expect(() =>
        validateSettings({ mode: 'PvAI', difficulty: 'hard', aiSymbol: 'X', starting: 'ai' })
      ).not.toThrow();
    });
    test('invalid mode', () => {
      expect(() => validateSettings({ mode: 'BAD' })).toThrow(/mode/i);
    });
    test('PvAI requires valid difficulty, aiSymbol, starting', () => {
      expect(() =>
        validateSettings({ mode: 'PvAI', difficulty: 'nope', aiSymbol: 'X', starting: 'ai' })
      ).toThrow(/difficulty/i);
      expect(() =>
        validateSettings({ mode: 'PvAI', difficulty: 'easy', aiSymbol: 'Z', starting: 'ai' })
      ).toThrow(/symbol/i);
      expect(() =>
        validateSettings({ mode: 'PvAI', difficulty: 'easy', aiSymbol: 'X', starting: 'who' })
      ).toThrow(/starting/i);
    });
  });

  describe('validateTimerConfig', () => {
    test('accepts positive numbers and known behaviors', () => {
      expect(() => validateTimerConfig({ durationMs: 1000, behavior: 'skip-turn' })).not.toThrow();
      expect(() => validateTimerConfig({ durationMs: '2000', behavior: 'forfeit-round' })).not.toThrow();
      expect(() => validateTimerConfig({ durationMs: 5000, behavior: 'auto-random-move' })).not.toThrow();
      // Behavior optional
      expect(() => validateTimerConfig({ durationMs: 3000 })).not.toThrow();
    });
    test('rejects invalid durations and behaviors', () => {
      expect(() => validateTimerConfig({ durationMs: 0, behavior: 'skip-turn' })).toThrow(/duration/i);
      expect(() => validateTimerConfig({ durationMs: -1 })).toThrow(/duration/i);
      expect(() => validateTimerConfig({ durationMs: 'abc' })).toThrow(/duration/i);
      expect(() => validateTimerConfig({ durationMs: 1000, behavior: 'unknown' })).toThrow(/behavior/i);
    });
  });

  describe('validateLocalPersistenceToggle', () => {
    test('normalizes booleans and string forms', () => {
      expect(validateLocalPersistenceToggle(true)).toBe(true);
      expect(validateLocalPersistenceToggle(false)).toBe(false);
      expect(validateLocalPersistenceToggle('true')).toBe(true);
      expect(validateLocalPersistenceToggle('1')).toBe(true);
      expect(validateLocalPersistenceToggle('false')).toBe(false);
      expect(validateLocalPersistenceToggle('0')).toBe(false);
    });
    test('rejects unexpected values', () => {
      expect(() => validateLocalPersistenceToggle('yes')).toThrow(/toggle/i);
      expect(() => validateLocalPersistenceToggle(1)).toThrow(/toggle/i);
      expect(() => validateLocalPersistenceToggle(null)).toThrow(/toggle/i);
      expect(() => validateLocalPersistenceToggle(undefined)).toThrow(/toggle/i);
    });
  });
});
