 /**
  ================================================================================
  REQUIREMENT TRACEABILITY
  ================================================================================
  Requirement ID: REQ-TTT-TEST-STORAGE
  User Story: As QA, I need tests verifying storage helpers work and are resilient.
  Acceptance Criteria:
   - sessionId persists in sessionStorage
   - safe reads/writes handle JSON, missing keys, and errors
   - load/save scores roundtrip with defaults
  GxP Impact: YES
  Risk Level: LOW
  Validation Protocol: VP-TTT-TEST-STORAGE-001
  ================================================================================
  */
 import {
   getSessionId,
   safeLocalRead,
   safeLocalWrite,
   safeLocalRemove,
   loadScores,
   saveScores,
 } from '../lib/storage';

 describe('storage helpers', () => {
   beforeEach(() => {
     window.localStorage.clear();
     window.sessionStorage.clear();
   });

   test('getSessionId creates and reuses a session id', () => {
     const id1 = getSessionId();
     expect(typeof id1).toBe('string');
     const id2 = getSessionId();
     expect(id2).toBe(id1);
   });

   test('safeLocalWrite and safeLocalRead roundtrip', () => {
     const ok = safeLocalWrite('k', { a: 1 });
     expect(ok).toBe(true);
     const v = safeLocalRead('k', null);
     expect(v).toEqual({ a: 1 });
   });

   test('safeLocalRead returns fallback for missing or invalid JSON', () => {
     const fb = { x: 1 };
     expect(safeLocalRead('missing', fb)).toBe(fb);
     window.localStorage.setItem('bad', '{bad json');
     expect(safeLocalRead('bad', fb)).toBe(fb);
   });

   test('safeLocalRemove removes key', () => {
     safeLocalWrite('k', { a: 1 });
     expect(safeLocalRead('k', null)).toEqual({ a: 1 });
     const removed = safeLocalRemove('k');
     expect(removed).toBe(true);
     expect(safeLocalRead('k', null)).toBe(null);
   });

   test('loadScores returns defaults and saveScores persists', () => {
     const def = loadScores();
     expect(def).toEqual({ X: 0, O: 0 });
     saveScores({ X: 2, O: 3 });
     const again = loadScores();
     expect(again).toEqual({ X: 2, O: 3 });
   });
 });
