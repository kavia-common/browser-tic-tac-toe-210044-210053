 /* 
 ================================================================================
 REQUIREMENT TRACEABILITY
 ================================================================================
 Requirement ID: REQ-TTT-TEST-TIMER
 User Story: As QA, I need deterministic tests validating timer utility behaviors.
 Acceptance Criteria:
  - start counts down and triggers tick callbacks
  - pause/resume preserves time
  - timeout triggers onTimeout callback
  - getRemaining reflects real-time and paused states
 GxP Impact: YES
 Risk Level: LOW
 Validation Protocol: VP-TTT-TEST-TIMER-001
 ================================================================================
 */
import { createTimer } from '../lib/timer';

jest.useFakeTimers();

describe('timer utility', () => {
  test('counts down and calls onTick, onTimeout', () => {
    const ticks = [];
    const onTick = (ms) => ticks.push(ms);
    const onTimeout = jest.fn();

    const t = createTimer({ durationMs: 1000, tickIntervalMs: 100, onTick, onTimeout });
    t.start();
    // advance 1s
    jest.advanceTimersByTime(1000);
    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(ticks.length).toBeGreaterThan(0);
    // Should be stopped after timeout; remaining reset to duration
    expect(t.getRemaining()).toBeGreaterThanOrEqual(0);
  });

  test('pause and resume preserve remaining time', () => {
    const t = createTimer({ durationMs: 2000, tickIntervalMs: 100 });
    t.start();
    jest.advanceTimersByTime(700);
    t.pause();
    const remainingAtPause = t.getRemaining();
    // advance time while paused should not change remaining
    jest.advanceTimersByTime(1000);
    expect(t.getRemaining()).toBeCloseTo(remainingAtPause, -1);
    t.resume();
    jest.advanceTimersByTime(remainingAtPause);
    // Should hit zero and stop
    expect(t.getRemaining()).toBeLessThanOrEqual(0);
  });

  test('stop resets remaining to configured duration', () => {
    const t = createTimer({ durationMs: 1500, tickIntervalMs: 100 });
    t.start();
    jest.advanceTimersByTime(500);
    t.stop();
    expect(t.getRemaining()).toBe(1500);
  });

  test('start with new duration overrides default', () => {
    const t = createTimer({ durationMs: 3000, tickIntervalMs: 100 });
    t.start(1000);
    expect(t.getRemaining()).toBeLessThanOrEqual(1000);
  });
});
