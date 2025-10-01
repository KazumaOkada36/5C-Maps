import React, { useState, useEffect } from 'react';
import Home from './pages/home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('login'); // 'login', 'register', 'forgot', 'reset'
  const [resetToken, setResetToken] = useState(null);

  useEffect(() => {
    // Check if URL has a reset token
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      setResetToken(token);
      setCurrentPage('reset');
    }
  }, []);

  const handleLogin = (user) => {
    setCurrentUser(user);
    setCurrentPage('home');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentPage('login');
    // Clear URL parameters
    window.history.pushState({}, '', window.location.pathname);
  };

  const handleShowRegister = () => {
    setCurrentPage('register');
  };

  const handleShowForgotPassword = () => {
    setCurrentPage('forgot');
  };

  const handleBackToLogin = () => {
    setCurrentPage('login');
    setResetToken(null);
    // Clear URL parameters
    window.history.pushState({}, '', window.location.pathname);
  };

  // If user is logged in, show the home page
  if (currentUser) {
    return (
      <Home 
        currentUser={currentUser} 
        onLogout={handleLogout}
      />
    );
  }

  // Show appropriate auth page
  switch (currentPage) {
    case 'register':
      return (
        <Register 
          onRegister={handleLogin} 
          onBackToLogin={handleBackToLogin} 
        />
      );
    
    case 'forgot':
      return (
        <ForgotPassword 
          onBackToLogin={handleBackToLogin}
        />
      );
    
    case 'reset':
      return (
        <ResetPassword 
          token={resetToken}
          onBackToLogin={handleBackToLogin}
        />
      );
    
    default:
      return (
        <Login 
          onLogin={handleLogin} 
          onShowRegister={handleShowRegister}
          onShowForgotPassword={handleShowForgotPassword}
        />
      );
  }
}

export default App;