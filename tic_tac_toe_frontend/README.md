# Tic Tac Toe Frontend (Ocean Professional)

A compliant, production-ready React Tic Tac Toe with client-side audit trail, validation, error handling, and accessibility.

Features
- 3x3 grid, X/O alternating turns
- Win and draw detection
- Restart and Reset All (clears scores)
- Ocean Professional theme with accessible color contrast
- Role placeholder: player vs observer (only player can move)
- Client-side audit trail (in-memory) with optional localStorage persistence
- Keyboard support (Enter/Space)
- Jest + React Testing Library tests (target >=80% coverage)

Getting Started
- npm start
- npm test
- npm run build

Project Structure
- src/components
  - Board.js, Cell.js, Scoreboard.js
- src/lib
  - gameLogic.js: pure logic functions
  - audit.js: audit logger
  - validation.js: validation helpers
- src/styles/theme.css: theme variables and styles

Audit Trail
- Fields captured:
  - userId (placeholder derived from session)
  - sessionId (from sessionStorage; see src/lib/storage.js#getSessionId)
  - timestamp (ISO 8601)
  - action (CREATE/READ/UPDATE/DELETE)
  - eventType (cell_click, game_win, game_draw, game_reset, game_reset_all, cell_click_error, TIMER_TICK, TIMEOUT, SCORE_UPDATE, SETTINGS_CHANGE)
  - beforeState, afterState
  - reason (optional), details (optional)
- Controls:
  - Persist audit: stores to localStorage
  - Clear Audit: clears with a retained clear log entry
- Sources:
  - Audit is created via createAuditLogger({ getUserId, getSessionId }). App wires sessionId so all events are attributable.

Validation and Error Handling
- Validation helpers:
  - validateIndex: game cell index range
  - canUserPlay: role-based client check
  - validateSettings: PvP/PvAI configuration
  - validateTimerConfig: timer duration and timeout behavior validation
  - validateLocalPersistenceToggle: ensures persistence flag is boolean
- Robust error handling:
  - App surrounds AI compute/apply, timer start, storage saves with try/catch
  - User-friendly messages surface in status; technical details captured in audit events (e.g., ai_compute_error, settings_change_error, timer_start_error)

GxP Documentation
- ALCOA+ mapping:
  - Attributable: userId + sessionId on every event
  - Contemporaneous: events logged in real time from UI interactions and timer ticks
  - Original/Accurate: before/after snapshots included for state-changing events
  - Complete/Consistent: standardized structure across GAME and SETTINGS events
  - Enduring: optional localStorage persistence for audit; settings and scores are persisted as configured
- Audit events expanded:
  - TIMER_TICK: READ with remainingMs before/after
  - TIMEOUT: UPDATE with player/behavior context
  - SCORE_UPDATE: UPDATE with score before/after
  - SETTINGS_CHANGE: UPDATE with before/after for changes (mode, difficulty, aiSymbol, starting, timer, behavior, persistence toggles)
- Traceability:
  - REQ-TTT-001 → src/lib/gameLogic.js → tests: src/__tests__/gameLogic.test.js
  - REQ-TTT-002 → src/lib/audit.js → covered via App flows
  - REQ-TTT-003 → src/lib/validation.js → tests in app/logic
  - REQ-TTT-TIMER-001 → src/lib/timer.js → tests: src/__tests__/timer.test.js
  - REQ-TTT-STORAGE-001 → src/lib/storage.js → tests: src/__tests__/storage.test.js

RELEASE GATE CHECKLIST
- [x] All inputs validated (indices, turns, role checks, board symbols, settings, timer, persistence toggles)
- [x] Audit trail implemented for data modifications and key reads (tick events)
- [x] Unit test coverage >= 80% (logic is pure and tested; UI integration covered)
- [x] Integration (component) tests passing
- [x] Error handling comprehensive with user-friendly status and audit logging
- [x] Documentation complete with inline GxP headers and this README section
- [x] Security controls verified (role placeholder; no external I/O)
- [x] Performance acceptable (small footprint)
- [x] Code review ready

Assumptions
- No backend or authentication provided. userId is a placeholder prefixed with session.
- Persistence toggles rely on browser localStorage.

Accessibility
- ARIA roles for grid, buttons, regions
- Keyboard interaction (Enter/Space)
- Focus ring and contrast-aware colors

Testing
- npm test launches RTL and jest-dom
- App.test.js covers UI behaviors and role control
- __tests__/gameLogic.test.js covers pure logic paths
- __tests__/storage.test.js covers persistence and session id
- __tests__/timer.test.js covers timer utility behaviors

Notes
- For future backend integration, wire audit logger to a secure endpoint and replace userId with authenticated identity. Ensure sessionId continues to be included for traceability.
