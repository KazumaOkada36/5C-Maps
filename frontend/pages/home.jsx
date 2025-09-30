import React, { useState, useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import '../styles/home.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const Home = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [pois, setPois] = useState([]);
  const [events, setEvents] = useState([]);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [expandedEventType, setExpandedEventType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEventForm, setShowEventForm] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [eventFormData, setEventFormData] = useState({
    title: '',
    event_type: 'fun',
    date_time: '',
    location_id: '',
    description: ''
  });
  
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);

  const API_BASE = 'http://localhost:8080/api/v1';

  const CLAREMONT_BOUNDS = {
    north: 34.1070,
    south: 34.0930,
    east: -117.7040,
    west: -117.7140
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [locationsRes, eventsRes] = await Promise.all([
          fetch(`${API_BASE}/locations`),
          fetch(`${API_BASE}/events`)
        ]);
        
        const locationsData = await locationsRes.json();
        const eventsData = await eventsRes.json();
        
        const formattedPOIs = locationsData.map(location => ({
          id: location.id,
          name: location.name,
          category: location.category || 'other',
          lat: location.latitude,
          lng: location.longitude,
          college: location.college
        }));

        setPois(formattedPOIs);
        setEvents(eventsData);
      } catch (err) {
        console.error('Failed to fetch:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current || mapInstanceRef.current || pois.length === 0) return;

      const bounds = L.latLngBounds(
        [CLAREMONT_BOUNDS.south, CLAREMONT_BOUNDS.west],
        [CLAREMONT_BOUNDS.north, CLAREMONT_BOUNDS.east]
      );

      mapInstanceRef.current = L.map(mapRef.current, {
        center: [34.1000, -117.7090],
        zoom: 17,
        minZoom: 16,
        maxZoom: 18,
        maxBounds: bounds,
        maxBoundsViscosity: 1.0,
        zoomAnimation: false,
        fadeAnimation: false,
        markerZoomAnimation: false,
        preferCanvas: true,
        scrollWheelZoom: true,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        dragging: true,
        touchZoom: true,
        zoomControl: true,
        attributionControl: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        keepBuffer: 0,
        updateWhenIdle: true,
        updateWhenZooming: false,
      }).addTo(mapInstanceRef.current);

      mapInstanceRef.current.fitBounds(bounds, { padding: [20, 20] });
      updateMapMarkers(pois);
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [pois]);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation && mapInstanceRef.current) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const userPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(userPos);
          
          if (mapInstanceRef.current) {
            if (userMarkerRef.current) {
              mapInstanceRef.current.removeLayer(userMarkerRef.current);
            }
            
            userMarkerRef.current = L.circleMarker([userPos.lat, userPos.lng], {
              color: '#2196F3',
              fillColor: '#2196F3',
              fillOpacity: 1,
              radius: 10,
              weight: 3
            }).addTo(mapInstanceRef.current);
            
            userMarkerRef.current.bindPopup('<strong>You are here</strong>');
          }
        },
        (error) => {
          console.error('Error getting location:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    }
  }, [mapInstanceRef.current]);

  const updateMapMarkers = (poisToShow) => {
    if (!mapInstanceRef.current) return;

    markersRef.current.forEach(marker => mapInstanceRef.current.removeLayer(marker));
    markersRef.current = [];

    const categoryColors = {
      dining: '#f39c12',
      academic: '#27ae60',
      recreation: '#e74c3c',
      events: '#9b59b6',
      other: '#95a5a6'
    };

    poisToShow.forEach(poi => {
      if (!poi.lat || !poi.lng) return;

      const color = categoryColors[poi.category] || categoryColors.other;
      
      const marker = L.circleMarker([poi.lat, poi.lng], {
        color: 'white',
        fillColor: color,
        fillOpacity: 0.8,
        radius: 8,
        weight: 2
      }).addTo(mapInstanceRef.current);

      marker.bindPopup(`
        <div class="map-popup">
          <h4>${poi.name}</h4>
          <p><strong>${poi.category}</strong></p>
          <p>${poi.college}</p>
        </div>
      `);

      markersRef.current.push(marker);
    });
  };

  const filteredBySearch = searchTerm
    ? pois.filter(poi => poi.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : pois;

  const categories = [
    { id: 'dining', name: 'Dining Halls', icon: '🍽️' },
    { id: 'academic', name: 'Classes', icon: '📚' },
    { id: 'recreation', name: 'Gym/Recreation', icon: '🏋️' },
    { id: 'events', name: 'Events', icon: '📅', hasSubcategories: true }
  ];

  const eventTypes = [
    { id: 'career', name: 'Career', icon: '💼' },
    { id: 'clubs', name: 'Clubs', icon: '🎯' },
    { id: 'fun', name: 'Fun', icon: '🎉' }
  ];

  const getLocationsByCategory = (category) => {
    return filteredBySearch.filter(poi => poi.category === category);
  };

  const getEventsByType = (eventType) => {
    return events.filter(event => event.event_type === eventType);
  };

  const toggleCategory = (categoryId) => {
    if (categoryId === 'events') {
      setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
      setExpandedEventType(null);
    } else {
      setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
    }
  };

  const toggleEventType = (eventTypeId) => {
    setExpandedEventType(expandedEventType === eventTypeId ? null : eventTypeId);
  };

  const focusOnLocation = (poi) => {
    if (mapInstanceRef.current && poi.lat && poi.lng) {
      mapInstanceRef.current.setView([poi.lat, poi.lng], 18);
      const marker = markersRef.current.find(m => {
        const latlng = m.getLatLng();
        return latlng.lat === poi.lat && latlng.lng === poi.lng;
      });
      if (marker) marker.openPopup();
    }
  };

  const focusOnEvent = (event) => {
    if (event.location && event.location.latitude && event.location.longitude) {
      const eventLocation = {
        lat: event.location.latitude,
        lng: event.location.longitude
      };
      focusOnLocation(eventLocation);
    }
  };

  const centerOnUser = () => {
    if (userLocation && mapInstanceRef.current) {
      mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 18);
      if (userMarkerRef.current) {
        userMarkerRef.current.openPopup();
      }
    } else {
      alert('Location not available. Please enable location services.');
    }
  };

  const handlePostEvent = () => {
    setShowEventForm(true);
  };

  const submitEvent = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`${API_BASE}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventFormData)
      });
      
      if (response.ok) {
        const newEvent = await response.json();
        setEvents([...events, newEvent]);
        setShowEventForm(false);
        setEventFormData({
          title: '',
          event_type: 'fun',
          date_time: '',
          location_id: '',
          description: ''
        });
        alert('Event posted successfully!');
      }
    } catch (err) {
      console.error('Failed to post event:', err);
      alert('Failed to post event. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="home-container">
        <div className="loading-container">
          <h2>Loading 5C Campus Data...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container">
      <header className="header">
        <h1>5C Interactive Map</h1>
        <input
          type="text"
          placeholder="Search locations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </header>

      <div className="main-content">
        <div className="map-section">
          <div className="leaflet-map-container">
            <div ref={mapRef} className="leaflet-map"></div>
            {userLocation && (
              <button className="locate-me-btn" onClick={centerOnUser}>
                📍 My Location
              </button>
            )}
          </div>
        </div>
        
        <div className="sidebar">
          <h3 className="sidebar-title">Categories</h3>
          
          {categories.map(category => {
            if (category.id === 'events') {
              const isExpanded = expandedCategory === category.id;
              
              return (
                <div key={category.id} className="category-section">
                  <button 
                    className="category-btn"
                    onClick={() => toggleCategory(category.id)}
                  >
                    <span className="category-icon">{category.icon}</span>
                    <span className="category-name">{category.name}</span>
                    <span className="category-count">({events.length})</span>
                    <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                  </button>
                  
                  {isExpanded && (
                    <div className="event-types-container">
                      {eventTypes.map(eventType => {
                        const eventsList = getEventsByType(eventType.id);
                        const isEventTypeExpanded = expandedEventType === eventType.id;
                        
                        return (
                          <div key={eventType.id} className="event-type-section">
                            <button 
                              className="event-type-btn"
                              onClick={() => toggleEventType(eventType.id)}
                            >
                              <span className="category-icon">{eventType.icon}</span>
                              <span className="category-name">{eventType.name}</span>
                              <span className="category-count">({eventsList.length})</span>
                              <span className="expand-icon">{isEventTypeExpanded ? '▼' : '▶'}</span>
                            </button>
                            
                            {isEventTypeExpanded && (
                              <div className="location-list">
                                {eventsList.length === 0 ? (
                                  <div className="no-locations">No events yet</div>
                                ) : (
                                  eventsList.map(event => (
                                    <div 
                                      key={event.id} 
                                      className="event-item"
                                      onClick={() => focusOnEvent(event)}
                                    >
                                      <div className="event-title">{event.title}</div>
                                      <div className="event-time">{event.date_time}</div>
                                      {event.location && (
                                        <div className="event-location">{event.location.name}</div>
                                      )}
                                      {event.description && (
                                        <div className="event-description">{event.description}</div>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
            
            const locations = getLocationsByCategory(category.id);
            const isExpanded = expandedCategory === category.id;
            
            return (
              <div key={category.id} className="category-section">
                <button 
                  className="category-btn"
                  onClick={() => toggleCategory(category.id)}
                >
                  <span className="category-icon">{category.icon}</span>
                  <span className="category-name">{category.name}</span>
                  <span className="category-count">({locations.length})</span>
                  <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                </button>
                
                {isExpanded && (
                  <div className="location-list">
                    {locations.length === 0 ? (
                      <div className="no-locations">No locations found</div>
                    ) : (
                      locations.map(poi => (
                        <div 
                          key={poi.id} 
                          className="location-item"
                          onClick={() => focusOnLocation(poi)}
                        >
                          <div className="location-name">{poi.name}</div>
                          <div className="location-college">{poi.college}</div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showEventForm && (
        <div className="modal-overlay" onClick={() => setShowEventForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Post New Event</h2>
            <form onSubmit={submitEvent}>
              <div className="form-group">
                <label>Event Title</label>
                <input
                  type="text"
                  required
                  value={eventFormData.title}
                  onChange={(e) => setEventFormData({...eventFormData, title: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>Event Type</label>
                <select
                  value={eventFormData.event_type}
                  onChange={(e) => setEventFormData({...eventFormData, event_type: e.target.value})}
                >
                  <option value="career">Career</option>
                  <option value="clubs">Clubs</option>
                  <option value="fun">Fun</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Date & Time</label>
                <input
                  type="text"
                  required
                  placeholder="Oct 15, 2024 at 6:00 PM"
                  value={eventFormData.date_time}
                  onChange={(e) => setEventFormData({...eventFormData, date_time: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>Location</label>
                <select
                  required
                  value={eventFormData.location_id}
                  onChange={(e) => setEventFormData({...eventFormData, location_id: e.target.value})}
                >
                  <option value="">Select a location</option>
                  {pois.map(poi => (
                    <option key={poi.id} value={poi.id}>{poi.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={eventFormData.description}
                  onChange={(e) => setEventFormData({...eventFormData, description: e.target.value})}
                  rows="3"
                />
              </div>
              
              <div className="form-actions">
                <button type="button" onClick={() => setShowEventForm(false)} className="btn-cancel">
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Post Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="quick-actions">
        <button className="action-btn events" onClick={handlePostEvent}>
          📅 Post Event
        </button>
        <button className="action-btn classes" onClick={() => alert('Find Classes - Coming soon!')}>
          📚 Find Classes
        </button>
        <button className="action-btn dining" onClick={() => window.open('https://menu.jojodmo.com/', '_blank')}>
          🍽️ Dining Menus
        </button>
        <button className="action-btn tips" onClick={() => alert('Did You Know: Students get Uber discounts!')}>
          💡 Did You Know?
        </button>
      </div>

      <footer className="footer">
        <div className="footer-content">
          <div className="stats">
            <span>Total Locations: {pois.length}</span>
            <span>Total Events: {events.length}</span>
          </div>
          <div className="backend-info">
            <p>Powered by 5C Maps Backend API</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;