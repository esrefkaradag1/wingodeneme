'use client';

import { createContext, useContext, type ReactNode } from 'react';

type LandingTheme = 'yks' | 'kpss';

const LandingThemeContext = createContext<LandingTheme>('yks');

export function LandingThemeProvider({
  theme,
  children,
}: {
  theme: LandingTheme;
  children: ReactNode;
}) {
  return (
    <LandingThemeContext.Provider value={theme}>
      <div data-landing-theme={theme} className="min-h-screen">
        {children}
      </div>
    </LandingThemeContext.Provider>
  );
}

export function useLandingTheme(): LandingTheme {
  return useContext(LandingThemeContext);
}

export function useKpssLanding(): boolean {
  return useContext(LandingThemeContext) === 'kpss';
}
