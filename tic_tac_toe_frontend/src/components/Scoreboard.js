/*
============================================================================
REQUIREMENT TRACEABILITY
============================================================================
Requirement ID: REQ-TTT-006
User Story: As a user, I want to see current scores for X and O.
Acceptance Criteria:
 - Display X and O scores
 - Reset does not clear scoreboard unless resetAll true
GxP Impact: NO
Risk Level: LOW
Validation Protocol: VP-TTT-UI-003
============================================================================
*/
import React from 'react';

/**
 * PUBLIC_INTERFACE
 * Scoreboard
 * This is a public function component.
 * ----------------------------------------------------------------------------
 * Purpose: Display score counts for X and O.
 * Parameters:
 *  - scoreX: number
 *  - scoreO: number
 * Returns: JSX.Element
 */
export default function Scoreboard({ scoreX, scoreO, mode = 'PvP', aiSymbol = 'O' }) {
  /**
   * Extend scoreboard to display mode context:
   *  - PvP: Show X/O scores.
   *  - PvAI: Show "You vs AI" perspective (assumes human is the opposite of aiSymbol
   *    at any given time; over many rounds human may be X or O. We still show X/O but
   *    add a small context note).
   */
  const context =
    mode === 'PvAI'
      ? `VS AI (${aiSymbol})`
      : 'PvP';
  return (
    <div className="scoreboard" role="region" aria-label="Scoreboard">
      <div className="score" aria-label={`X score ${scoreX}`}>X: {scoreX}</div>
      <div className="score" aria-label={`O score ${scoreO}`}>O: {scoreO}</div>
      <div className="score" aria-label="mode context" style={{ fontWeight: 600, fontSize: 12 }}>
        {context}
      </div>
    </div>
  );
}
