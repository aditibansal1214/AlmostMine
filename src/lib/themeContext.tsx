import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './authContext';

type ThemeMode = 'light' | 'dark' | 'system';
type TextSize = 'small' | 'medium' | 'large';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  isDark: boolean;
  highContrast: boolean;
  setHighContrast: (val: boolean) => void;
  reducedMotion: boolean;
  setReducedMotion: (val: boolean) => void;
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userPrivate, updateUserPrivate } = useAuth();

  const [theme, setThemeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem('almostmine_theme') as ThemeMode) || 'system';
  });

  const [highContrast, setHighContrastState] = useState<boolean>(() => {
    return localStorage.getItem('almostmine_high_contrast') === 'true';
  });

  const [reducedMotion, setReducedMotionState] = useState<boolean>(() => {
    return localStorage.getItem('almostmine_reduced_motion') === 'true';
  });

  const [textSize, setTextSizeState] = useState<TextSize>(() => {
    return (localStorage.getItem('almostmine_text_size') as TextSize) || 'medium';
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('almostmine_theme');
    if (stored === 'dark') return true;
    if (stored === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Sync from userPrivate settings if available
  useEffect(() => {
    if (userPrivate?.settings) {
      const s = userPrivate.settings;
      if (s.theme && s.theme !== theme) setThemeState(s.theme);
      if (s.accessibility) {
        if (s.accessibility.highContrast !== highContrast) setHighContrastState(s.accessibility.highContrast);
        if (s.accessibility.reducedMotion !== reducedMotion) setReducedMotionState(s.accessibility.reducedMotion);
        if (s.accessibility.textSize && s.accessibility.textSize !== textSize) setTextSizeState(s.accessibility.textSize);
      }
    }
  }, [userPrivate]);

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      let activeDark = false;
      if (theme === 'dark') {
        activeDark = true;
      } else if (theme === 'light') {
        activeDark = false;
      } else {
        activeDark = mediaQuery.matches;
      }

      setIsDark(activeDark);
      if (activeDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();
    localStorage.setItem('almostmine_theme', theme);

    const listener = () => {
      if (theme === 'system') applyTheme();
    };
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    localStorage.setItem('almostmine_high_contrast', String(highContrast));
  }, [highContrast]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-text-size', textSize);
    localStorage.setItem('almostmine_text_size', textSize);
  }, [textSize]);

  useEffect(() => {
    localStorage.setItem('almostmine_reduced_motion', String(reducedMotion));
  }, [reducedMotion]);

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    if (userPrivate) {
      updateUserPrivate({
        settings: {
          ...userPrivate.settings,
          theme: mode,
        },
      });
    }
  };

  const setHighContrast = (val: boolean) => {
    setHighContrastState(val);
    if (userPrivate) {
      updateUserPrivate({
        settings: {
          ...userPrivate.settings,
          accessibility: {
            ...userPrivate.settings.accessibility,
            highContrast: val,
          },
        },
      });
    }
  };

  const setReducedMotion = (val: boolean) => {
    setReducedMotionState(val);
    if (userPrivate) {
      updateUserPrivate({
        settings: {
          ...userPrivate.settings,
          accessibility: {
            ...userPrivate.settings.accessibility,
            reducedMotion: val,
          },
        },
      });
    }
  };

  const setTextSize = (size: TextSize) => {
    setTextSizeState(size);
    if (userPrivate) {
      updateUserPrivate({
        settings: {
          ...userPrivate.settings,
          accessibility: {
            ...userPrivate.settings.accessibility,
            textSize: size,
          },
        },
      });
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        isDark,
        highContrast,
        setHighContrast,
        reducedMotion,
        setReducedMotion,
        textSize,
        setTextSize,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
