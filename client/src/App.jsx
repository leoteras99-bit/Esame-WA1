import { useEffect, useMemo, useState } from 'react';
import './App.css';

const API_URL = 'http://localhost:3001/api';

async function api(path, options = {}) {
  const response = await fetch(API_URL + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    ...options,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Request failed');
  }
  if (response.status === 204) return null;
  return response.json();
}

function useRoute() {
  const [route, setRoute] = useState(window.location.pathname);
  useEffect(() => {
    const onPop = () => setRoute(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = (nextRoute) => {
    window.history.pushState({}, '', nextRoute);
    setRoute(nextRoute);
  };

  return [route, navigate];
}

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
      <header className="topbar">
        <button className="brandButton" type="button" onClick={() => navigate('/')}>Battleship</button>
        <nav>
          <button type="button" onClick={() => navigate('/')}>Play</button>
          <button type="button" onClick={() => navigate('/stats')}>Statistics</button>
          {user ? (
            <button type="button" onClick={logout}>Logout {user.username}</button>
          ) : (
            <button type="button" onClick={() => navigate('/login')}>Login</button>
          )}
        </nav>
      </header>

      {error && <div className="notice error">{error}</div>}

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

function LoginPage({ setUser, setError, navigate }) {
  const [username, setUsername] = useState('alice');
  const [password, setPassword] = useState('password');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const data = await api('/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      setUser(data.user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <main className="page narrow">
      <section className="panel">
        <h1>Login</h1>
        <form className="form" onSubmit={submit}>
          <label>
            Username
            <input value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <button className="primary" type="submit">Sign in</button>
        </form>
        <p className="muted">Seeded users share the password <strong>password</strong>.</p>
      </section>
    </main>
  );
}

function PlayPage({ user, setError }) {
  const [difficulties, setDifficulties] = useState([]);
  const [difficulty, setDifficulty] = useState('Easy');
  const [mode, setMode] = useState('casual');
  const [joinCode, setJoinCode] = useState('');
  const [match, setMatch] = useState(null);
  const [message, setMessage] = useState('Choose a difficulty and start a match.');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/difficulties').then((data) => {
      setDifficulties(data);
      setDifficulty(data[0]?.name ?? 'Easy');
    }).catch((err) => setError(err.message));
  }, [setError]);

  const selectedDifficulty = difficulties.find((item) => item.name === difficulty);

  const startMatch = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await api('/matches', {
        method: 'POST',
        body: JSON.stringify({
          difficulty,
          mode,
          tournamentCode: mode === 'tournament' && joinCode.trim() ? joinCode.trim() : undefined,
        }),
      });
      setMatch(data);
      setMessage(data.tournamentCode ? 'Tournament code: ' + data.tournamentCode : 'Match started.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const shoot = async (row, col) => {
    if (!match || match.status !== 'playing') return;
    setError('');
    try {
      const data = await api('/matches/' + match.id + '/shots', {
        method: 'POST',
        body: JSON.stringify({ row, col }),
      });
      setMatch(data.match);
      setMessage(formatShot(data.shot, data.match.status));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <main className="page playGrid">
      <aside className="panel controlsPanel">
        <h1>New Match</h1>
        <form className="form" onSubmit={startMatch}>
          <label>
            Difficulty
            <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
              {difficulties.map((item) => <option key={item.name}>{item.name}</option>)}
            </select>
          </label>
          <div className="modeSwitch" role="group" aria-label="Mode">
            <button type="button" className={mode === 'casual' ? 'active' : ''} onClick={() => setMode('casual')}>Casual</button>
            <button type="button" className={mode === 'tournament' ? 'active' : ''} onClick={() => setMode('tournament')}>Tournament</button>
          </div>
          {mode === 'tournament' && (
            <label>
              Tournament code
              <input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="Leave empty to create" />
            </label>
          )}
          <button className="primary" type="submit" disabled={busy || (mode === 'tournament' && !user) || (match && match.status === 'playing')}>
            {busy ? 'Starting...' : 'Start match'}
          </button>
        </form>
        {mode === 'tournament' && !user && <p className="muted">Login to create or join tournaments.</p>}
        {selectedDifficulty && <DifficultyCard difficulty={selectedDifficulty} />}
      </aside>

      <section className="panel boardPanel">
        <MatchHeader match={match} message={message} />
        {match ? <Board match={match} onShoot={shoot} /> : <EmptyBoard />}
      </section>
    </main>
  );
}

