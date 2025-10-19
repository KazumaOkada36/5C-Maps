// Save as: frontend/pages/MobileApp.jsx

import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Calendar from './Calendar.jsx';
import Courses from './Courses.jsx';
import CourseDetail from './CourseDetail.jsx';
import LocationDetail from './LocationDetail.jsx';
import '../styles/mobileapp.css';

const MobileApp = ({ 
  currentUser, 
  onLogout,
  pois,
  events,
  starredItems,
  onStar,
  onPostEvent,
  onViewOnMap
}) => {
  const [activeTab, setActiveTab] = useState('home');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showCourses, setShowCourses] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showLocationDetail, setShowLocationDetail] = useState(false);
  const [showCourseDetail, setShowCourseDetail] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  // Initialize map when on map tab
  useEffect(() => {
    if (activeTab === 'map' && mapRef.current && !mapInstanceRef.current && pois.length > 0) {
      const bounds = L.latLngBounds(
        [34.093, -117.714],
        [34.107, -117.704]
      );

      mapInstanceRef.current = L.map(mapRef.current, {
        center: [34.1000, -117.7090],
        zoom: 16,
        minZoom: 15,
        maxZoom: 18,
        maxBounds: bounds,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstanceRef.current);

      // Add location markers
      pois.forEach(poi => {
        if (!poi.lat || !poi.lng) return;
        
        const categoryColors = {
          dining: '#f39c12',
          academic: '#27ae60',
          recreation: '#e74c3c',
          other: '#95a5a6'
        };
        
        const marker = L.circleMarker([poi.lat, poi.lng], {
          color: 'white',
          fillColor: categoryColors[poi.category] || categoryColors.other,
          fillOpacity: 0.8,
          radius: 8,
          weight: 2
        }).addTo(mapInstanceRef.current);

        marker.on('click', () => {
          setSelectedLocation(poi);
        });
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [activeTab, pois]);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => console.error('Location error:', error)
      );
    }
  }, []);

  const centerOnUser = () => {
    if (userLocation && mapInstanceRef.current) {
      mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 17);
    }
  };

  const handleLocationClick = (location) => {
    setSelectedLocation(location);
    setShowLocationDetail(true);
  };

  return (
    <div className="mobile-app">
      {/* Top Bar */}
      <div className="mobile-top-bar">
        <div className="mobile-logo">
          <span className="logo-icon">🗾</span>
          <span className="logo-text">Chizu</span>
        </div>
        <div className="mobile-user-info">
          <span className="mobile-user-name">{currentUser.name}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="mobile-main-content">
        
        {/* HOME TAB */}
        {activeTab === 'home' && (
          <div className="mobile-tab home-tab">
            <h2 className="mobile-welcome">Welcome back, {currentUser.name.split(' ')[0]}! 👋</h2>
            
            <div className="mobile-quick-actions-grid">
              <button 
                className="mobile-action-card events-card"
                onClick={onPostEvent}
              >
                <span className="mobile-action-icon">📅</span>
                <h3>Post Event</h3>
                <p>Share campus events</p>
              </button>

              <button 
                className="mobile-action-card classes-card"
                onClick={() => setShowCourses(true)}
              >
                <span className="mobile-action-icon">📚</span>
                <h3>Find Classes</h3>
                <p>Browse courses</p>
              </button>

              <button 
                className="mobile-action-card dining-card"
                onClick={() => window.open('https://menu.jojodmo.com/', '_blank')}
              >
                <span className="mobile-action-icon">🍽️</span>
                <h3>Dining Menus</h3>
                <p>See what's cooking</p>
              </button>

              <button 
                className="mobile-action-card map-card"
                onClick={() => setActiveTab('map')}
              >
                <span className="mobile-action-icon">🗺️</span>
                <h3>Explore Map</h3>
                <p>Find locations</p>
              </button>
            </div>

            {/* Quick Stats */}
            <div className="mobile-stats">
              <div className="stat-card">
                <span className="stat-number">{pois.length}</span>
                <span className="stat-label">Locations</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{events.length}</span>
                <span className="stat-label">Events</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{starredItems.length}</span>
                <span className="stat-label">Starred</span>
              </div>
            </div>
          </div>
        )}

        {/* MAP TAB */}
        {activeTab === 'map' && (
          <div className="mobile-tab map-tab">
            <div className="mobile-search-bar">
              <input
                type="text"
                placeholder="🔍 Search locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mobile-search-input"
              />
            </div>
            
            <div ref={mapRef} className="mobile-map"></div>
            
            {userLocation && (
              <button className="mobile-locate-btn" onClick={centerOnUser}>
                📍
              </button>
            )}

            {selectedLocation && (
              <div className="mobile-location-popup">
                <div className="popup-header">
                  <h3>{selectedLocation.name}</h3>
                  <button 
                    className="popup-close"
                    onClick={() => setSelectedLocation(null)}
                  >
                    ✕
                  </button>
                </div>
                <p className="popup-college">{selectedLocation.college}</p>
                <button 
                  className="popup-details-btn"
                  onClick={() => setShowLocationDetail(true)}
                >
                  See Details →
                </button>
              </div>
            )}
          </div>
        )}

        {/* CALENDAR TAB */}
        {activeTab === 'calendar' && (
          <div className="mobile-tab calendar-tab">
            <Calendar 
              currentUser={currentUser}
              onClose={() => {}}
            />
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="mobile-tab profile-tab">
            <div className="mobile-profile-header">
              <div className="profile-avatar">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <h2>{currentUser.name}</h2>
              <span className={`profile-badge ${currentUser.role}`}>
                {currentUser.role}
              </span>
              {currentUser.college && (
                <p className="profile-college">{currentUser.college}</p>
              )}
            </div>

            <div className="profile-sections">
              {currentUser.role !== 'guest' && (
                <div className="profile-section">
                  <h3>⭐ My Starred Items</h3>
                  <p className="section-subtitle">{starredItems.length} items</p>
                </div>
              )}

              <div className="profile-section">
                <h3>📊 My Stats</h3>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-value">{starredItems.filter(s => s.item_type === 'event').length}</span>
                    <span className="stat-name">Events</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{starredItems.filter(s => s.item_type === 'location').length}</span>
                    <span className="stat-name">Locations</span>
                  </div>
                </div>
              </div>

              <button className="mobile-logout-btn" onClick={onLogout}>
                Logout
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="mobile-bottom-nav">
        <button 
          className={`nav-btn ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          <span className="nav-icon">🏠</span>
          <span className="nav-label">Home</span>
        </button>

        <button 
          className={`nav-btn ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => setActiveTab('map')}
        >
          <span className="nav-icon">🗺️</span>
          <span className="nav-label">Map</span>
        </button>

        <button 
          className={`nav-btn ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          <span className="nav-icon">📅</span>
          <span className="nav-label">Calendar</span>
        </button>

        <button 
          className={`nav-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <span className="nav-icon">👤</span>
          <span className="nav-label">Profile</span>
        </button>
      </div>

      {/* Modals */}
      {showCourses && (
        <div className="mobile-modal-overlay" onClick={() => setShowCourses(false)}>
          <div className="mobile-modal-content" onClick={(e) => e.stopPropagation()}>
            <Courses 
              currentUser={currentUser}
              onClose={() => setShowCourses(false)}
              onViewOnMap={(location) => {
                setSelectedLocation(location);
                setShowCourses(false);
                setActiveTab('map');
              }}
              onViewCourseDetail={(course) => {
                setSelectedCourse(course);
                setShowCourseDetail(true);
              }}
            />
          </div>
        </div>
      )}

      {showLocationDetail && selectedLocation && (
        <div className="mobile-modal-overlay" onClick={() => setShowLocationDetail(false)}>
          <div className="mobile-modal-content" onClick={(e) => e.stopPropagation()}>
            <LocationDetail 
              location={selectedLocation}
              currentUser={currentUser}
              onClose={() => setShowLocationDetail(false)}
            />
          </div>
        </div>
      )}

      {showCourseDetail && selectedCourse && (
        <div className="mobile-modal-overlay" onClick={() => setShowCourseDetail(false)}>
          <div className="mobile-modal-content" onClick={(e) => e.stopPropagation()}>
            <CourseDetail 
              course={selectedCourse}
              currentUser={currentUser}
              onClose={() => setShowCourseDetail(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileApp;