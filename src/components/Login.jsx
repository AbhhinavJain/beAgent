import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok) {
        // Store simple auth state (in real app, store JWT)
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('username', username);
        navigate('/welcome');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Could not connect to the server');
    }
  };

  return (
    <div className="auth-card">
      <h2>Welcome Back</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div className="form-group">
          <label>Username</label>
          <input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            required 
            placeholder="Enter your username"
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            placeholder="Enter your password"
          />
        </div>
        <button type="submit" className="btn">Login</button>
      </form>
      <p className="toggle-text">
        Don't have an account? <Link to="/signup">Sign up</Link>
      </p>
    </div>
  );
};

export default Login;
