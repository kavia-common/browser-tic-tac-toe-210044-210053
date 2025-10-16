/*
============================================================================
REQUIREMENT TRACEABILITY
============================================================================
Requirement ID: REQ-TTT-004
User Story: As a user, I can interact with a single board cell via mouse or keyboard.
Acceptance Criteria:
 - Button role with accessible name
 - Disabled state when move not allowed
 - Keyboard support (Enter/Space)
GxP Impact: NO
Risk Level: LOW
Validation Protocol: VP-TTT-UI-001
============================================================================
*/
import React from 'react';

/**
 * PUBLIC_INTERFACE
 * Cell
 * This is a public function component.
 * ----------------------------------------------------------------------------
 * Purpose: Render a single Tic Tac Toe cell.
 * Parameters:
 *  - value: '' | 'X' | 'O'
 *  - onClick: () => void
 *  - disabled: boolean
 *  - index: number for aria-label
 * Returns: JSX.Element
 */
export default function Cell({ value, onClick, disabled, index }) {
  const label = value ? `Cell ${index + 1}, ${value}` : `Cell ${index + 1}, empty`;
  return (
    <button
      type="button"
      role="button"
      aria-label={label}
      className={`cell${disabled ? ' disabled' : ''}`}
      onClick={onClick}
      disabled={disabled}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      data-testid={`cell-${index}`}
    >
      {value}
    </button>
  );
}
