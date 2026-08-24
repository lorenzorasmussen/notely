import { Routes, Route } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Notes from './pages/Notes';
import NoteEditor from './pages/NoteEditor';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  useThemeStore();
  useAuthStore((state) => state.checkAuth);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Notes />} />
        <Route path="note/:noteId" element={<NoteEditor />} />
        <Route path="new" element={<NoteEditor />} />
      </Route>
    </Routes>
  );
}

export default App;
