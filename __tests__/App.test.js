import React from 'react';
import { render } from '@testing-library/react-native';
import App from '../App';

// Mock the Firebase configuration
jest.mock('../config/firebaseConfig', () => ({
  auth: {},
  db: {},
  app: {}
}));

// Mock the UserContext
jest.mock('../contexts/UserContext', () => ({
  UserProvider: ({ children }) => children,
  useUser: () => ({
    user: null,
    userData: null,
    loading: false,
    error: null
  })
}));

// Mock the ThemeContext
jest.mock('../contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }) => children,
  useTheme: () => ({
    theme: 'light',
    toggleTheme: jest.fn()
  })
}));

// Mock the onboarding service
jest.mock('../services/onboardingService', () => ({
  hasCompletedOnboarding: jest.fn().mockResolvedValue(true)
}));

describe('App Component', () => {
  it('renders without crashing', () => {
    const { getByText } = render(<App />);
    expect(getByText('Initializing E-SERBISYO...')).toBeTruthy();
  });

  it('shows loading state initially', () => {
    const { getByText } = render(<App />);
    expect(getByText('Initializing E-SERBISYO...')).toBeTruthy();
  });
});
