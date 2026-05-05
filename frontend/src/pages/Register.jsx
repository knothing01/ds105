import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/services';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    login: '', password: '', user_type: 'customer',
    first_name: '', last_name: '', email: '', phone: '', passport: '',
  });
  const [error, setError] = useState('');

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    try {
      await authApi.register(form);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div className="container" style={{ maxWidth: 520 }}>
      <h1>Create your account</h1>
      <form className="card" onSubmit={submit}>
        <div className="form-group">
          <label>Username</label>
          <input name="login" value={form.login} onChange={change} required />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input name="password" type="password" value={form.password}
            onChange={change} required />
        </div>
        <div className="form-group">
          <label>First name</label>
          <input name="first_name" value={form.first_name} onChange={change} required />
        </div>
        <div className="form-group">
          <label>Last name</label>
          <input name="last_name" value={form.last_name} onChange={change} required />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input name="email" type="email" value={form.email}
            onChange={change} required />
        </div>
        <div className="form-group">
          <label>Phone</label>
          <input name="phone" value={form.phone} onChange={change} />
        </div>
        <div className="form-group">
          <label>Passport</label>
          <input name="passport" value={form.passport} onChange={change} />
        </div>
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
        <button className="btn btn-primary btn-block">Register</button>
      </form>
    </div>
  );
}
