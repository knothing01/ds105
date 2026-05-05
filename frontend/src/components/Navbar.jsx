import { Link, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">🏨 StayBook</Link>
        <div className="navbar-links">
          <Link to="/hotels">Hotels</Link>
          <Link to="/reviews">Reviews</Link>
          {user?.type === 'admin' && <Link to="/admin">Admin</Link>}
          {!token
            ? <>
                <Link to="/login">Sign in</Link>
                <Link to="/register">Register</Link>
              </>
            : <a onClick={logout} style={{ cursor: 'pointer' }}>Logout</a>
          }
        </div>
      </div>
    </nav>
  );
}
