import React, { useState, useEffect } from 'react';
import '../styles/schedule.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = ['8:00 AM', '9:35 AM', '11:00 AM', '1:15 PM', '2:50 PM', '4:15 PM'];

const BUILDINGS = [
  { id: 1, name: 'Seaver North', code: 'SN' },
  { id: 2, name: 'Seaver South', code: 'SS' },
  { id: 3, name: 'Carnegie Hall', code: 'CH' },
  { id: 4, name: 'Millikan Laboratory', code: 'ML' },
  { id: 5, name: 'Kravis Center', code: 'KC' },
  { id: 6, name: 'Bauer Center', code: 'BC' },
  { id: 7, name: 'Balch Hall', code: 'BH' },
  { id: 8, name: 'Parsons Engineering', code: 'PE' },
  { id: 9, name: 'Fletcher Hall', code: 'FH' }
];

const Schedule = ({ currentUser, onClose }) => {
  const [schedule, setSchedule] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    courseName: '',
    building: '',
    day: 'Monday',
    time: '8:00 AM'
  });

  useEffect(() => {
    if (currentUser.role === 'student') {
      const saved = localStorage.getItem(`schedule_${currentUser.username}`);
      if (saved) {
        setSchedule(JSON.parse(saved));
      }
    }
  }, [currentUser]);

  const handleAddClass = (e) => {
    e.preventDefault();
    const newClass = {
      ...formData,
      id: Date.now()
    };
    
    const updated = [...schedule, newClass];
    setSchedule(updated);
    
    if (currentUser.role === 'student') {
      localStorage.setItem(`schedule_${currentUser.username}`, JSON.stringify(updated));
    }
    
    setFormData({
      courseName: '',
      building: '',
      day: 'Monday',
      time: '8:00 AM'
    });
    setShowAddForm(false);
  };

  const handleDeleteClass = (id) => {
    const updated = schedule.filter(c => c.id !== id);
    setSchedule(updated);
    
    if (currentUser.role === 'student') {
      localStorage.setItem(`schedule_${currentUser.username}`, JSON.stringify(updated));
    }
  };

  return (
    <div className="schedule-container">
      <div className="schedule-header">
        <h2>📚 My Class Schedule</h2>
        {currentUser.role === 'guest' && (
          <p className="guest-warning">⚠️ Guest mode: Changes will not be saved</p>
        )}
        <div className="schedule-actions">
          <button onClick={() => setShowAddForm(true)} className="add-class-btn">
            + Add Class
          </button>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>
      </div>

      <div className="schedule-grid-container">
        <table className="schedule-table">
          <thead>
            <tr>
              <th className="time-column">Time</th>
              {DAYS.map(day => (
                <th key={day}>{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map(time => (
              <tr key={time}>
                <td className="time-cell">{time}</td>
                {DAYS.map(day => {
                  const classItem = schedule.find(
                    c => c.day === day && c.time === time
                  );
                  return (
                    <td key={`${day}-${time}`} className="schedule-cell">
                      {classItem ? (
                        <div className="class-block">
                          <div className="class-name">{classItem.courseName}</div>
                          <div className="class-building">{classItem.building}</div>
                          <button
                            onClick={() => handleDeleteClass(classItem.id)}
                            className="delete-class-btn"
                          >
                            ✕
                          </button>
                        </div>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Add Class to Schedule</h3>
            <form onSubmit={handleAddClass}>
              <div className="form-group">
                <label>Course Name</label>
                <input
                  type="text"
                  value={formData.courseName}
                  onChange={(e) => setFormData({...formData, courseName: e.target.value})}
                  placeholder="e.g., CS 51, MATH 60"
                  required
                />
              </div>

              <div className="form-group">
                <label>Building</label>
                <select
                  value={formData.building}
                  onChange={(e) => setFormData({...formData, building: e.target.value})}
                  required
                >
                  <option value="">Select Building</option>
                  {BUILDINGS.map(b => (
                    <option key={b.id} value={`${b.name} (${b.code})`}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Day</label>
                <select
                  value={formData.day}
                  onChange={(e) => setFormData({...formData, day: e.target.value})}
                >
                  {DAYS.map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Time Slot</label>
                <select
                  value={formData.time}
                  onChange={(e) => setFormData({...formData, time: e.target.value})}
                >
                  {TIME_SLOTS.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowAddForm(false)} className="btn-cancel">
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Add Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;