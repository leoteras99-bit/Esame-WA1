import { useState } from 'react';
import api from '../../services/api.js';
import './LoginPage.css';

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

export default LoginPage;
