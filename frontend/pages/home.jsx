import React, { useState, useEffect, useRef } from 'react';
import '../styles/home.css';

const Home = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [pois, setPois] = useState([]);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  // Mock POI data with real 5C coordinates
  const mockPOIs = [
    {
      id: 1,
      name: "Pomona College - Bridges Auditorium",
      category: "campus",
      lat: 34.0969,
      lng: -117.7073,
      description: "Main performance venue",
      time: "Event times vary"
    },
    {
      id: 2,
      name: "Frank Dining Hall",
      category: "dining",
      lat: 34.0975,
      lng: -117.7080,
      description: "Pomona College dining hall",
      time: "7am-9pm"
    },
    {
      id: 3,
      name: "Rains Athletic Center", 
      category: "recreation",
      lat: 34.0960,
      lng: -117.7065,
      description: "Fitness center and pool",
      time: "6am-11pm"
    },
    {
      id: 4,
      name: "Seaver North - Biology",
      category: "classes",
      lat: 34.0980,
      lng: -117.7070,
      description: "Science building with labs",
      time: "8am-6pm"
    },
    {
      id: 5,
      name: "Claremont McKenna College",
      category: "campus", 
      lat: 34.0947,
      lng: -117.7099,
      description: "CMC main campus",
      time: "Always open"
    },
    {
      id: 6,
      name: "Scripps College",
      category: "campus",
      lat: 34.1015,
      lng: -117.7057,
      description: "Scripps main campus", 
      time: "Always open"
    },
    {
      id: 7,
      name: "Harvey Mudd College",
      category: "campus",
      lat: 34.1060,
      lng: -117.7094,
      description: "HMC main campus",
      time: "Always open"
    },
    {
      id: 8,
      name: "Pitzer College",
      category: "campus",
      lat: 34.1020,
      lng: -117.7115,
      description: "Pitzer main campus",
      time: "Always open"
    },
    {
      id: 9,
      name: "Collins Dining Hall",
      category: "dining",
      lat: 34.0950,
      lng: -117.7095,
      description: "CMC dining hall",
      time: "7am-9pm"
    },
    {
      id: 10,
      name: "Keck Science Center",
      category: "classes",
      lat: 34.1030,
      lng: -117.7080,
      description: "Joint science facility",
      time: "24/7 access with ID"
    }
  ];

  useEffect(() => {
    setPois(mockPOIs);
  }, []);

  // Initialize map when component mounts
  useEffect(() => {
    const initMap = async () => {
      // Dynamically import Leaflet
      const L = await import('leaflet');
      
      if (mapRef.current && !mapInstanceRef.current) {
        // Create map
        mapInstanceRef.current = L.map(mapRef.current).setView([34.1015, -117.7080], 15);
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(mapInstanceRef.current);
        
        // Add markers
        updateMapMarkers(mockPOIs, L);
      }
    };
    
    initMap();
    
    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Function to update map markers
  const updateMapMarkers = async (poisToShow, L) => {
    if (!mapInstanceRef.current || !L) return;
    
    // Clear existing markers
    markersRef.current.forEach(marker => {
      mapInstanceRef.current.removeLayer(marker);
    });
    markersRef.current = [];
    
    // Color mapping for categories
    const categoryColors = {
      campus: '#667eea',
      dining: '#feca57', 
      recreation: '#48dbfb',
      classes: '#4ecdc4',
      events: '#ff6b6b'
    };
    
    // Add new markers
    poisToShow.forEach(poi => {
      const color = categoryColors[poi.category] || '#667eea';
      
      const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="
          background-color: ${color};
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      
      const marker = L.marker([poi.lat, poi.lng], { icon: customIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div class="popup-content">
            <h3>${poi.name}</h3>
            <p><strong>Category:</strong> ${poi.category}</p>
            <p>${poi.description}</p>
            <p><strong>Hours:</strong> ${poi.time}</p>
          </div>
        `);
      
      markersRef.current.push(marker);
    });
  };

  // Update markers when filtered POIs change
  useEffect(() => {
    const updateMarkers = async () => {
      const L = await import('leaflet');
      updateMapMarkers(filteredPOIs, L.default || L);
    };
    
    if (mapInstanceRef.current) {
      updateMarkers();
    }
  }, [selectedCategory, searchTerm]);

  const filteredPOIs = pois.filter(poi => {
    const matchesCategory = selectedCategory === 'all' || poi.category === selectedCategory;
    const matchesSearch = poi.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handlePostEvent = () => {
    alert('Post Event feature - coming soon!');
  };

  const handleFindClasses = () => {
    alert('Find Classes feature - coming soon!');
  };

  const handleDiningMenus = () => {
    window.open('https://menu.jojodmo.com/', '_blank');
  };

  const handleDidYouKnow = () => {
    alert('Did You Know: Students get Uber discounts! Check the resources section.');
  };

  return (
    <div className="home-container">
      <header className="header">
        <h1>🗺️ 5C Interactive Map</h1>
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
            <option value="campus">Campus Buildings</option>
            <option value="dining">Dining</option>
            <option value="recreation">Recreation</option>
            <option value="classes">Classes</option>
            <option value="events">Events</option>
          </select>
        </div>
      </header>

      <div className="main-content">
        <div className="map-section">
          <div className="map-container-leaflet">
            <div ref={mapRef} style={{ height: '100%', width: '100%', borderRadius: '15px' }}></div>
          </div>
          
          <div className="poi-results">
            <h3>Found {filteredPOIs.length} locations</h3>
            <div className="poi-list">
              {filteredPOIs.map(poi => (
                <div key={poi.id} className="poi-card">
                  <h4>{poi.name}</h4>
                  <span className={`poi-category ${poi.category}`}>{poi.category}</span>
                  <p>{poi.description}</p>
                  <small>⏰ {poi.time}</small>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="sidebar">
          <div className="quick-actions">
            <h3>Quick Actions</h3>
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

          <div className="stats-section">
            <h3>Campus Stats</h3>
            <div className="stat">
              <span>Total POIs</span>
              <strong>{pois.length}</strong>
            </div>
            <div className="stat">
              <span>Active Events</span>
              <strong>12</strong>
            </div>
            <div className="stat">
              <span>Open Dining</span>
              <strong>3</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;