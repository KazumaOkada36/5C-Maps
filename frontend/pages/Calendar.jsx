import React, { useState, useEffect } from 'react';
import '../styles/calendar.css';

const Calendar = ({ currentUser, onClose }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('week'); // 'week' or 'month'
  const [starredEvents, setStarredEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]);

  useEffect(() => {
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

  const getWeekDates = () => {
    const start = new Date(currentDate);
    start.setDate(currentDate.getDate() - currentDate.getDay()); // Start on Sunday
    
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    
    return allEvents.filter(event => {
      if (!event.event_date) return false;
      const isStarred = starredEvents.some(s => s.item_id === event.id);
      return event.event_date === dateStr && isStarred;
    });
  };

  const parseEventTime = (timeStr) => {
    if (!timeStr) return null;
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return null;
    
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3].toUpperCase();
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    return hours + minutes / 60;
  };

  const formatEventTime = (timeStr) => {
    if (!timeStr) return '';
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return timeStr;
    return `${match[1]}:${match[2]} ${match[3]}`;
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const navigateWeek = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction * 7));
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const weekDates = getWeekDates();
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="google-calendar">
      {/* Header */}
      <div className="calendar-top-bar">
        <div className="calendar-left-controls">
          <button className="today-button" onClick={goToToday}>
            Today
          </button>
          <div className="nav-arrows">
            <button className="arrow-btn" onClick={() => navigateWeek(-1)}>‹</button>
            <button className="arrow-btn" onClick={() => navigateWeek(1)}>›</button>
          </div>
          <h2 className="current-month">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
        </div>
        <button className="calendar-close-btn" onClick={onClose}>✕</button>
      </div>

      {/* Week View */}
      <div className="week-view-container">
        {/* Days Header */}
        <div className="days-header">
          <div className="time-gutter"></div>
          {weekDates.map((date, i) => (
            <div key={i} className={`day-header ${isToday(date) ? 'today' : ''}`}>
              <div className="day-name">{date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}</div>
              <div className={`day-number ${isToday(date) ? 'today-number' : ''}`}>
                {date.getDate()}
              </div>
            </div>
          ))}
        </div>

        {/* Time Grid */}
        <div className="time-grid-container">
          <div className="time-grid">
            {hours.map(hour => (
              <div key={hour} className="hour-row">
                <div className="time-label">
                  {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                </div>
                {weekDates.map((date, dayIndex) => {
                  const dayEvents = getEventsForDate(date);
                  const hourEvents = dayEvents.filter(event => {
                    const eventHour = parseEventTime(event.event_time);
                    return eventHour !== null && Math.floor(eventHour) === hour;
                  });

                  return (
                    <div key={dayIndex} className={`time-slot ${isToday(date) ? 'today-slot' : ''}`}>
                      {hourEvents.map(event => (
                        <div key={event.id} className="calendar-event-block">
                          <div className="event-time-small">{formatEventTime(event.event_time)}</div>
                          <div className="event-title-small">{event.title}</div>
                          {event.location && (
                            <div className="event-location-small">📍 {event.location.name}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Empty State */}
        {starredEvents.length === 0 && (
          <div className="calendar-empty-state">
            <div className="empty-icon">📅</div>
            <h3>No events yet</h3>
            <p>Star some events to see them on your calendar</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Calendar;