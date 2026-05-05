import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/services';

export default function Login() {
  const navigate = useNavigate();
  const [login, setLogin] = useState('');
  const [password, setPwd] = useState('');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await authApi.login({ login, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="container" style={{ maxWidth: 420 }}>
      <h1>Sign in</h1>
      <form className="card" onSubmit={submit}>
        <div className="form-group">
          <label>Username</label>
          <input value={login} onChange={(e) => setLogin(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" value={password}
            onChange={(e) => setPwd(e.target.value)} required />
        </div>
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
        <button className="btn btn-primary btn-block">Sign in</button>
      </form>
    </div>
  );
}
