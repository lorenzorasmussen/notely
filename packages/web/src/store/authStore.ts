import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
}

async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (email: string, password: string) => {
        const { user, token } = await apiRequest<{ user: User; token: string }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });

        set({ user, token, isAuthenticated: true, isLoading: false });
      },

      register: async (email: string, password: string) => {
        const { user, token } = await apiRequest<{ user: User; token: string }>('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });

        set({ user, token, isAuthenticated: true, isLoading: false });
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },

      checkAuth: async () => {
        const { token } = get();

        if (!token) {
          set({ isLoading: false });
          return;
        }

        try {
          const { user } = await apiRequest<{ user: User }>('/auth/me', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          set({ user, isAuthenticated: true, isLoading: false });
        } catch {
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        }
      },
    }),
    {
      name: 'notely-auth',
      partialize: (state) => ({ token: state.token }),
    }
  )
);
