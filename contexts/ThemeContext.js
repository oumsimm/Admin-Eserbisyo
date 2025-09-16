import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = 'theme_preference';

const ThemeContext = createContext({});

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') {
          setTheme(stored);
        } else {
          const sys = Appearance.getColorScheme();
          setTheme(sys === 'dark' ? 'dark' : 'light');
        }
      } catch {
        setTheme('light');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const toggleTheme = async () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try { await AsyncStorage.setItem(THEME_STORAGE_KEY, next); } catch {}
  };

  const value = useMemo(() => ({ theme, isDark: theme === 'dark', toggleTheme, loading }), [theme, loading]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};


