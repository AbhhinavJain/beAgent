import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Welcome = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');

  useEffect(() => {
    const isAuth = localStorage.getItem('isAuthenticated');
    if (isAuth !== 'true') {
      navigate('/login');
    } else {
      setUsername(localStorage.getItem('username') || 'User');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('username');
    navigate('/login');
  };

  return (
    <div className="auth-card welcome-card">
      <h1>Welcome, {username}!</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>
        You have successfully logged into the system. This is a protected route.
      </p>
      <button onClick={handleLogout} className="btn" style={{ background: '#333' }}>
        Logout
      </button>
    </div>
  );
};

export default Welcome;
