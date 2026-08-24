import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import Sidebar from './Sidebar';

export default function Layout() {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <header className="app-header">
          <div className="header-left">
            <h1 className="app-title">
              Note<span>ly</span>
            </h1>
          </div>
          <div className="header-right">
            <span className="user-email">{user?.email}</span>
            <button className="btn btn-ghost" onClick={toggleTheme}>
              {theme === 'dark' ? '\u2600\ufe0f' : '\ud83c\udf19'}
            </button>
            <Link to="/new" className="btn btn-primary">
              \uff0b New Note
            </Link>
            <button className="btn btn-secondary" onClick={logout}>
              Logout
            </button>
          </div>
        </header>
        <div className="content-wrapper">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
