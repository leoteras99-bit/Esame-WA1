import { useEffect, useState } from 'react';
import Board from '../../components/Board/Board.jsx';
import DifficultyCard from '../../components/DifficultyCard/DifficultyCard.jsx';
import EmptyBoard from '../../components/EmptyBoard/EmptyBoard.jsx';
import MatchHeader from '../../components/MatchHeader/MatchHeader.jsx';
import api from '../../services/api.js';
import './PlayPage.css';

function formatShot(shot, status) {
  if (status === 'won') return 'All ships sunk. Match won.';
  if (status === 'lost') return 'No torpedoes left. Match lost.';
  if (shot.result === 'water') return 'Water. One torpedo spent.';
  if (shot.result === 'sunk') return 'Hit and sunk. Ship length ' + shot.sunkLength + '.';
  return 'Hit. Keep firing.';
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

export default PlayPage;
