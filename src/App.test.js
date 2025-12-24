import { render, screen } from '@testing-library/react';
import App from './App';

const mockSettings = {
  theme: 'light',
  font: 'Simplicity',
  weatherLocation: 'Princeton, US',
  quickLinks: [
    { title: 'Test Link', url: 'https://example.com', icon: 'test' }
  ]
};

test('renders quick links', () => {
  render(<App settings={mockSettings} />);
  const linkElement = screen.getByText(/Quick Links/i);
  expect(linkElement).toBeInTheDocument();
});
