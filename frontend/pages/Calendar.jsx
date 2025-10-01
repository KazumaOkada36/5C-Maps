import React, { useState, useEffect } from 'react';
import '../styles/calendar.css';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0-23 (24 hours)

const Calendar = ({ currentUser, onClose }) => {
  const [currentWeek, setCurrentWeek] = useState([]);
  const [starredEvents, setStarredEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]);

  useEffect(() => {
    // Get current week dates
    const today = new Date();
    const dayOfWeek = today.getDay();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - dayOfWeek);
    
    const week = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(sunday);
      date.setDate(sunday.getDate() + i);
      week.push(date);
    }
    setCurrentWeek(week);

    // Fetch events
    fetchEvents();
    if (currentUser.id) {
      fetchStarredEvents();
    }
  }, [currentUser]);

  const fetchEvents = async () => {
    try {
      const response = await fetch('https://fivec-maps.onrender.com/api/v1/events');
      const data = await response.json();
      setAllEvents(data.filter(e => e.status === 'approved'));
    } catch (err) {
      console.error('Failed to fetch events:', err);
    }
  };

  const fetchStarredEvents = async () => {
    try {
      const response = await fetch(`https://fivec-maps.onrender.com/api/v1/starred?user_id=${currentUser.id}`);
      const data = await response.json();
      const eventStars = data.filter(s => s.item_type === 'event');
      setStarredEvents(eventStars);
    } catch (err) {
      console.error('Failed to fetch starred:', err);
    }
  };

  const formatHour = (hour) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  };

  const getEventsForDateTime = (date, hour) => {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    return allEvents.filter(event => {
      if (!event.event_date || !event.event_time) return false;
      
      // Check if date matches
      if (event.event_date !== dateStr) return false;
      
      // Check if event is starred by user
      const isStarred = starredEvents.some(s => s.item_id === event.id);
      if (!isStarred) return false;
      
      // Parse event time
      const timeParts = event.event_time.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!timeParts) return false;
      
      let eventHour = parseInt(timeParts[1]);
      const eventMinute = parseInt(timeParts[2]);
      const period = timeParts[3].toUpperCase();
      
      // Convert to 24-hour format
      if (period === 'PM' && eventHour !== 12) eventHour += 12;
      if (period === 'AM' && eventHour === 12) eventHour = 0;
      
      return eventHour === hour;
    });
  };

  const navigateWeek = (direction) => {
    const newWeek = currentWeek.map(date => {
      const newDate = new Date(date);
      newDate.setDate(date.getDate() + (direction * 7));
      return newDate;
    });
    setCurrentWeek(newWeek);
  };

  const goToToday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - dayOfWeek);
    
    const week = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(sunday);
      date.setDate(sunday.getDate() + i);
      week.push(date);
    }
    setCurrentWeek(week);
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <div>
          <h2>📅 My Calendar</h2>
          <p className="calendar-subtitle">Starred events appear here automatically</p>
        </div>
        <div className="calendar-nav">
          <button onClick={() => navigateWeek(-1)} className="nav-btn">← Prev</button>
          <button onClick={goToToday} className="today-btn">Today</button>
          <button onClick={() => navigateWeek(1)} className="nav-btn">Next →</button>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>
      </div>

      {currentWeek.length > 0 && (
        <div className="week-display">
          Week of {currentWeek[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      )}

      <div className="calendar-grid-container">
        <table className="calendar-table">
          <thead>
            <tr>
              <th className="time-column">Time</th>
              {currentWeek.map((date, i) => (
                <th key={i} className={isToday(date) ? 'today-column' : ''}>
                  <div className="day-header">
                    <div className="day-name">{DAYS[date.getDay()]}</div>
                    <div className={`day-number ${isToday(date) ? 'today' : ''}`}>
                      {date.getDate()}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map(hour => (
              <tr key={hour} className="hour-row">
                <td className="time-cell">
                  {formatHour(hour)}
                </td>
                {currentWeek.map((date, dayIndex) => {
                  const events = getEventsForDateTime(date, hour);
                  return (
                    <td key={dayIndex} className={`calendar-cell ${isToday(date) ? 'today-cell' : ''}`}>
                      {events.map(event => (
                        <div key={event.id} className="calendar-event">
                          <div className="event-title">{event.title}</div>
                          <div className="event-location">
                            📍 {event.location?.name || 'TBA'}
                          </div>
                          <div className="event-time">{event.event_time}</div>
                        </div>
                      ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {starredEvents.length === 0 && (
        <div className="empty-calendar">
          <p>⭐ Star some events to see them here!</p>
          <p className="hint">Click the star icon on any event to add it to your calendar</p>
        </div>
      )}
    </div>
  );
};

export default Calendar;