function DifficultyCard({ difficulty }) {
  return (
    <div className="difficultyBox">
      <span>{difficulty.size} x {difficulty.size}</span>
      <span>{difficulty.ships.length} ships</span>
      <span>{difficulty.torpedoes} torpedoes</span>
    </div>
  );
}

function MatchHeader({ match, message }) {
  return (
    <div className="matchHeader">
      <div>
        <h1>{match ? match.difficulty + ' Match' : 'Ready Room'}</h1>
        <h1>{match?.tournamentCode || ''}</h1>
        <p>{message}</p>
      </div>
      {match && (
        <div className={'statusBadge ' + match.status}>
          {match.status === 'playing' ? match.torpedoes + ' torpedoes' : match.status.toUpperCase()}
        </div>
      )}
    </div>
  );
}

function Board({ match, onShoot }) {
  const shotMap = useMemo(() => new Map(match.shots.map((shot) => [shot.row + '-' + shot.col, shot])), [match.shots]);
  const revealMap = useMemo(() => new Map((match.reveal ?? []).map((cell) => [cell.row + '-' + cell.col, cell])), [match.reveal]);
  const cells = [];

  for (let row = 0; row < match.size; row += 1) {
    for (let col = 0; col < match.size; col += 1) {
      const key = row + '-' + col;
      const shot = shotMap.get(key);
      const revealed = revealMap.get(key);
      const className = ['cell', shot?.result, revealed && !shot ? 'revealed' : ''].filter(Boolean).join(' ');
      cells.push(
        <button
          key={key}
          type="button"
          className={className}
          disabled={Boolean(shot) || match.status !== 'playing'}
          onClick={() => onShoot(row, col)}
          aria-label={'Row ' + (row + 1) + ', column ' + (col + 1)}
        >
          {cellLabel(shot, revealed)}
        </button>
      );
    }
  }

  return (
    <>
      <div className="fleetRow">
        {match.ships.map((ship) => (
          <span key={ship.id} className={ship.sunk ? 'sunkShip' : ''}>Ship {ship.length}</span>
        ))}
      </div>
      <div className="board" style={{ gridTemplateColumns: 'repeat(' + match.size + ', minmax(26px, 1fr))' }}>
        {cells}
      </div>
    </>
  );
}

function EmptyBoard() {
  return <div className="emptyBoard">Start a match to reveal the targeting grid.</div>;
}

function cellLabel(shot, revealed) {
  if (shot?.result === 'water') return 'o';
  if (shot?.result === 'hit') return 'x';
  if (shot?.result === 'sunk') return 'X';
  if (revealed) return 'S';
  return '';
}

function formatShot(shot, status) {
  if (status === 'won') return 'All ships sunk. Match won.';
  if (status === 'lost') return 'No torpedoes left. Match lost.';
  if (shot.result === 'water') return 'Water. One torpedo spent.';
  if (shot.result === 'sunk') return 'Hit and sunk. Ship length ' + shot.sunkLength + '.';
  return 'Hit. Keep firing.';
}

function StatsPage({ setError }) {
  const [stats, setStats] = useState([]);

  useEffect(() => {
    api('/stats').then(setStats).catch((err) => setError(err.message));
  }, [setError]);

  return (
    <main className="page">
      <section className="panel">
        <h1>Public Statistics</h1>
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Difficulty</th>
              <th>Played</th>
              <th>Won</th>
              <th>Lost</th>
              <th>Win rate</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((row) => (
              <tr key={row.username + row.difficulty}>
                <td>{row.name}</td>
                <td>{row.difficulty}</td>
                <td>{row.played}</td>
                <td>{row.won}</td>
                <td>{row.lost}</td>
                <td>{row.winRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

export default App;
