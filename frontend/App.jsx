import React, { useState } from 'react';
import Home from './pages/home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Schedule from './pages/Schedule.jsx';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [showRegister, setShowRegister] = useState(false);

  const handleLogin = (user) => {
    setCurrentUser(user);
    setShowRegister(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setShowRegister(false);
  };

  const handleShowRegister = () => {
    setShowRegister(true);
  };

  const handleBackToLogin = () => {
    setShowRegister(false);
  };

  if (!currentUser) {
    if (showRegister) {
      return <Register onRegister={handleLogin} onBackToLogin={handleBackToLogin} />;
    }
    return <Login onLogin={handleLogin} onShowRegister={handleShowRegister} />;
  }

  return (
    <Home 
      currentUser={currentUser} 
      onLogout={handleLogout}
    />
  );
}

export default App;