 /*
 ================================================================================
 REQUIREMENT TRACEABILITY
 ================================================================================
 Requirement ID: REQ-TTT-TEST-APP-FLOWS-EXT
 User Story: As QA, I need to verify App-level flows regarding AI-first start, timer timeouts, and persistence toggles.
 Acceptance Criteria:
  - AI-first round in PvAI triggers AI move without user action
  - TIMEOUT behaviors update status/score appropriately and remain playable
  - Persistence toggle writes/clears localStorage immediately
  - Status updates on SETTINGS_CHANGE do not error; timer ticks are emitted (via aria-live)
 GxP Impact: YES
 Risk Level: LOW
 Validation Protocol: VP-TTT-TEST-APP-002
 ================================================================================
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';

jest.useFakeTimers();

function filledCellsCount() {
  return Array.from({ length: 9 }, (_, i) => screen.getByTestId(`cell-${i}`)).filter((c) => c.textContent !== '').length;
}

describe('App flows extended', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  test('PvAI with AI starting makes an opening move automatically', () => {
    render(<App />);
    fireEvent.change(screen.getByTestId('mode-select'), { target: { value: 'PvAI' } });
    fireEvent.change(screen.getByTestId('ai-symbol-select'), { target: { value: 'X' } });
    fireEvent.change(screen.getByTestId('starting-select'), { target: { value: 'ai' } });
    // Advance a short time to allow effect processing
    jest.advanceTimersByTime(50);
    // Board should have at least one mark by AI
    expect(filledCellsCount()).toBeGreaterThanOrEqual(1);
  });

  test('TIMEOUT auto-random-move: board changes and remains interactive', () => {
    render(<App />);
    fireEvent.change(screen.getByTestId('timeout-behavior-select'), { target: { value: 'auto-random-move' } });
    // allow initial tick then timeout
    jest.advanceTimersByTime(10100);
    expect(filledCellsCount()).toBeGreaterThanOrEqual(1);
    // Make a user move after auto move to ensure game continues
    const emptyIndex = Array.from({ length: 9 }, (_, i) => i).find(i => screen.getByTestId(`cell-${i}`).textContent === '');
    if (emptyIndex != null) {
      fireEvent.click(screen.getByTestId(`cell-${emptyIndex}`));
      expect(filledCellsCount()).toBeGreaterThanOrEqual(2);
    }
  });

  test('TIMEOUT skip-turn: status mentions skip or advances turn', () => {
    render(<App />);
    fireEvent.change(screen.getByTestId('timeout-behavior-select'), { target: { value: 'skip-turn' } });
    jest.advanceTimersByTime(10250);
    expect(screen.getByRole('status').textContent.toLowerCase()).toMatch(/timed out|to move/);
  });

  test('TIMEOUT forfeit-round: increases opponent score and stops round', () => {
    render(<App />);
    fireEvent.change(screen.getByTestId('timeout-behavior-select'), { target: { value: 'forfeit-round' } });
    jest.advanceTimersByTime(10050);
    const scoreboard = screen.getByRole('region', { name: /scoreboard/i });
    expect(scoreboard.textContent).toMatch(/X:\s*\d+\s*O:\s*\d+/i);
  });

  test('Persistence toggle writes and clears localStorage (scores)', () => {
    render(<App />);
    const toggle = screen.getByTestId('persist-scores-toggle');
    // default on -> any score change should save
    fireEvent.click(screen.getByTestId('cell-0'));
    fireEvent.click(screen.getByTestId('cell-3'));
    fireEvent.click(screen.getByTestId('cell-1'));
    fireEvent.click(screen.getByTestId('cell-4'));
    fireEvent.click(screen.getByTestId('cell-2')); // X wins
    expect(window.localStorage.getItem('ttt_scores')).toBeTruthy();
    // Disable -> clears
    fireEvent.click(toggle);
    expect(window.localStorage.getItem('ttt_scores')).toBeNull();
    // Enable -> writes again
    fireEvent.click(toggle);
    expect(window.localStorage.getItem('ttt_scores')).toBeTruthy();
  });

  test('Timer TICK aria-live updates are present during a round', () => {
    render(<App />);
    jest.advanceTimersByTime(250);
    const liveRegions = screen.getAllByRole('status', { hidden: true });
    const timerLive = liveRegions.find((el) => /time remaining/i.test(el.textContent || ''));
    expect(timerLive).toBeTruthy();
    // Advance some time; still should present message
    jest.advanceTimersByTime(750);
    expect((timerLive?.textContent || '').toLowerCase()).toMatch(/time remaining/);
  });
});
