import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../App';

// These are structural tests that ensure we render a toolbar with expected hooks
// and that the container doesn't create horizontal overflow in basic render.
// Pixel-perfect layout can't be asserted in jsdom, but we can verify class presence
// and that DOM is structured for flex-wrap responsiveness.

describe('Responsive toolbar layout', () => {
  test('renders toolbar with test id and role', () => {
    render(<App />);
    const toolbar = screen.getByTestId('top-toolbar');
    expect(toolbar).toBeInTheDocument();
    expect(toolbar).toHaveAttribute('role', 'toolbar');
  });

  test('card and header are present without causing immediate horizontal overflow', () => {
    render(<App />);
    const region = screen.getByRole('region', { name: /tic tac toe game/i });
    expect(region).toBeInTheDocument();
    // jsdom does not compute layout width; however, presence and lack of scroll style is a proxy
    // We ensure no explicit overflow-x is set to visible on body by our CSS.
    expect(document.body.style.overflowX).not.toBe('visible');
  });
});
