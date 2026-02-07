import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import PlayerView from './pages/PlayerView';

function App() {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('quizzy_token')
  );

  const handleLogin = (newToken: string) => {
    localStorage.setItem('quizzy_token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('quizzy_token');
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
