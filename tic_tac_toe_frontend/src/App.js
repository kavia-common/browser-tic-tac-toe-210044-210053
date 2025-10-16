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
import { validateIndex, canUserPlay } from './lib/validation';

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

  useEffect(() => {
    audit.setPersistence(persistAudit);
  }, [persistAudit, audit]);

  const gameOver = (() => {
    const w = checkWinner(board);
    if (w.winner) return true;
    return isDraw(board);
  })();

  const nextPlayer = getNextPlayer(board);

  useEffect(() => {
    document.title = 'Tic Tac Toe';
  }, []);

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
    setBoard(Array(9).fill(''));
    setStatusType('ok');
    setStatusMsg('Game reset. X to move.');
    audit.log({
      action: 'UPDATE',
      eventType: 'game_reset',
      beforeState: before,
      afterState: Array(9).fill('')
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
