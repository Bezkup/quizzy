import {BrowserRouter, Route, Routes} from 'react-router-dom';
import {useState} from 'react';
import {STORAGE_KEYS} from './constants';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import PlayerView from './pages/PlayerView';

function App() {
  const [token, setToken] = useState<string | null>(
      localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
  );

  const handleLogin = (newToken: string) => {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    setToken(null);
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PlayerView />} />
        <Route
          path="/admin"
          element={
            token
              ? <AdminDashboard token={token} onLogout={handleLogout} />
              : <AdminLogin onLogin={handleLogin} />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
