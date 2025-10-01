import React, { useState, useEffect } from 'react';
import '../styles/login.css';

const Register = ({ onRegister, onBackToLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    email: '',
    college: ''
  });
  const [colleges, setColleges] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch colleges list
    fetch('https://fivec-maps.onrender.com/api/v1/colleges')
      .then(res => res.json())
      .then(data => setColleges(data))
      .catch(err => console.error('Failed to fetch colleges:', err));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    console.log('Attempting registration...', formData); // DEBUG

    try {
      const response = await fetch('https://fivec-maps.onrender.com/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          name: formData.name,
          email: formData.email,
          college: formData.college
        })
      });

      console.log('Response status:', response.status); // DEBUG
      const data = await response.json();
      console.log('Response data:', data); // DEBUG

      if (response.ok) {
        alert('✅ Account created successfully! Check your email for your login credentials.');
        onBackToLogin();
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      console.error('Registration error:', err); // DEBUG
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background"></div>
      <div className="login-card register-card">
        <div className="login-header">
          <div className="chizu-logo">
            <span className="logo-icon">🗾</span>
            <h1>Chizu</h1>
          </div>
          <p>Create Your Student Account</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="John Doe"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="john@student.edu"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              placeholder="Choose a username"
              required
              minLength="3"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>College</label>
            <select
              value={formData.college}
              onChange={(e) => setFormData({...formData, college: e.target.value})}
              required
              disabled={loading}
            >
              <option value="">Select your college</option>
              {colleges.map(college => (
                <option key={college.id} value={college.name}>
                  {college.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="At least 6 characters"
              required
              minLength="6"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              placeholder="Re-enter your password"
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>

          <button 
            type="button" 
            onClick={onBackToLogin}
            className="secondary-btn"
            disabled={loading}
          >
            ← Back to Login
          </button>
        </form>

        <div className="help-text">
          <p>📧 <strong>You'll receive an email</strong> with your username and password after registration!</p>
        </div>
      </div>
    </div>
  );
};

export default Register;