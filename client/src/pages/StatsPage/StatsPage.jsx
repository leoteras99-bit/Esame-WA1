import { useEffect, useState } from 'react';
import api from '../../services/api.js';
import './StatsPage.css';

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

export default StatsPage;
