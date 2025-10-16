/*
============================================================================
REQUIREMENT TRACEABILITY
============================================================================
Requirement ID: REQ-TTT-TEST-LOGIC
User Story: As a QA, I need deterministic tests for game logic.
Acceptance Criteria:
 - X wins and O wins detection
 - Draw detection
 - Move application with validations
 - Turn alternation
 - Board validation errors
GxP Impact: YES
Risk Level: LOW
Validation Protocol: VP-TTT-TEST-LOGIC-001
============================================================================
*/
import { checkWinner, isDraw, getNextPlayer, applyMove, validateBoard } from '../lib/gameLogic';

describe('gameLogic', () => {
  test('checkWinner identifies row winner', () => {
    const board = ['X', 'X', 'X', '', '', '', '', '', ''];
    const res = checkWinner(board);
    expect(res.winner).toBe('X');
    expect(res.line).toEqual([0,1,2]);
  });

  test('checkWinner identifies diagonal winner O', () => {
    const board = ['O', '', '', '', 'O', '', '', '', 'O'];
    const res = checkWinner(board);
    expect(res.winner).toBe('O');
    expect(res.line).toEqual([0,4,8]);
  });

  test('isDraw identifies draw correctly', () => {
    const board = [
      'X','O','X',
      'X','X','O',
      'O','X','O'
    ];
    expect(isDraw(board)).toBe(true);
  });

  test('getNextPlayer alternates between X and O', () => {
    expect(getNextPlayer(Array(9).fill(''))).toBe('X');
    const board = ['X','','','','','','','',''];
    expect(getNextPlayer(board)).toBe('O');
  });

  test('applyMove validates index bounds', () => {
    const board = Array(9).fill('');
    expect(() => applyMove(board, -1, 'X')).toThrow(/bounds/);
    expect(() => applyMove(board, 9, 'X')).toThrow(/bounds/);
  });

  test('applyMove rejects wrong player order', () => {
    const board = Array(9).fill('');
    expect(() => applyMove(board, 0, 'O')).toThrow(/expected X/i);
  });

  test('applyMove rejects occupied cell', () => {
    const board = ['X','','','','','','','',''];
    expect(() => applyMove(board, 0, 'O')).toThrow(/occupied/i);
  });

  test('validateBoard errors on invalid board', () => {
    expect(() => validateBoard([])).toThrow(/length 9/);
    expect(() => validateBoard([1,2,3,4,5,6,7,8,9])).toThrow(/invalid symbol/);
  });

  test('applyMove returns new board and checkWinner after', () => {
    let board = Array(9).fill('');
    board = applyMove(board, 0, 'X');
    board = applyMove(board, 4, 'O');
    board = applyMove(board, 1, 'X');
    board = applyMove(board, 5, 'O');
    board = applyMove(board, 2, 'X'); // X wins
    const res = checkWinner(board);
    expect(res.winner).toBe('X');
  });
});
