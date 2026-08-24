import { create } from 'zustand';

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  pinned: boolean;
  tags: Tag[];
  createdAt: number;
  updatedAt: number;
}

export interface Tag {
  id: string;
  userId: string;
  name: string;
  createdAt: number;
}

interface NotesState {
  notes: Note[];
  tags: Tag[];
  isLoading: boolean;
  activeNoteId: string | null;
  searchQuery: string;
  activeTag: string | null;
  fetchNotes: () => Promise<void>;
  fetchTags: () => Promise<void>;
  createNote: () => Promise<Note>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  setActiveNote: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setActiveTag: (tag: string | null) => void;
  exportNotes: () => Promise<void>;
  importNotes: (file: File) => Promise<number>;
}

async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const { useAuthStore } = await import('./authStore');
  const token = useAuthStore.getState().token;

  const res = await fetch(`/api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  tags: [],
  isLoading: false,
  activeNoteId: null,
  searchQuery: '',
  activeTag: null,

  fetchNotes: async () => {
    set({ isLoading: true });
    try {
      const { useAuthStore } = await import('./authStore');
      const token = useAuthStore.getState().token;
      const { searchQuery, activeTag } = get();

      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (activeTag) params.set('tag', activeTag);

      const notes = await apiRequest<Note[]>(`/notes?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      set({ notes, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch notes:', error);
      set({ isLoading: false });
    }
  },

  fetchTags: async () => {
    try {
      const { useAuthStore } = await import('./authStore');
      const token = useAuthStore.getState().token;
      const tags = await apiRequest<Tag[]>('/notes/tags', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      set({ tags });
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  },

  createNote: async () => {
    const { useAuthStore } = await import('./authStore');
    const token = useAuthStore.getState().token;
    const note = await apiRequest<Note>('/notes', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });

    set((state) => ({
      notes: [note, ...state.notes],
      activeNoteId: note.id,
    }));

    return note;
  },

  updateNote: async (id: string, updates: Partial<Note>) => {
    const { useAuthStore } = await import('./authStore');
    const token = useAuthStore.getState().token;

    await apiRequest<Note>(`/notes/${id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    set((state) => ({
      notes: state.notes.map((note) =>
        note.id === id ? { ...note, ...updates, updatedAt: Date.now() } : note
      ),
    }));
  },

  deleteNote: async (id: string) => {
    const { useAuthStore } = await import('./authStore');
    const token = useAuthStore.getState().token;

    await apiRequest(`/notes/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    set((state) => ({
      notes: state.notes.filter((note) => note.id !== id),
      activeNoteId: state.activeNoteId === id ? null : state.activeNoteId,
    }));
  },

  setActiveNote: (id) => set({ activeNoteId: id }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setActiveTag: (tag) => set({ activeTag: tag }),

  exportNotes: async () => {
    const { useAuthStore } = await import('./authStore');
    const token = useAuthStore.getState().token;

    const res = await fetch('/api/notes/export', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error('Export failed');

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notely-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importNotes: async (file: File) => {
    const { useAuthStore } = await import('./authStore');
    const token = useAuthStore.getState().token;

    const content = await file.text();
    const notes = JSON.parse(content);

    const { imported } = await apiRequest<{ imported: number }>('/notes/import', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(notes),
    });

    await get().fetchNotes();
    return imported;
  },
}));
