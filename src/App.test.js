import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Quick Links header', () => {
  // Mock localStorage
  const localStorageMock = (function() {
    let store = {};
    return {
      getItem: function(key) {
        return store[key] || null;
      },
      setItem: function(key, value) {
        store[key] = value.toString();
      },
      clear: function() {
        store = {};
      },
      removeItem: function(key) {
        delete store[key];
      }
    };
  })();
  Object.defineProperty(window, 'localStorage', { value: localStorageMock });

  const dummySettings = {
      quickLinks: [],
      weatherLocation: "Princeton, US"
  };

  render(<App settings={dummySettings} />);
  // Use getAllByText and take the first one, or be more specific
  const linkElements = screen.getAllByText(/Quick Links/i);
  expect(linkElements[0]).toBeInTheDocument();
});
