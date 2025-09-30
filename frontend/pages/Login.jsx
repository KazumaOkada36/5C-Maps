import React, { useState } from 'react';
import '../styles/login.css';

const Login = ({ onLogin, onShowRegister }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (role === 'guest') {
      onLogin({ username: 'Guest', role: 'guest', name: 'Guest User' });
      return;
    }
    
    try {
      const response = await fetch('https://fivec-maps.onrender.com/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const user = data.user;
        // Check if role matches
        if (user.role === role) {
          onLogin(user);
        } else {
          setError(`This account is not an ${role} account`);
        }
      } else {
        setError('Invalid username or password');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Login error:', err);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background"></div>
      <div className="login-card">
        <div className="login-header">
          <div className="chizu-logo">
            <span className="logo-icon">🗾</span>
            <h1>Chizu</h1>
          </div>
          <p>Interactive Campus Navigation</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="role-selector">
            <button
              type="button"
              onClick={() => setRole('student')}
              className={`role-btn ${role === 'student' ? 'active' : ''}`}
            >
              👨‍🎓 Student
            </button>
            <button
              type="button"
              onClick={() => setRole('admin')}
              className={`role-btn ${role === 'admin' ? 'active' : ''}`}
            >
              🛡️ Admin
            </button>
            <button
              type="button"
              onClick={() => setRole('guest')}
              className={`role-btn ${role === 'guest' ? 'active' : ''}`}
            >
              👤 Guest
            </button>
          </div>

          {role !== 'guest' && (
            <>
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
            </>
          )}

          <button type="submit" className="login-btn">
            {role === 'guest' ? 'Continue as Guest' : 'Login'}
          </button>

          {role === 'student' && (
            <div className="register-prompt">
              <p>Don't have an account?</p>
              <button 
                type="button" 
                onClick={onShowRegister}
                className="register-link"
              >
                Create Student Account →
              </button>
            </div>
          )}
        </form>

        <div className="demo-credentials">
          <p><strong>Demo Credentials:</strong></p>
          <p>Admin: <code>admin</code> / <code>admin123</code></p>
          <p>Student: <code>student</code> / <code>student123</code></p>
          <p>Guest: No login required</p>
        </div>

        <div className="brand-footer">
          <p>Powered by Chizu 🗾</p>
        </div>
      </div>
    </div>
  );
};

export default Login;