import { useEffect, useState } from 'react';
import ErrorNotice from './components/ErrorNotice/ErrorNotice.jsx';
import Header from './components/Header/Header.jsx';
import useRoute from './hooks/useRoute.js';
import LoginPage from './pages/LoginPage/LoginPage.jsx';
import PlayPage from './pages/PlayPage/PlayPage.jsx';
import StatsPage from './pages/StatsPage/StatsPage.jsx';
import api from './services/api.js';
import './App.css';

function App() {
  const [route, navigate] = useRoute();
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/session').then((data) => setUser(data.user)).catch(() => setUser(null));
  }, []);

  const logout = async () => {
    await api('/logout', { method: 'POST' });
    setUser(null);
    navigate('/');
  };

  return (
    <div className="appShell">
      <Header user={user} onNavigate={navigate} onLogout={logout} />
      <ErrorNotice message={error} />

      {route === '/stats' ? (
        <StatsPage setError={setError} />
      ) : route === '/login' ? (
        <LoginPage setUser={setUser} setError={setError} navigate={navigate} />
      ) : (
        <PlayPage user={user} setError={setError} />
      )}
    </div>
  );
}

export default App;
