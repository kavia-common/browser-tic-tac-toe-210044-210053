/*
============================================================================
REQUIREMENT TRACEABILITY
============================================================================
Requirement ID: REQ-TTT-005
User Story: As a user, I can see and interact with the 3x3 board.
Acceptance Criteria:
 - Render 9 cells in 3x3 grid
 - Click and keyboard interaction delegated to parent
GxP Impact: NO
Risk Level: LOW
Validation Protocol: VP-TTT-UI-002
============================================================================
*/
import React from 'react';
import Cell from './Cell';

/**
 * PUBLIC_INTERFACE
 * Board
 * This is a public function component.
 * ----------------------------------------------------------------------------
 * Purpose: Render 3x3 Tic Tac Toe board with cells.
 * Parameters:
 *  - board: string[] length 9
 *  - onCellClick: (index:number) => void
 *  - disabled: boolean
 * Returns: JSX.Element
 */
export default function Board({ board, onCellClick, disabled }) {
  return (
    <div
      className="board"
      role="grid"
      aria-label="Tic Tac Toe board"
    >
      {board.map((v, i) => (
        <Cell
          key={i}
          value={v}
          index={i}
          disabled={disabled || !!v}
          onClick={() => onCellClick(i)}
        />
      ))}
    </div>
  );
}
