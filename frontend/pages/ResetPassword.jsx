import React, { useState, useEffect } from 'react';
import '../styles/login.css';

const ResetPassword = ({ token, onBackToLogin }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [validToken, setValidToken] = useState(false);

  useEffect(() => {
    // Verify token on mount
    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await fetch(`https://fivec-maps.onrender.com/api/v1/auth/verify-reset-token/${token}`);
      const data = await response.json();

      if (response.ok && data.valid) {
        setValidToken(true);
        setUsername(data.username);
        setEmail(data.email);
      } else {
        setError(data.error || 'Invalid or expired reset link');
        setValidToken(false);
      }
    } catch (err) {
      setError('Failed to verify reset link. Please try again.');
      setValidToken(false);
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('https://fivec-maps.onrender.com/api/v1/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('✅ Password successfully reset! You can now login with your new password.');
        setPassword('');
        setConfirmPassword('');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          onBackToLogin();
        }, 3000);
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Reset password error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="login-container">
        <div className="login-background"></div>
        <div className="login-card">
          <div className="loading-state">
            <h2>🔄 Verifying reset link...</h2>
          </div>
        </div>
      </div>
    );
  }

  if (!validToken) {
    return (
      <div className="login-container">
        <div className="login-background"></div>
        <div className="login-card">
          <div className="login-header">
            <div className="chizu-logo">
              <span className="logo-icon">🗾</span>
              <h1>Chizu</h1>
            </div>
            <p>Invalid Reset Link</p>
          </div>

          <div className="error-message">
            {error || 'This password reset link is invalid or has expired.'}
          </div>

          <div className="info-box">
            <p>Reset links expire after 1 hour for security reasons.</p>
            <p>Please request a new password reset link.</p>
          </div>

          <button 
            onClick={onBackToLogin}
            className="login-btn"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-background"></div>
      <div className="login-card">
        <div className="login-header">
          <div className="chizu-logo">
            <span className="logo-icon">🗾</span>
            <h1>Chizu</h1>
          </div>
          <p>Reset Your Password</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {message && (
            <div className="success-message">
              {message}
            </div>
          )}

          <div className="info-box">
            <div className="credential-display">
              <strong>Username:</strong> <code>{username}</code>
            </div>
            <div className="credential-display">
              <strong>Email:</strong> <code>{email}</code>
            </div>
            <p style={{ marginTop: '10px', fontSize: '0.9em', color: '#6c757d' }}>
              Your username remains unchanged. Enter a new password below.
            </p>
          </div>

          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              minLength="6"
              disabled={loading || message}
            />
          </div>

          <div className="form-group">
            <label>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              required
              disabled={loading || message}
            />
          </div>

          {!message && (
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          )}

          <button 
            type="button" 
            onClick={onBackToLogin}
            className="secondary-btn"
          >
            {message ? 'Go to Login' : '← Back to Login'}
          </button>
        </form>

        <div className="brand-footer">
          <p>Powered by Chizu 🗾</p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;