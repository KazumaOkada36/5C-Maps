import React, { useState } from 'react';
import '../styles/login.css';

const ForgotPassword = ({ onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await fetch('https://fivec-maps.onrender.com/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('📧 Check your email! If an account exists with that email, we\'ve sent you a password reset link and your username.');
        setEmail('');
      } else {
        setError(data.error || 'Failed to send reset email');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Forgot password error:', err);
    } finally {
      setLoading(false);
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
          <p>Forgot Your Password?</p>
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
            <p>💡 Enter your email address and we'll send you:</p>
            <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
              <li>Your username</li>
              <li>A link to reset your password</li>
            </ul>
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your registered email"
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>

          <button 
            type="button" 
            onClick={onBackToLogin}
            className="secondary-btn"
          >
            ← Back to Login
          </button>
        </form>

        <div className="help-text">
          <p><strong>Need help?</strong></p>
          <p>If you don't receive an email within a few minutes, check your spam folder or contact support.</p>
        </div>

        <div className="brand-footer">
          <p>Powered by Chizu 🗾</p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;