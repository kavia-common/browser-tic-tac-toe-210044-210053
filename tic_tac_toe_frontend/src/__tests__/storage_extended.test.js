 /**
  ================================================================================
  REQUIREMENT TRACEABILITY
  ================================================================================
  Requirement ID: REQ-TTT-TEST-STORAGE-EXT
  User Story: As QA, I need storage helpers to handle corrupt data and settings roundtrip.
  Acceptance Criteria:
   - loadScores handles wrong shapes gracefully
   - saveSettings/loadSettings roundtrip
   - sessionId looks UUID-like (basic pattern)
  GxP Impact: YES
  Risk Level: LOW
  Validation Protocol: VP-TTT-TEST-STORAGE-002
  ================================================================================
  */
import {
  getSessionId,
  loadScores,
  saveScores,
  loadSettings,
  saveSettings,
} from '../lib/storage';

describe('storage extended', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  test('loadScores coerces wrong shapes to defaults', () => {
    window.localStorage.setItem('ttt_scores', JSON.stringify({ X: 'bad', O: 5 }));
    const s = loadScores();
    expect(s).toEqual({ X: 0, O: 5 });
    window.localStorage.setItem('ttt_scores', JSON.stringify(null));
    expect(loadScores()).toEqual({ X: 0, O: 0 });
    window.localStorage.setItem('ttt_scores', '{not json');
    expect(loadScores()).toEqual({ X: 0, O: 0 });
  });

  test('settings persist and load', () => {
    const settings = { mode: 'PvAI', difficulty: 'hard', aiSymbol: 'X', starting: 'ai', turnDuration: 10000, timeoutBehavior: 'skip-turn', persistScores: true };
    expect(saveSettings(settings)).toBe(true);
    const loaded = loadSettings();
    expect(loaded).toMatchObject(settings);
  });

  test('session id format is UUID-like', () => {
    const id = getSessionId();
    expect(id).toMatch(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
  });
});
