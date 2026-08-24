import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',

      toggleTheme: () => {
        const newTheme = get().theme === 'light' ? 'dark' : 'light';
        set({ theme: newTheme });
        document.documentElement.setAttribute('data-theme', newTheme);
      },
    }),
    {
      name: 'notely-theme',
      onRehydrateStorage: (state) => {
        if (state?.theme) {
          document.documentElement.setAttribute('data-theme', state.theme);
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          document.documentElement.setAttribute('data-theme', 'dark');
        }
      },
    }
  )
);

if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('notely-theme');
  const theme = stored ? JSON.parse(stored).state.theme : null;

  if (theme) {
    document.documentElement.setAttribute('data-theme', theme);
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
}
