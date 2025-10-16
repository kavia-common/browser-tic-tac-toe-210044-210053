 /*
 ============================================================================
 REQUIREMENT TRACEABILITY
 ============================================================================
 Requirement ID: REQ-TTT-TEST-AI
 User Story: As QA, I need tests verifying AI move computation validity.
 Acceptance Criteria:
  - AI returns legal moves.
  - Hard mode blocks imminent threats and takes winning moves.
  - Errors handled gracefully (fallback move still legal).
 GxP Impact: YES
 Risk Level: MEDIUM
 Validation Protocol: VP-TTT-TEST-AI-001
 ============================================================================
 */
import { computeAiMove } from '../lib/ai';
import { applyMove } from '../lib/gameLogic';

describe('AI Engine', () => {
  test('easy returns legal move on empty board (AI X)', () => {
    const board = Array(9).fill('');
    const res = computeAiMove(board, 'easy', 'X');
    expect(res.index).toBeGreaterThanOrEqual(0);
    expect(res.index).toBeLessThan(9);
    expect(board[res.index]).toBe('');
  });

  test('hard takes winning move if available', () => {
    // X is AI; board where X can win at index 2
    // X X _ / O O _ / _ _ _
    const board = ['X', 'X', '', 'O', 'O', '', '', '', ''];
    const res = computeAiMove(board, 'hard', 'X');
    expect(res.index).toBe(2);
  });

  test('hard blocks opponent immediate win', () => {
    // O is opponent, X AI. Opponent O can win at index 2 if not blocked:
    // O O _ / _ X _ / _ _ X
    const board = ['O', 'O', '', '', 'X', '', '', '', 'X'];
    const res = computeAiMove(board, 'hard', 'X');
    expect(res.index).toBe(2);
  });

  test('medium returns a legal move', () => {
    const board = ['X','','','','','','','',''];
    const res = computeAiMove(board, 'medium', 'O');
    expect([0,1,2,3,4,5,6,7,8]).toContain(res.index);
    expect(board[res.index]).toBe('');
  });

  test('apply returned move yields valid board', () => {
    const board = Array(9).fill('');
    const res = computeAiMove(board, 'hard', 'X');
    const newBoard = applyMove(board, res.index, 'X');
    expect(newBoard[res.index]).toBe('X');
  });
});
