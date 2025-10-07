import React, { useState, useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import '../styles/home.css';
import Calendar from './Calendar.jsx';
import LocationDetail from './LocationDetail.jsx';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';


delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const Home = ({ currentUser, onLogout }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [pois, setPois] = useState([]);
  const [events, setEvents] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [pendingPosts, setPendingPosts] = useState([]);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [expandedEventType, setExpandedEventType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [starredItems, setStarredItems] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [eventFormData, setEventFormData] = useState({
    title: '',
    event_type: 'fun',
    event_date: '',
    event_time: '',
    time_period: 'AM',
    location_id: '',
    description: ''
  });
  
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const activePinRef = useRef(null);
  const userMarkerRef = useRef(null);
  const searchDropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const [showLocationDetail, setShowLocationDetail] = useState(false); // Add this new state
  const [routingControl, setRoutingControl] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [routeCollapsed, setRouteCollapsed] = useState(false);


  const API_BASE = 'https://fivec-maps.onrender.com/api/v1';

  const CLAREMONT_BOUNDS = {
    north: 34.1070,
    south: 34.0930,
    east: -117.7040,
    west: -117.7140
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchDropdownRef.current && 
        !searchDropdownRef.current.contains(event.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target)
      ) {
        setShowSearchDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get search results
  const getSearchResults = () => {
    if (!searchTerm.trim()) return [];
    
    const term = searchTerm.toLowerCase();
    const results = pois.filter(poi => 
      poi.name.toLowerCase().includes(term) ||
      poi.college.toLowerCase().includes(term) ||
      poi.category.toLowerCase().includes(term)
    );

    // Group by category
    const grouped = {
      dining: results.filter(r => r.category === 'dining'),
      academic: results.filter(r => r.category === 'academic'),
      recreation: results.filter(r => r.category === 'recreation'),
      other: results.filter(r => !['dining', 'academic', 'recreation'].includes(r.category))
    };

    return grouped;
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setShowSearchDropdown(true);
  };

  const handleSearchResultClick = (poi) => {
    setSearchTerm(poi.name);
    setShowSearchDropdown(false);
    setSelectedLocation(poi); // Add this line to show mini card
    focusOnLocation(poi);
  };

  const highlightMatch = (text, search) => {
    if (!search.trim()) return text;
    
    const parts = text.split(new RegExp(`(${search})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === search.toLowerCase() 
        ? <mark key={i} style={{ background: '#ffc107', padding: '2px' }}>{part}</mark>
        : part
    );
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
          college: location.college,
          description: location.description,
          fun_facts: location.fun_facts
        }));

        setPois(formattedPOIs);
        
        const approved = eventsData.filter(e => e.status !== 'pending');
        const pending = eventsData.filter(e => e.status === 'pending');
        setEvents(approved);
        setPendingEvents(pending);
        
        if (currentUser.id) {
          fetchStarredItems();
        }

        if (currentUser.role === 'admin') {
          fetchPendingPosts();
        }
      } catch (err) {
        console.error('Failed to fetch:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  const fetchPendingPosts = async () => {
    try {
      const response = await fetch(`${API_BASE}/posts/pending`);
      const data = await response.json();
      setPendingPosts(data);
    } catch (err) {
      console.error('Failed to fetch pending posts:', err);
    }
  };

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

  const fetchStarredItems = async () => {
    try {
      const response = await fetch(`${API_BASE}/starred?user_id=${currentUser.id}`);
      const data = await response.json();
      setStarredItems(data);
    } catch (err) {
      console.error('Failed to fetch starred:', err);
    }
  };
  //to get directions
  const getDirections = (destination) => {
    if (!userLocation) {
      alert('Please enable location services to get directions');
      return;
    }

    if (!mapInstanceRef.current) return;

    // Remove existing route if there is one
    if (routingControl) {
      mapInstanceRef.current.removeControl(routingControl);
    }

    // MapBox token - replace with your actual token
    const MAPBOX_TOKEN = 'pk.eyJ1Ijoia2F6dW1hb2thZGE2IiwiYSI6ImNtZ2d2cGl2YzBvZXkybHB5d3Fnd21zNjEifQ.zaEw5vTQTbZEWXpy8_2Jrg'; // PASTE YOUR TOKEN HERE

    // Create routing control with MapBox
    const control = L.Routing.control({
      waypoints: [
        L.latLng(userLocation.lat, userLocation.lng),
        L.latLng(destination.lat, destination.lng)
      ],
      router: L.Routing.mapbox(MAPBOX_TOKEN, {
        profile: 'mapbox/walking' // Use walking profile for pedestrian paths
      }),
      lineOptions: {
        styles: [{ color: '#667eea', weight: 5, opacity: 0.7 }]
      },
      show: false,
      addWaypoints: false,
      routeWhileDragging: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      showAlternatives: false,
      createMarker: function() { return null; }
    }).addTo(mapInstanceRef.current);

    // Listen for when route is calculated
    control.on('routesfound', function(e) {
      const routes = e.routes;
      const summary = routes[0].summary;
      
      // Distance in meters, time in seconds
      const distanceKm = (summary.totalDistance / 1000).toFixed(2);
      const distanceMiles = (summary.totalDistance / 1609.34).toFixed(2);
      const timeMinutes = Math.round(summary.totalTime / 60);
      
      // Calculate time for different modes
      const walkTime = timeMinutes;
      const bikeTime = Math.max(1, Math.round(timeMinutes / 3));
      const scooterTime = Math.max(1, Math.round(timeMinutes / 2.5));
      
      setRouteInfo({
        distance: distanceMiles,
        distanceKm: distanceKm,
        walkTime: walkTime,
        bikeTime: bikeTime,
        scooterTime: scooterTime,
        destination: destination.name
      });
    });

    setRoutingControl(control);
  };
    
  //clearing directions
  const clearDirections = () => {
    if (routingControl && mapInstanceRef.current) {
      mapInstanceRef.current.removeControl(routingControl);
      setRoutingControl(null);
      setRouteInfo(null);
      setRouteCollapsed(false); // Add this line
    }
  };

  const isStarred = (itemType, itemId) => {
    return starredItems.some(s => s.item_type === itemType && s.item_id === itemId);
  };

  const handleStar = async (itemType, itemId) => {
    if (currentUser.role === 'guest') {
      alert('Guests cannot star items. Please create an account!');
      return;
    }

    const starred = starredItems.find(s => s.item_type === itemType && s.item_id === itemId);
    
    if (starred) {
      try {
        await fetch(`${API_BASE}/starred/${starred.id}`, { method: 'DELETE' });
        setStarredItems(starredItems.filter(s => s.id !== starred.id));
      } catch (err) {
        console.error('Failed to unstar:', err);
      }
    } else {
      try {
        const response = await fetch(`${API_BASE}/starred`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: currentUser.id,
            item_type: itemType,
            item_id: itemId
          })
        });
        const data = await response.json();
        setStarredItems([...starredItems, data]);
        
        if (itemType === 'event') {
          alert('⭐ Event added to your calendar!');
        }
      } catch (err) {
        console.error('Failed to star:', err);
      }
    }
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
    return pois.filter(poi => poi.category === category);  // Use 'pois' not 'filteredBySearch'
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
    setSelectedLocation(poi);
    setShowLocationDetail(false);
    if (mapInstanceRef.current && poi.lat && poi.lng) {
      mapInstanceRef.current.setView([poi.lat, poi.lng], 18);
      showPinForLocation(poi);
    }
  };

const showPinForLocation = (poi) => {
  if (!mapInstanceRef.current) return;

  // Remove previous pin if it exists
  if (activePinRef.current) {
    mapInstanceRef.current.removeLayer(activePinRef.current);
  }

  if (!poi.lat || !poi.lng) return;

  // Create a classic marker pin
  const marker = L.marker([poi.lat, poi.lng], {
    icon: L.icon({
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    })
  }).addTo(mapInstanceRef.current);

  marker.bindPopup(`
    <div class="map-popup">
      <h4>${poi.name}</h4>
      <p><strong>${poi.category}</strong></p>
      <p>${poi.college}</p>
    </div>
  `).openPopup();

  activePinRef.current = marker;
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
    if (currentUser.role === 'guest') {
      alert('Guests cannot post events. Please login as a student or admin.');
      return;
    }
    setShowEventForm(true);
  };

  const submitEvent = async (e) => {
    e.preventDefault();
    
    const formattedTime = `${eventFormData.event_time} ${eventFormData.time_period}`;
    const dateTimeString = `${new Date(eventFormData.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${formattedTime}`;
    
    try {
      const response = await fetch(`${API_BASE}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...eventFormData,
          event_time: formattedTime,
          date_time: dateTimeString,
          created_by: currentUser.username,
          status: currentUser.role === 'admin' ? 'approved' : 'pending'
        })
      });
      
      if (response.ok) {
        const newEvent = await response.json();
        
        if (currentUser.role === 'admin') {
          setEvents([...events, newEvent]);
          alert('Event posted and approved!');
        } else {
          setPendingEvents([...pendingEvents, newEvent]);
          alert('Event submitted for approval!');
        }
        
        setShowEventForm(false);
        setEventFormData({
          title: '',
          event_type: 'fun',
          event_date: '',
          event_time: '',
          time_period: 'AM',
          location_id: '',
          description: ''
        });
      }
    } catch (err) {
      console.error('Failed to post event:', err);
      alert('Failed to post event. Please try again.');
    }
  };

  const handleApproveEvent = async (eventId, approved) => {
    const event = pendingEvents.find(e => e.id === eventId);
    if (approved) {
      try {
        await fetch(`${API_BASE}/events/${eventId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'approved' })
        });
        setEvents([...events, { ...event, status: 'approved' }]);
      } catch (err) {
        console.error('Failed to approve event:', err);
      }
    } else {
      try {
        await fetch(`${API_BASE}/events/${eventId}`, { method: 'DELETE' });
      } catch (err) {
        console.error('Failed to delete event:', err);
      }
    }
    setPendingEvents(pendingEvents.filter(e => e.id !== eventId));
  };

  const handleApprovePost = async (postId, approved) => {
    try {
      if (approved) {
        await fetch(`${API_BASE}/posts/${postId}/approve`, {
          method: 'PATCH'
        });
        alert('✅ Post approved!');
      } else {
        await fetch(`${API_BASE}/posts/${postId}`, {
          method: 'DELETE'
        });
        alert('Post rejected');
      }
      fetchPendingPosts();
    } catch (err) {
      console.error('Failed to handle post:', err);
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

  const searchResults = getSearchResults();
  const hasResults = Object.values(searchResults).some(arr => arr.length > 0);

  return (
    <div className="home-container">
      <header className="header">
        <div className="header-left">
          <div className="chizu-header-logo">
            <span className="logo-icon-small">🗾</span>
            <h1>Chizu</h1>
          </div>
          <span className="setShowSearchDropdowntagline">5C Campus Navigation</span>
        </div>
        <div className="header-right">
          <div className="search-container">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search locations..."
              value={searchTerm}
              onChange={handleSearchChange}
              onFocus={() => searchTerm && setShowSearchDropdown(true)}
              className="search-input"
            />
            {showSearchDropdown && searchTerm && (
              <div ref={searchDropdownRef} className="search-dropdown">
                {!hasResults ? (
                  <div className="search-no-results">
                    No locations found for "{searchTerm}"
                  </div>
                ) : (
                  <>
                    {searchResults.dining.length > 0 && (
                      <div className="search-category">
                        <div className="search-category-title">🍽️ Dining</div>
                        {searchResults.dining.map(poi => (
                          <div 
                            key={poi.id}
                            className="search-result-item"
                            onClick={() => handleSearchResultClick(poi)}
                          >
                            <div className="search-result-name">
                              {highlightMatch(poi.name, searchTerm)}
                            </div>
                            <div className="search-result-college">{poi.college}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {searchResults.academic.length > 0 && (
                      <div className="search-category">
                        <div className="search-category-title">📚 Academic</div>
                        {searchResults.academic.map(poi => (
                          <div 
                            key={poi.id}
                            className="search-result-item"
                            onClick={() => handleSearchResultClick(poi)}
                          >
                            <div className="search-result-name">
                              {highlightMatch(poi.name, searchTerm)}
                            </div>
                            <div className="search-result-college">{poi.college}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {searchResults.recreation.length > 0 && (
                      <div className="search-category">
                        <div className="search-category-title">🏋️ Recreation</div>
                        {searchResults.recreation.map(poi => (
                          <div 
                            key={poi.id}
                            className="search-result-item"
                            onClick={() => handleSearchResultClick(poi)}
                          >
                            <div className="search-result-name">
                              {highlightMatch(poi.name, searchTerm)}
                            </div>
                            <div className="search-result-college">{poi.college}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {searchResults.other.length > 0 && (
                      <div className="search-category">
                        <div className="search-category-title">📍 Other</div>
                        {searchResults.other.map(poi => (
                          <div 
                            key={poi.id}
                            className="search-result-item"
                            onClick={() => handleSearchResultClick(poi)}
                          >
                            <div className="search-result-name">
                              {highlightMatch(poi.name, searchTerm)}
                            </div>
                            <div className="search-result-college">{poi.college}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          <div className="user-info">
            <span className="user-name">{currentUser.name}</span>
            <span className={`user-badge ${currentUser.role}`}>{currentUser.role}</span>
            <button onClick={onLogout} className="logout-btn">Logout</button>
          </div>
        </div>
      </header>
      {selectedLocation && !showLocationDetail && (
      <div className="mini-location-card">
        <div className="mini-card-content">
          <div className="mini-card-info">
            <div className="mini-card-name">{selectedLocation.name}</div>
            <div className="mini-card-college">{selectedLocation.college}</div>
          </div>
          <button 
            className="mini-card-directions"
            onClick={() => getDirections(selectedLocation)}
          >
            🧭 Directions
          </button>
          <button 
            className="mini-card-see-more"
            onClick={() => setShowLocationDetail(true)}
          >
            See More →
          </button>
          <button 
            className="mini-card-close"
            onClick={() => {
              setSelectedLocation(null);
              clearDirections();
            }}
          >
            ✕
          </button>
        </div>
      </div>
    )}
    {routeInfo && (
    <div className={`route-info-card ${routeCollapsed ? 'collapsed' : ''}`}>
      <div className="route-header">
        <h3>Directions to {routeInfo.destination}</h3>
        <div className="route-header-actions">
          <button 
            onClick={() => setRouteCollapsed(!routeCollapsed)} 
            className="collapse-route-btn"
          >
            {routeCollapsed ? '▲' : '▼'}
          </button>
          <button onClick={clearDirections} className="close-route-btn">✕</button>
        </div>
      </div>
      {!routeCollapsed && (
        <div className="route-details">
          <div className="route-distance">
            📏 {routeInfo.distance} miles ({routeInfo.distanceKm} km)
          </div>
          <div className="route-modes">
            <div className="route-mode">
              <span className="mode-icon">🚶</span>
              <span className="mode-time">{routeInfo.walkTime} min</span>
              <span className="mode-label">Walking</span>
            </div>
            <div className="route-mode">
              <span className="mode-icon">🚴</span>
              <span className="mode-time">{routeInfo.bikeTime} min</span>
              <span className="mode-label">Biking</span>
            </div>
            <div className="route-mode">
              <span className="mode-icon">🛴</span>
              <span className="mode-time">{routeInfo.scooterTime} min</span>
              <span className="mode-label">Scooter</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )}
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
          
          {(currentUser.role === 'student' || currentUser.role === 'guest') && (
            <div className="category-section">
              <button 
                className="category-btn calendar-btn"
                onClick={() => setShowCalendar(true)}
              >
                <span className="category-icon">📅</span>
                <span className="category-name">My Calendar</span>
                {starredItems.filter(s => s.item_type === 'event').length > 0 && (
                  <span className="category-count star-badge">
                    {starredItems.filter(s => s.item_type === 'event').length}
                  </span>
                )}
              </button>
            </div>
          )}

          {currentUser.role === 'admin' && pendingEvents.length > 0 && (
            <div className="category-section">
              <button 
                className="category-btn approval-btn"
                onClick={() => setExpandedCategory('event-approvals')}
              >
                <span className="category-icon">✅</span>
                <span className="category-name">Event Approvals</span>
                <span className="category-count pending-badge">{pendingEvents.length}</span>
                <span className="expand-icon">{expandedCategory === 'event-approvals' ? '▼' : '▶'}</span>
              </button>
              
              {expandedCategory === 'event-approvals' && (
                <div className="approval-list">
                  {pendingEvents.map(event => (
                    <div key={event.id} className="approval-item">
                      <div className="approval-header">
                        <strong>{event.title}</strong>
                        <span className="pending-tag">PENDING</span>
                      </div>
                      <div className="approval-details">
                        <div>{event.date_time}</div>
                        {event.location && <div>📍 {event.location.name}</div>}
                        <div className="approval-actions">
                          <button 
                            onClick={() => handleApproveEvent(event.id, true)}
                            className="approve-btn"
                          >
                            ✓ Approve
                          </button>
                          <button 
                            onClick={() => handleApproveEvent(event.id, false)}
                            className="reject-btn"
                          >
                            ✕ Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentUser.role === 'admin' && pendingPosts.length > 0 && (
            <div className="category-section">
              <button 
                className="category-btn approval-btn"
                onClick={() => setExpandedCategory('post-approvals')}
              >
                <span className="category-icon">💬</span>
                <span className="category-name">Post Approvals</span>
                <span className="category-count pending-badge">{pendingPosts.length}</span>
                <span className="expand-icon">{expandedCategory === 'post-approvals' ? '▼' : '▶'}</span>
              </button>
              
              {expandedCategory === 'post-approvals' && (
                <div className="approval-list">
                  {pendingPosts.map(post => (
                    <div key={post.id} className="approval-item">
                      <div className="approval-header">
                        <strong>Location Post</strong>
                        <span className="pending-tag">PENDING</span>
                      </div>
                      <div className="approval-details">
                        <div className="post-preview">{post.content}</div>
                        <div className="approval-actions">
                          <button 
                            onClick={() => handleApprovePost(post.id, true)}
                            className="approve-btn"
                          >
                            ✓ Approve
                          </button>
                          <button 
                            onClick={() => handleApprovePost(post.id, false)}
                            className="reject-btn"
                          >
                            ✕ Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
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
                                      <div className="event-header-row">
                                        <div className="event-title">{event.title}</div>
                                        {currentUser.role !== 'guest' && (
                                          <button
                                            className={`star-btn ${isStarred('event', event.id) ? 'starred' : ''}`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleStar('event', event.id);
                                            }}
                                          >
                                            {isStarred('event', event.id) ? '⭐' : '☆'}
                                          </button>
                                        )}
                                      </div>
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
                        <div key={poi.id} className="location-item-container">
                          <div 
                            className="location-item"
                            onClick={() => focusOnLocation(poi)}
                          >
                            <div className="location-header-row">
                              <div>
                                <div className="location-name">{poi.name}</div>
                                <div className="location-college">{poi.college}</div>
                              </div>
                              {currentUser.role !== 'guest' && (
                                <button
                                  className={`star-btn ${isStarred('location', poi.id) ? 'starred' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStar('location', poi.id);
                                  }}
                                >
                                  {isStarred('location', poi.id) ? '⭐' : '☆'}
                                </button>
                              )}
                            </div>
                          </div>
                          <button 
                            className="see-more-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLocation(poi);
                            }}
                          >
                            See More →
                          </button>
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
            {currentUser.role === 'student' && (
              <p className="info-message">Your event will be submitted for admin approval</p>
            )}
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
                <label>Event Date</label>
                <input
                  type="date"
                  required
                  value={eventFormData.event_date}
                  onChange={(e) => setEventFormData({...eventFormData, event_date: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              
              <div className="form-group">
                <label>Event Time</label>
                <div className="time-input-group">
                  <input
                    type="time"
                    required
                    value={eventFormData.event_time}
                    onChange={(e) => setEventFormData({...eventFormData, event_time: e.target.value})}
                    className="time-input"
                  />
                  <select
                    value={eventFormData.time_period}
                    onChange={(e) => setEventFormData({...eventFormData, time_period: e.target.value})}
                    className="period-select"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
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
                  {currentUser.role === 'admin' ? 'Post Event' : 'Submit for Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCalendar && (
        <div className="modal-overlay" onClick={() => setShowCalendar(false)}>
          <div className="modal-content calendar-modal" onClick={(e) => e.stopPropagation()}>
            <Calendar currentUser={currentUser} onClose={() => setShowCalendar(false)} />
          </div>
        </div>
      )}

      {showLocationDetail && selectedLocation && (
        <div className="modal-overlay" onClick={() => setShowLocationDetail(false)}>
          <div className="modal-content location-detail-modal" onClick={(e) => e.stopPropagation()}>
            <LocationDetail 
              location={selectedLocation} 
              currentUser={currentUser}
              onClose={() => {
                setShowLocationDetail(false);
                setSelectedLocation(null);
              }}
            />
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
      </div>

      <footer className="footer">
        <div className="footer-content">
          <div className="stats">
            <span>Total Locations: {pois.length}</span>
            <span>Total Events: {events.length}</span>
            {currentUser.role === 'admin' && (pendingEvents.length > 0 || pendingPosts.length > 0) && (
              <span className="pending-stat">
                Pending Approvals: {pendingEvents.length + pendingPosts.length}
              </span>
            )}
          </div>
          <div className="backend-info">
            <p>Powered by Chizu 🗾</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;