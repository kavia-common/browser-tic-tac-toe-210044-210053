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
import React, { useEffect, useMemo, useState } from 'react';
import './index.css';
import './App.css';
import Board from './components/Board';
import Scoreboard from './components/Scoreboard';
import { checkWinner, isDraw, getNextPlayer, applyMove } from './lib/gameLogic';
import { createAuditLogger } from './lib/audit';
import { validateIndex, canUserPlay, validateSettings } from './lib/validation';
import { computeAiMove } from './lib/ai';

function useAudit() {
  // Create once
  const audit = useMemo(() => createAuditLogger({ persist: false }), []);
  return audit;
}

// PUBLIC_INTERFACE
function App() {
  // Access control placeholder
  const [role, setRole] = useState('player'); // 'player' | 'observer'

  // Game state
  const [board, setBoard] = useState(Array(9).fill(''));
  const [score, setScore] = useState({ X: 0, O: 0 });
  const [statusMsg, setStatusMsg] = useState('Welcome! X to move.');
  const [statusType, setStatusType] = useState('ok'); // ok | error
  const [persistAudit, setPersistAudit] = useState(false);
  const audit = useAudit();

  // Settings state for PvP / PvAI
  const [mode, setMode] = useState('PvP'); // 'PvP' | 'PvAI'
  const [difficulty, setDifficulty] = useState('easy'); // ai difficulty
  const [aiSymbol, setAiSymbol] = useState('O'); // AI's symbol
  const [starting, setStarting] = useState('human'); // 'human' | 'ai'

  // announce area for AI moves
  const [liveMsg, setLiveMsg] = useState('');

  useEffect(() => {
    audit.setPersistence(persistAudit);
  }, [persistAudit, audit]);

  const gameOver = (() => {
    const w = checkWinner(board);
    if (w.winner) return true;
    return isDraw(board);
  })();

  const nextPlayer = getNextPlayer(board);

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
        setScore((s) => ({ ...s, [result.winner]: s[result.winner] + 1 }));
        audit.log({
          action: 'UPDATE',
          eventType: 'game_win',
          beforeState: before,
          afterState: newBoard,
          details: `Winner: ${result.winner} (AI move)`
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
          afterState: newBoard,
          details: `AI move at ${idx}`
        });
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
    } else if (isDraw(board)) {
      setStatusMsg('Draw!');
      setStatusType('ok');
    } else {
      setStatusMsg(`${nextPlayer} to move.`);
      setStatusType('ok');
    }
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

      const { winner } = checkWinner(newBoard);
      if (winner) {
        setScore((s) => ({ ...s, [winner]: s[winner] + 1 }));
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

        <Scoreboard scoreX={score.X} scoreO={score.O} />

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
              audit.clear();
              setStatusMsg('Audit log cleared');
              setStatusType('ok');
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
