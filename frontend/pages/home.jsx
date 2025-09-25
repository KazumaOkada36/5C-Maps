import React, { useState, useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import '../styles/home.css';

// Fix for default markers in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const Home = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [pois, setPois] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  // Backend API base URL
  const API_BASE = 'http://localhost:8080/api/v1';

  // Even tighter boundaries - just the core 5C campus buildings
  const CLAREMONT_BOUNDS = {
    north: 34.1070,  // Just above Scripps/HMC
    south: 34.0930,  // Just below CMC/Pomona  
    east: -117.7040, // Just east of campus buildings
    west: -117.7140  // Just west of campus buildings
  };

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch data from backend
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const [collegesResponse, locationsResponse] = await Promise.all([
          fetch(`${API_BASE}/colleges`),
          fetch(`${API_BASE}/locations`)
        ]);

        if (!collegesResponse.ok || !locationsResponse.ok) {
          throw new Error('Failed to fetch data from backend');
        }

        const collegesData = await collegesResponse.json();
        const locationsData = await locationsResponse.json();

        setColleges(collegesData);
        
        const formattedPOIs = locationsData.map(location => ({
          id: location.id,
          name: location.name,
          category: location.category || 'other',
          lat: location.latitude,
          lng: location.longitude,
          description: `${location.college} - ${location.category}`,
          time: "Check college website for hours",
          college: location.college
        }));

        setPois(formattedPOIs);
        
      } catch (err) {
        console.error('Backend fetch failed:', err);
        setError('Failed to load data from backend. Using fallback data.');
        
        const fallbackData = [
          {
            id: 1,
            name: "Pomona College",
            category: "campus",
            lat: 34.0969,
            lng: -117.7073,
            description: "Main campus",
            time: "Always open",
            college: "Pomona College"
          },
          {
            id: 2,
            name: "CMC Campus", 
            category: "campus",
            lat: 34.0947,
            lng: -117.7099,
            description: "Claremont McKenna College",
            time: "Always open",
            college: "Claremont McKenna College"
          }
        ];
        setPois(fallbackData);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Initialize highly constrained Leaflet map
  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current || mapInstanceRef.current || pois.length === 0) return;

      try {
        // Define strict boundaries
        const bounds = L.latLngBounds(
          [CLAREMONT_BOUNDS.south, CLAREMONT_BOUNDS.west], // Southwest
          [CLAREMONT_BOUNDS.north, CLAREMONT_BOUNDS.east]  // Northeast
        );

        // Create map with maximum performance restrictions
        mapInstanceRef.current = L.map(mapRef.current, {
          center: [34.1000, -117.7090], // Center on 5C campus core
          zoom: 17,       // Even higher zoom to focus tightly on campus buildings
          minZoom: 16,    // Higher minimum zoom - only campus buildings visible
          maxZoom: 18,    // Allow zooming in for building details
          maxBounds: bounds,
          maxBoundsViscosity: 1.0, // Hard boundary enforcement
          
          // Performance optimizations - disable ALL animations
          zoomAnimation: false,
          fadeAnimation: false, 
          markerZoomAnimation: false,
          preferCanvas: true,
          
          // Controlled interactions
          scrollWheelZoom: true,  // Allow zoom with wheel
          doubleClickZoom: false, // Disable double-click zoom
          boxZoom: false,         // Disable box zoom
          keyboard: false,        // Disable keyboard navigation
          dragging: true,         // Allow dragging but constrained by bounds
          touchZoom: true,        // Allow pinch zoom on mobile
          
          // UI controls
          zoomControl: true,
          attributionControl: false
        });

        // Add lightweight tile layer with performance settings
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
          maxZoom: 18,
          // Performance optimizations for tiles
          keepBuffer: 0,           // Don't keep extra tiles
          updateWhenIdle: true,    // Only update when map stops moving
          updateWhenZooming: false, // Don't update while zooming
        }).addTo(mapInstanceRef.current);

        // Fit map to bounds on initialization
        mapInstanceRef.current.fitBounds(bounds, { padding: [20, 20] });

        // Add initial markers
        updateMapMarkers(pois);

        console.log('Map initialized with tight 5C campus boundaries');

      } catch (error) {
        console.error('Failed to initialize map:', error);
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [pois]);

  // Update map markers efficiently
  const updateMapMarkers = (poisToShow) => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers quickly
    markersRef.current.forEach(marker => {
      mapInstanceRef.current.removeLayer(marker);
    });
    markersRef.current = [];

    // Color mapping for categories
    const categoryColors = {
      campus: '#3498db',
      dining: '#f39c12', 
      academic: '#27ae60',
      recreation: '#e74c3c',
      other: '#95a5a6'
    };

    // Add lightweight markers
    poisToShow.forEach(poi => {
      if (!poi.lat || !poi.lng) return;

      const color = categoryColors[poi.category] || categoryColors.other;
      
      // Use simple circle markers for performance
      const marker = L.circleMarker([poi.lat, poi.lng], {
        color: 'white',
        fillColor: color,
        fillOpacity: 0.8,
        radius: 8,
        weight: 2,
        className: 'poi-marker'
      }).addTo(mapInstanceRef.current);

      // Simple popup
      marker.bindPopup(`
        <div class="map-popup">
          <h4>${poi.name}</h4>
          <p><strong>${poi.category}</strong></p>
          <p>${poi.description}</p>
          <small>${poi.time}</small>
        </div>
      `);

      markersRef.current.push(marker);
    });
  };

  // Update markers when filters change
  useEffect(() => {
    if (mapInstanceRef.current && filteredPOIs) {
      updateMapMarkers(filteredPOIs);
    }
  }, [selectedCategory, debouncedSearchTerm]);

  // Filter POIs
  const filteredPOIs = pois.filter(poi => {
    const matchesCategory = selectedCategory === 'all' || poi.category === selectedCategory;
    const matchesSearch = poi.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                         poi.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const availableCategories = [...new Set(pois.map(poi => poi.category))];

  const handlePostEvent = async () => {
    alert('Post Event feature - coming soon! Will integrate with backend.');
  };

  const handleFindClasses = async () => {
    try {
      const response = await fetch(`${API_BASE}/courses`);
      const courses = await response.json();
      if (courses.length === 0) {
        alert('No courses found. Course data will be available once scrapers are implemented.');
      } else {
        alert(`Found ${courses.length} courses! Feature coming soon.`);
      }
    } catch (err) {
      alert('Find Classes feature - coming soon! Backend integration ready.');
    }
  };

  const handleDiningMenus = () => {
    window.open('https://menu.jojodmo.com/', '_blank');
  };

  const handleDidYouKnow = () => {
    const tips = [
      "Students get Uber discounts!",
      "The 5C consortium allows cross-registration between all colleges.",
      "There are hidden study spots in most libraries.",
      "Free printing is available in many campus locations."
    ];
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    alert(`Did You Know: ${randomTip}`);
  };

  if (loading) {
    return (
      <div className="home-container">
        <div className="loading-container">
          <h2>Loading 5C Campus Data...</h2>
          <p>Connecting to backend server...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container">
      <header className="header">
        <h1>5C Interactive Map</h1>
        <div className="controls">
          <input
            type="text"
            placeholder="Search locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="category-dropdown"
          >
            <option value="all">All Categories</option>
            {availableCategories.map(category => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>
        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}
      </header>

      <div className="main-content">
        <div className="map-section">
          <div className="leaflet-map-container">
            <div ref={mapRef} className="leaflet-map"></div>
            <div className="map-overlay">
              <div className="map-info">
                <span className="status-indicator online"></span>
                Interactive Map | {filteredPOIs.length} locations
              </div>
            </div>
          </div>
        </div>
        
        <div className="locations-list">
          <h3>Locations ({filteredPOIs.length})</h3>
          <div className="locations-scroll">
            {filteredPOIs.length === 0 ? (
              <div className="no-results">
                <p>No locations match your search criteria.</p>
                <p>Try adjusting your filters or search term.</p>
              </div>
            ) : (
              filteredPOIs.map(poi => (
                <div key={poi.id} className="location-card">
                  <h4>{poi.name}</h4>
                  <span className={`category ${poi.category}`}>{poi.category}</span>
                  <p>{poi.description}</p>
                  <small>📍 {poi.lat?.toFixed(4)}, {poi.lng?.toFixed(4)}</small>
                  <small>⏰ {poi.time}</small>
                  {poi.college && (
                    <div className="college-tag">{poi.college}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <button className="action-btn events" onClick={handlePostEvent}>
          📅 Post Event
        </button>
        <button className="action-btn classes" onClick={handleFindClasses}>
          📚 Find Classes
        </button>
        <button className="action-btn dining" onClick={handleDiningMenus}>
          🍽️ Dining Menus
        </button>
        <button className="action-btn tips" onClick={handleDidYouKnow}>
          💡 Did You Know?
        </button>
      </div>

      <footer className="footer">
        <div className="footer-content">
          <div className="stats">
            <span>Total Locations: {pois.length}</span>
            <span>Colleges: {colleges.length}</span>
            <span>Categories: {availableCategories.length}</span>
          </div>
          <div className="backend-info">
            <p>Powered by 5C Maps Backend API</p>
            <p>Claremont-focused interactive mapping</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;