/*
============================================================================
REQUIREMENT TRACEABILITY
============================================================================
Requirement ID: REQ-TTT-000 (App shell)
User Story: As a user, I want to play Tic Tac Toe with clear status, restart, and accessibility.
Acceptance Criteria:
 - 3x3 board, alternating turns X/O
 - Win/draw detection
 - Restart button
 - Scoreboard preferred
 - A11y support with roles and focus
 - Audit trail for key events
GxP Impact: YES
Risk Level: LOW
Validation Protocol: VP-TTT-APP-001
============================================================================
*/
import React, { useEffect, useMemo, useRef, useState } from 'react';
import './index.css';
import './App.css';
import Board from './components/Board';
import Scoreboard from './components/Scoreboard';
import { checkWinner, isDraw, getNextPlayer, applyMove } from './lib/gameLogic';
import { createAuditLogger } from './lib/audit';
import { validateIndex, canUserPlay, validateSettings, validateTimerConfig, validateLocalPersistenceToggle } from './lib/validation';
import { computeAiMove } from './lib/ai';
import { createTimer } from './lib/timer';
import { getSessionId, loadScores, saveScores, clearScores, loadSettings, saveSettings } from './lib/storage';

function useAudit(sessionId) {
  // Create once with userId derived from session
  const audit = useMemo(
    () =>
      createAuditLogger({
        persist: false,
        getUserId: () => `session:${sessionId}`,
        getSessionId: () => sessionId,
      }),
    [sessionId]
  );
  // Ensure context can be refreshed dynamically if session evolves
  useEffect(() => {
    try {
      audit.setContext({
        getUserId: () => `session:${sessionId}`,
        getSessionId: () => sessionId,
      });
    } catch {
      // no-op
    }
  }, [audit, sessionId]);
  return audit;
}

