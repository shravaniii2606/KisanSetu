import { render, screen } from '@testing-library/react';
import App from './App';

test('renders government dashboard heading', () => {
  render(<App />);
  const heading = screen.getByText(/government dashboard/i);
  expect(heading).toBeInTheDocument();
});