// PUBLIC_INTERFACE
function App() {
  // Access control placeholder
  const [role, setRole] = useState('player'); // 'player' | 'observer'

  // Game state
  const [board, setBoard] = useState(Array(9).fill(''));
  const [score, setScore] = useState(() => loadScores());
  const [statusMsg, setStatusMsg] = useState('Welcome! X to move.');
  const [statusType, setStatusType] = useState('ok'); // ok | error
  const [persistAudit, setPersistAudit] = useState(false);
  const [persistScores, setPersistScores] = useState(true);
  const sessionId = useMemo(() => getSessionId(), []);
  const audit = useAudit(sessionId);

  // Settings state for PvP / PvAI
  const [mode, setMode] = useState('PvP'); // 'PvP' | 'PvAI'
  const [difficulty, setDifficulty] = useState('easy'); // ai difficulty
  const [aiSymbol, setAiSymbol] = useState('O'); // AI's symbol
  const [starting, setStarting] = useState('human'); // 'human' | 'ai'

  // Timer settings
  const [turnDuration, setTurnDuration] = useState(10000); // 10/20/30s
  const [timeoutBehavior, setTimeoutBehavior] = useState('skip-turn'); // 'auto-random-move' | 'skip-turn' | 'forfeit-round'

  // Load saved settings once
  useEffect(() => {
    const saved = loadSettings();
    if (saved && typeof saved === 'object') {
      try {
        if (saved.mode) setMode(saved.mode);
        if (saved.difficulty) setDifficulty(saved.difficulty);
        if (saved.aiSymbol) setAiSymbol(saved.aiSymbol);
        if (saved.starting) setStarting(saved.starting);
        if (Number.isFinite(saved.turnDuration)) setTurnDuration(saved.turnDuration);
        if (saved.timeoutBehavior) setTimeoutBehavior(saved.timeoutBehavior);
        if (typeof saved.persistScores === 'boolean') setPersistScores(saved.persistScores);
        audit.log({
          action: 'READ',
          eventType: 'settings_load',
          beforeState: {},
          afterState: saved,
          details: 'Loaded settings from localStorage',
        });
      } catch {
        // ignore invalid saved settings
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const timerRef = useRef(null);
  const totalDurationRef = useRef(turnDuration);
  const [remainingMs, setRemainingMs] = useState(turnDuration);

  // announce area for AI moves and timer
  const [liveMsg, setLiveMsg] = useState('');

  useEffect(() => {
    try {
      audit.setPersistence(persistAudit);
      audit.log({
        action: 'UPDATE',
        eventType: 'SETTINGS_CHANGE',
        beforeState: { persistAudit: !persistAudit },
        afterState: { persistAudit },
        details: 'Audit persistence toggled'
      });
    } catch {
      // noop
    }
  }, [persistAudit, audit]);

  // Persist selected settings for continuity
  useEffect(() => {
    const settings = { mode, difficulty, aiSymbol, starting, turnDuration, timeoutBehavior, persistScores };
    try {
      saveSettings(settings);
    } catch (err) {
      setStatusMsg('Could not save settings');
      setStatusType('error');
      audit.log({
        action: 'UPDATE',
        eventType: 'settings_save_error',
        beforeState: {},
        afterState: settings,
        details: err?.message || 'saveSettings failed'
      });
    }
  }, [mode, difficulty, aiSymbol, starting, turnDuration, timeoutBehavior, persistScores, audit]);

  const gameOver = (() => {
    const w = checkWinner(board);
    if (w.winner) return true;
    return isDraw(board);
  })();

  const nextPlayer = getNextPlayer(board);

  // Persist scores based on toggle
  useEffect(() => {
    if (persistScores) {
      try {
        saveScores(score);
      } catch (err) {
        setStatusMsg('Failed to save scores');
        setStatusType('error');
        audit.log({
          action: 'UPDATE',
          eventType: 'score_persist_error',
          beforeState: {},
          afterState: score,
          details: err?.message || 'saveScores failed'
        });
      }
    }
  }, [score, persistScores, audit]);

  // On toggle change, if disabled, clear persisted scores
  useEffect(() => {
    const before = { persistScores: !persistScores };
    try {
      const normalized = validateLocalPersistenceToggle(persistScores);
      if (!normalized) {
        clearScores();
      } else {
        saveScores(score);
      }
      audit.log({
        action: 'UPDATE',
        eventType: 'SETTINGS_CHANGE',
        beforeState: before,
        afterState: { persistScores: normalized },
        details: 'Persist scores toggle changed',
      });
    } catch (err) {
      setStatusMsg(err?.message || 'Invalid persistence toggle');
      setStatusType('error');
      audit.log({
        action: 'UPDATE',
        eventType: 'settings_change_error',
        beforeState: before,
        afterState: { persistScores },
        details: err?.message || 'toggle validation failed',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistScores]);

  // Initialize timer once
  if (!timerRef.current) {
    try {
      timerRef.current = createTimer({
        durationMs: turnDuration,
        tickIntervalMs: 250,
        onTick: (ms) => {
          setRemainingMs(ms);
          // Read-only TIMER_TICK with before/after snapshot
          try {
            audit.log({
              action: 'READ',
              eventType: 'TIMER_TICK',
              beforeState: { remainingMs: Math.min(ms + 250, totalDurationRef.current) },
              afterState: { remainingMs: ms },
              details: `Next: ${nextPlayer}`
            });
          } catch {
            // avoid noisy failures
          }
        },
        onTimeout: () => {
          // TIMEOUT handling based on configured behavior
          const before = board.slice();
          try {
            audit.log({
              action: 'UPDATE',
              eventType: 'TIMEOUT',
              beforeState: { board: before, player: nextPlayer, behavior: timeoutBehavior },
              afterState: { board: before, player: nextPlayer, behavior: timeoutBehavior },
              details: 'Turn timer elapsed'
            });
          } catch {}
          handleTimeoutAction();
        }
      });
    } catch (err) {
      setStatusMsg('Timer initialization error');
      setStatusType('error');
      try {
        audit.log({
          action: 'UPDATE',
          eventType: 'timer_init_error',
          beforeState: {},
          afterState: {},
          details: err?.message || 'createTimer failed'
        });
      } catch {}
    }
  }

  function startTurnTimer() {
    totalDurationRef.current = turnDuration;
    try {
      validateTimerConfig({ durationMs: turnDuration, behavior: timeoutBehavior });
      timerRef.current.start(turnDuration);
      setRemainingMs(turnDuration);
      setLiveMsg(`Timer started: ${Math.ceil(turnDuration / 1000)} seconds`);
    } catch (e) {
      // Shouldn't happen with validated durations, but avoid crashing
      setStatusMsg(e?.message || 'Timer error');
      setStatusType('error');
      audit.log({
        action: 'UPDATE',
        eventType: 'timer_start_error',
        beforeState: { durationMs: turnDuration },
        afterState: {},
        details: e?.message || 'timer start failed'
      });
    }
  }

  function stopTurnTimer() {
    if (timerRef.current) {
      timerRef.current.stop();
      setRemainingMs(totalDurationRef.current);
    }
  }

  function resetTurnTimer() {
    stopTurnTimer();
    startTurnTimer();
  }

  function handleTimeoutAction() {
    // If game already over, do nothing
    const { winner } = checkWinner(board);
    if (winner || isDraw(board)) {
      stopTurnTimer();
      return;
    }

    const current = nextPlayer; // player who timed out
    if (timeoutBehavior === 'skip-turn') {
      // Skip: no board change, just pass to other player by setting a no-op and letting effect update status
      setStatusMsg(`${current} timed out - turn skipped`);
      setStatusType('error');
      // Force timer restart for next player by invoking resetTurnTimer after state stabilizes
      setTimeout(() => resetTurnTimer(), 0);
      return;
    }

    if (timeoutBehavior === 'forfeit-round') {
      // Opponent gets the win immediately
      const opponent = current === 'X' ? 'O' : 'X';
      setStatusMsg(`${current} forfeited - ${opponent} wins`);
      setStatusType('ok');
      setScore((s) => {
        const next = { ...s, [opponent]: s[opponent] + 1 };
        audit.log({
          action: 'UPDATE',
          eventType: 'SCORE_UPDATE',
          beforeState: s,
          afterState: next,
          details: `Forfeit - ${opponent} awarded`,
        });
        return next;
      });
      stopTurnTimer();
      return;
    }

    if (timeoutBehavior === 'auto-random-move') {
      // Auto-play a random legal move for the current player
      const empties = board.map((v, i) => (v ? null : i)).filter((v) => v !== null);
      if (empties.length === 0) {
        stopTurnTimer();
        return;
      }
      const idx = empties[Math.floor(Math.random() * empties.length)];
      try {
        const before = board.slice();
        const newBoard = applyMove(board, idx, current);
        setBoard(newBoard);
        // After a move, timer restarts for next player
        setTimeout(() => resetTurnTimer(), 0);
        audit.log({
          action: 'UPDATE',
          eventType: 'cell_click',
          beforeState: before,
          afterState: newBoard,
          details: `Auto move due to timeout at ${idx}`
        });
      } catch (err) {
        setStatusMsg('Auto-move failed');
        setStatusType('error');
      }
    }
  }

  // Orchestrate AI move when applicable
  useEffect(() => {
    if (mode !== 'PvAI') return;
    // If it's AI's turn and game not over, compute AI move
    const { winner } = checkWinner(board);
    if (winner || isDraw(board)) return;
    if (nextPlayer !== aiSymbol) return;

    const before = board.slice();
    let computed;
    try {
      validateSettings({ mode, difficulty, aiSymbol, starting });
      computed = computeAiMove(board, difficulty, aiSymbol);
    } catch (err) {
      const message = err && err.message ? err.message : 'AI compute failed';
      setStatusMsg(message);
      setStatusType('error');
      audit.log({
        action: 'UPDATE',
        eventType: 'ai_compute_error',
        beforeState: { board: before, settings: { mode, difficulty, aiSymbol, starting } },
        afterState: { board: before },
        details: message
      });
      return;
    }
    const idx = computed.index;
    // Apply AI move by reusing handleCellClick path with try/catch to keep audit uniform
    try {
      // We bypass user role for AI; directly apply to board
      const currentPlayer = getNextPlayer(board);
      const newBoard = applyMove(board, idx, currentPlayer);
      setBoard(newBoard);
      setLiveMsg(`AI played ${currentPlayer} at cell ${idx + 1}`);
      const result = checkWinner(newBoard);
      if (result.winner) {
        setScore((s) => {
          const next = { ...s, [result.winner]: s[result.winner] + 1 };
          audit.log({
            action: 'UPDATE',
            eventType: 'SCORE_UPDATE',
            beforeState: s,
            afterState: next,
            details: `Increment ${result.winner} (AI)`,
          });
          return next;
        });
        audit.log({
          action: 'UPDATE',
          eventType: 'game_win',
          beforeState: before,
          afterState: newBoard,
          details: `Winner: ${result.winner} (AI move)`
        });
        stopTurnTimer();
      } else if (isDraw(newBoard)) {
        audit.log({
          action: 'UPDATE',
          eventType: 'game_draw',
          beforeState: before,
          afterState: newBoard
        });
        stopTurnTimer();
      } else {
        audit.log({
          action: 'UPDATE',
          eventType: 'cell_click',
          beforeState: before,
          afterState: newBoard,
          details: `AI move at ${idx}`
        });
        // After AI move, timer resets for human turn
        resetTurnTimer();
      }
    } catch (err) {
      const message = err && err.message ? err.message : 'AI move apply failed';
      setStatusMsg(message);
      setStatusType('error');
      audit.log({
        action: 'UPDATE',
        eventType: 'ai_apply_error',
        beforeState: { board: before, index: idx },
        afterState: { board },
        details: message
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, mode, difficulty, aiSymbol, starting]);

  useEffect(() => {
    document.title = 'Tic Tac Toe';
  }, []);

  // On settings change or reset, if PvAI and starting is AI and board empty and AI is X, let AI move
  useEffect(() => {
    if (mode !== 'PvAI') return;
    // AI should start if setting says so and board empty
    const empty = board.every(c => !c);
    if (!empty) return;
    if (starting !== 'ai') return;
    // If AI is X, nextPlayer will be X on empty board
    if (getNextPlayer(board) !== aiSymbol) return;
    // Force an AI move by setting board to trigger AI effect above
    // We simply rely on the AI orchestration effect; nothing else needed here.
    // Setting a no-op state to ensure effect runs; it's already dependent on board and settings.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, starting, aiSymbol]);

  useEffect(() => {
    // Update status based on state
    const { winner } = checkWinner(board);
    if (winner) {
      setStatusMsg(`Winner: ${winner}`);
      setStatusType('ok');
      stopTurnTimer();
    } else if (isDraw(board)) {
      setStatusMsg('Draw!');
      setStatusType('ok');
      stopTurnTimer();
    } else {
      setStatusMsg(`${nextPlayer} to move.`);
      setStatusType('ok');
      // Start/restart timer at each new turn
      resetTurnTimer();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, nextPlayer]);

  function toastError(message) {
    setStatusMsg(message);
    setStatusType('error');
    // technical error captured into audit as well
  }

  /**
   * PUBLIC_INTERFACE
   * handleCellClick
   * This is a public function.
   * ----------------------------------------------------------------------------
   * Purpose: Orchestrates a move with validation, audit, and error handling.
   */
  const handleCellClick = (index) => {
    try {
      if (!canUserPlay(role)) {
        toastError('Only players can make moves.');
        audit.log({
          action: 'READ',
          eventType: 'invalid_action',
          beforeState: { board, role },
          afterState: { board, role },
          details: 'Observer attempted to play'
        });
        return;
      }
      validateIndex(index);
      const currentPlayer = getNextPlayer(board);

      // In PvAI mode, prevent human from playing AI's symbol
      if (mode === 'PvAI' && currentPlayer === aiSymbol) {
        toastError('Wait for AI move');
        audit.log({
          action: 'READ',
          eventType: 'invalid_action',
          beforeState: { board, role, mode },
          afterState: { board, role, mode },
          details: 'Human attempted to move during AI turn'
        });
        return;
      }
      const before = board.slice();

      const newBoard = applyMove(board, index, currentPlayer);
      setBoard(newBoard);
      // Successful move: timer will reset on turn change effect

      const { winner } = checkWinner(newBoard);
      if (winner) {
        setScore((s) => {
          const next = { ...s, [winner]: s[winner] + 1 };
          audit.log({
            action: 'UPDATE',
            eventType: 'SCORE_UPDATE',
            beforeState: s,
            afterState: next,
            details: `Increment ${winner}`,
          });
          return next;
        });
        audit.log({
          action: 'UPDATE',
          eventType: 'game_win',
          beforeState: before,
          afterState: newBoard,
          details: `Winner: ${winner}`
        });
      } else if (isDraw(newBoard)) {
        audit.log({
          action: 'UPDATE',
          eventType: 'game_draw',
          beforeState: before,
          afterState: newBoard
        });
      } else {
        audit.log({
          action: 'UPDATE',
          eventType: 'cell_click',
          beforeState: before,
          afterState: newBoard
        });
      }
    } catch (err) {
      // Error handling with user-friendly message and technical audit
      const message = err && err.message ? err.message : 'Unknown error';
      toastError(message);
      audit.log({
        action: 'UPDATE',
        eventType: 'cell_click_error',
        beforeState: { board, index },
        afterState: { board },
        details: message
      });
    }
  };

  /**
   * PUBLIC_INTERFACE
   * resetGame
   * This is a public function.
   * ----------------------------------------------------------------------------
   * Purpose: Reset the board state while keeping scores.
   */
  const resetGame = () => {
    const before = board.slice();
    const after = Array(9).fill('');
    setBoard(after);
    setStatusType('ok');
    setStatusMsg('Game reset. X to move.');
    // Reset timer for a new round
    stopTurnTimer();
    setTimeout(() => resetTurnTimer(), 0);
    audit.log({
      action: 'UPDATE',
      eventType: 'game_reset',
      beforeState: before,
      afterState: after
    });
  };

  /**
   * PUBLIC_INTERFACE
   * resetAll
   * This is a public function.
   * ----------------------------------------------------------------------------
   * Purpose: Reset board and scores.
   */
  const resetAll = () => {
    const before = { board: board.slice(), score: { ...score } };
    setBoard(Array(9).fill(''));
    setScore({ X: 0, O: 0 });
    setStatusType('ok');
    setStatusMsg('All reset. X to move.');
    stopTurnTimer();
    setTimeout(() => resetTurnTimer(), 0);
    audit.log({
      action: 'UPDATE',
      eventType: 'game_reset_all',
      beforeState: before,
      afterState: { board: Array(9).fill(''), score: { X: 0, O: 0 } }
    });
  };

  return (
    <div className="app-shell">
      <div className="card" role="region" aria-label="Tic Tac Toe game">
        <div className="header">
          <div>
            <h1 className="title">Tic Tac Toe</h1>
            <p className="subtitle">Ocean Professional Theme</p>
          </div>
          <div className="toolbar" role="toolbar" aria-label="Game controls">
            <div className="audit-toggle">
              <input
                id="persist-audit"
                type="checkbox"
                checked={persistAudit}
                onChange={(e) => setPersistAudit(e.target.checked)}
              />
              <label htmlFor="persist-audit" title="Persist audit log in localStorage">
                Persist audit
              </label>
            </div>

            <div className="audit-toggle">
              <input
                id="persist-scores"
                type="checkbox"
                checked={persistScores}
                onChange={(e) => setPersistScores(e.target.checked)}
                data-testid="persist-scores-toggle"
              />
              <label htmlFor="persist-scores" title="Persist scores in localStorage">
                Persist scores
              </label>
            </div>

            <select
              aria-label="Mode selector"
              value={mode}
              onChange={(e) => {
                const next = e.target.value;
                try {
                  validateSettings({ mode: next, difficulty, aiSymbol, starting });
                  const before = { mode, difficulty, aiSymbol, starting };
                  setMode(next);
                  audit.log({
                    action: 'UPDATE',
                    eventType: 'settings_change',
                    beforeState: before,
                    afterState: { mode: next, difficulty, aiSymbol, starting }
                  });
                } catch (err) {
                  setStatusMsg(err.message || 'Invalid settings');
                  setStatusType('error');
                }
              }}
              className="btn ghost"
              data-testid="mode-select"
              title="Play mode"
            >
              <option value="PvP">PvP</option>
              <option value="PvAI">PvAI</option>
            </select>

            {mode === 'PvAI' && (
              <>
                <select
                  aria-label="AI difficulty"
                  value={difficulty}
                  onChange={(e) => {
                    const next = e.target.value;
                    const before = { mode, difficulty, aiSymbol, starting };
                    try {
                      validateSettings({ mode, difficulty: next, aiSymbol, starting });
                      setDifficulty(next);
                      audit.log({
                        action: 'UPDATE',
                        eventType: 'settings_change',
                        beforeState: before,
                        afterState: { mode, difficulty: next, aiSymbol, starting }
                      });
                    } catch (err) {
                      setStatusMsg(err.message || 'Invalid settings');
                      setStatusType('error');
                    }
                  }}
                  className="btn ghost"
                  data-testid="difficulty-select"
                  title="AI difficulty"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>

                <select
                  aria-label="AI symbol"
                  value={aiSymbol}
                  onChange={(e) => {
                    const next = e.target.value;
                    const before = { mode, difficulty, aiSymbol, starting };
                    try {
                      validateSettings({ mode, difficulty, aiSymbol: next, starting });
                      setAiSymbol(next);
                      audit.log({
                        action: 'UPDATE',
                        eventType: 'settings_change',
                        beforeState: before,
                        afterState: { mode, difficulty, aiSymbol: next, starting }
                      });
                    } catch (err) {
                      setStatusMsg(err.message || 'Invalid settings');
                      setStatusType('error');
                    }
                  }}
                  className="btn ghost"
                  data-testid="ai-symbol-select"
                  title="AI symbol"
                >
                  <option value="X">AI: X</option>
                  <option value="O">AI: O</option>
                </select>

                <select
                  aria-label="Who starts"
                  value={starting}
                  onChange={(e) => {
                    const next = e.target.value;
                    const before = { mode, difficulty, aiSymbol, starting };
                    try {
                      validateSettings({ mode, difficulty, aiSymbol, starting: next });
                      setStarting(next);
                      audit.log({
                        action: 'UPDATE',
                        eventType: 'settings_change',
                        beforeState: before,
                        afterState: { mode, difficulty, aiSymbol, starting: next }
                      });
                    } catch (err) {
                      setStatusMsg(err.message || 'Invalid settings');
                      setStatusType('error');
                    }
                  }}
                  className="btn ghost"
                  data-testid="starting-select"
                  title="Who starts"
                >
                  <option value="human">Human starts</option>
                  <option value="ai">AI starts</option>
                </select>
              </>
            )}

            <select
              aria-label="Turn timer duration"
              value={String(turnDuration)}
              onChange={(e) => {
                const dur = parseInt(e.target.value, 10);
                const before = turnDuration;
                try {
                  validateTimerConfig({ durationMs: dur, behavior: timeoutBehavior });
                  setTurnDuration(dur);
                  totalDurationRef.current = dur;
                  // Restart timer with new duration if game not over
                  const { winner } = checkWinner(board);
                  if (!winner && !isDraw(board)) {
                    resetTurnTimer();
                  }
                  audit.log({
                    action: 'UPDATE',
                    eventType: 'SETTINGS_CHANGE',
                    beforeState: { turnDuration: before },
                    afterState: { turnDuration: dur },
                    details: 'Timer duration change'
                  });
                } catch (err) {
                  setStatusMsg(err?.message || 'Invalid timer setting');
                  setStatusType('error');
                  audit.log({
                    action: 'UPDATE',
                    eventType: 'settings_change_error',
                    beforeState: { turnDuration: before },
                    afterState: { turnDuration: dur },
                    details: err?.message || 'timer validation failed'
                  });
                }
              }}
              className="btn ghost"
              data-testid="timer-duration-select"
              title="Turn timer duration"
            >
              <option value="10000">10s</option>
              <option value="20000">20s</option>
              <option value="30000">30s</option>
            </select>

            <select
              aria-label="Timeout behavior"
              value={timeoutBehavior}
              onChange={(e) => {
                const before = timeoutBehavior;
                const next = e.target.value;
                try {
                  validateTimerConfig({ durationMs: turnDuration, behavior: next });
                  setTimeoutBehavior(next);
                  audit.log({
                    action: 'UPDATE',
                    eventType: 'SETTINGS_CHANGE',
                    beforeState: { timeoutBehavior: before },
                    afterState: { timeoutBehavior: next },
                    details: 'Timeout behavior change'
                  });
                } catch (err) {
                  setStatusMsg(err?.message || 'Invalid timeout behavior');
                  setStatusType('error');
                  audit.log({
                    action: 'UPDATE',
                    eventType: 'settings_change_error',
                    beforeState: { timeoutBehavior: before },
                    afterState: { timeoutBehavior: next },
                    details: err?.message || 'timeout behavior validation failed'
                  });
                }
              }}
              className="btn ghost"
              data-testid="timeout-behavior-select"
              title="Action when time runs out"
            >
              <option value="auto-random-move">Auto random move</option>
              <option value="skip-turn">Skip turn</option>
              <option value="forfeit-round">Forfeit round</option>
            </select>

            <select
              aria-label="Role selector"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="btn ghost"
              data-testid="role-select"
            >
              <option value="player">Player</option>
              <option value="observer">Observer</option>
            </select>
            <button className="btn secondary" onClick={resetGame} aria-label="Reset game">
              Reset
            </button>
            <button className="btn" onClick={resetAll} aria-label="Reset board and scores">
              Reset All
            </button>
          </div>
        </div>

        <div className={`status ${statusType}`} role="status" aria-live="polite">
          {statusMsg}
        </div>

        <Scoreboard scoreX={score.X} scoreO={score.O} mode={mode} aiSymbol={aiSymbol} />

        {/* Timer progress bar */}
        <div className="timer-wrap" role="group" aria-label="Turn timer">
          <div
            className={`timer-bar ${remainingMs / (totalDurationRef.current || 1) <= 0.25 ? 'warn' : ''}`}
            style={{
              width: '100%',
              height: '10px',
              background: '#e5e7eb',
              borderRadius: '6px',
              overflow: 'hidden'
            }}
          >
            <div
              className="timer-fill"
              style={{
                width: `${Math.max(0, Math.min(100, (remainingMs / (totalDurationRef.current || 1)) * 100))}%`,
                height: '100%',
                background: 'var(--color-success)',
                transition: 'width .25s linear'
              }}
              aria-hidden="true"
            />
          </div>
          <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
            {`Time remaining: ${Math.ceil(remainingMs / 1000)} seconds`}
          </div>
        </div>

        <Board
          board={board}
          onCellClick={handleCellClick}
          disabled={gameOver}
        />

        {/* Screen reader announcements for AI actions */}
        <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
          {liveMsg}
        </div>

        <div className="footer">
          <div>Keyboard: <span className="kbd">Enter</span>/<span className="kbd">Space</span> to select a cell</div>
          <button
            className="btn ghost"
            aria-label="Clear audit log"
            onClick={() => {
              try {
                audit.clear();
                setStatusMsg('Audit log cleared');
                setStatusType('ok');
              } catch (err) {
                setStatusMsg('Failed to clear audit log');
                setStatusType('error');
              }
            }}
          >
            Clear Audit
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
