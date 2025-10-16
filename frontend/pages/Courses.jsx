// Save as: frontend/pages/Courses.jsx

import React, { useState, useEffect } from 'react';
import '../styles/courses.css';

const Courses = ({ currentUser, onClose, onViewOnMap }) => {
  const [courses, setCourses] = useState([]);
  const [userCourses, setUserCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCollege, setSelectedCollege] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [showMyCoursesOnly, setShowMyCoursesOnly] = useState(false);
  
  const API_BASE = 'https://fivec-maps.onrender.com/api/v1';
  
  const colleges = [
    { code: 'PO', name: 'Pomona College' },
    { code: 'CMC', name: 'Claremont McKenna' },
    { code: 'SC', name: 'Scripps College' },
    { code: 'HMC', name: 'Harvey Mudd' },
    { code: 'PZ', name: 'Pitzer College' }
  ];

  useEffect(() => {
    fetchData();
  }, [selectedCollege, selectedDepartment, searchTerm]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch courses with filters
      let url = `${API_BASE}/courses?`;
      if (selectedCollege) url += `college=${selectedCollege}&`;
      if (selectedDepartment) url += `department=${selectedDepartment}&`;
      if (searchTerm) url += `search=${searchTerm}&`;
      
      const [coursesRes, userCoursesRes, deptsRes] = await Promise.all([
        fetch(url),
        currentUser.id ? fetch(`${API_BASE}/user/courses?user_id=${currentUser.id}`) : Promise.resolve({ json: () => [] }),
        fetch(`${API_BASE}/departments`)
      ]);
      
      const coursesData = await coursesRes.json();
      const userCoursesData = await userCoursesRes.json();
      const deptsData = await deptsRes.json();
      
      setCourses(coursesData.courses || []);
      setUserCourses(userCoursesData || []);
      setDepartments(deptsData || []);
      
    } catch (err) {
      console.error('Failed to fetch courses:', err);
    } finally {
      setLoading(false);
    }
  };

  const isEnrolled = (courseId) => {
    return userCourses.some(uc => uc.course && uc.course.id === courseId);
  };

  const handleAddCourse = async (courseId) => {
    if (currentUser.role === 'guest') {
      alert('Guests cannot add courses. Please create an account!');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/user/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          course_id: courseId
        })
      });

      if (response.ok) {
        alert('✅ Course added to your schedule!');
        fetchData();
      }
    } catch (err) {
      console.error('Failed to add course:', err);
      alert('Failed to add course');
    }
  };

  const handleRemoveCourse = async (userCourseId) => {
    try {
      const response = await fetch(`${API_BASE}/user/courses/${userCourseId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('Course removed from schedule');
        fetchData();
      }
    } catch (err) {
      console.error('Failed to remove course:', err);
      alert('Failed to remove course');
    }
  };

  const handleViewOnMap = (course) => {
    if (course.location) {
      onViewOnMap(course.location);
      onClose();
    } else {
      alert('Location not available for this course');
    }
  };

  const getUserCourseId = (courseId) => {
    const uc = userCourses.find(uc => uc.course && uc.course.id === courseId);
    return uc ? uc.id : null;
  };

  const formatDays = (days) => {
    if (!days) return 'TBA';
    return days.replace(/M/g, 'Mon ')
               .replace(/T/g, 'Tue ')
               .replace(/W/g, 'Wed ')
               .replace(/R/g, 'Thu ')
               .replace(/F/g, 'Fri ')
               .trim();
  };

  const filteredCourses = showMyCoursesOnly
    ? courses.filter(c => isEnrolled(c.id))
    : courses;

  return (
    <div className="courses-container">
      <div className="courses-header">
        <div>
          <h2>📚 Course Catalog</h2>
          <p className="courses-subtitle">Browse and add classes to your schedule</p>
        </div>
        <button onClick={onClose} className="close-courses-btn">✕</button>
      </div>

      <div className="courses-filters">
        <div className="filter-row">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="course-search-input"
            />
          </div>

          <select
            value={selectedCollege}
            onChange={(e) => setSelectedCollege(e.target.value)}
            className="filter-select"
          >
            <option value="">All Colleges</option>
            {colleges.map(c => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>

          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="filter-select"
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.code}>{d.name}</option>
            ))}
          </select>
        </div>

        {currentUser.role !== 'guest' && (
          <div className="filter-row">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={showMyCoursesOnly}
                onChange={(e) => setShowMyCoursesOnly(e.target.checked)}
              />
              <span>Show only my courses ({userCourses.length})</span>
            </label>
          </div>
        )}
      </div>

      {loading ? (
        <div className="courses-loading">Loading courses...</div>
      ) : (
        <div className="courses-list">
          {filteredCourses.length === 0 ? (
            <div className="no-courses">
              <p>No courses found</p>
              {showMyCoursesOnly && (
                <p className="hint">You haven't added any courses yet</p>
              )}
            </div>
          ) : (
            filteredCourses.map(course => (
              <div key={course.id} className="course-card">
                <div className="course-card-header">
                  <div className="course-code-section">
                    <span className="course-code">{course.course_code}-{course.section}</span>
                    <span className={`seats-badge ${course.seats_available?.includes('Closed') ? 'closed' : 'open'}`}>
                      {course.seats_available || 'TBA'}
                    </span>
                  </div>
                  {currentUser.role !== 'guest' && (
                    <button
                      className={`enroll-btn ${isEnrolled(course.id) ? 'enrolled' : ''}`}
                      onClick={() => isEnrolled(course.id) 
                        ? handleRemoveCourse(getUserCourseId(course.id))
                        : handleAddCourse(course.id)
                      }
                    >
                      {isEnrolled(course.id) ? '✓ Added' : '+ Add'}
                    </button>
                  )}
                </div>

                <h3 className="course-title">{course.title}</h3>

                <div className="course-details">
                  <div className="detail-row">
                    <span className="detail-icon">👨‍🏫</span>
                    <span className="detail-text">{course.instructors || 'TBA'}</span>
                  </div>

                  {course.days && course.time && (
                    <div className="detail-row">
                      <span className="detail-icon">🕐</span>
                      <span className="detail-text">
                        {formatDays(course.days)} {course.time}
                      </span>
                    </div>
                  )}

                  {course.location && (
                    <div className="detail-row location-row">
                      <span className="detail-icon">📍</span>
                      <span className="detail-text">{course.location.name}</span>
                      <button
                        className="view-map-btn"
                        onClick={() => handleViewOnMap(course)}
                      >
                        View on Map →
                      </button>
                    </div>
                  )}

                  <div className="detail-row">
                    <span className="detail-icon">🏛️</span>
                    <span className="detail-text">{course.college}</span>
                    <span className="detail-icon">📖</span>
                    <span className="detail-text">{course.credit} credits</span>
                  </div>

                  {course.notes && (
                    <div className="course-notes">
                      <strong>Note:</strong> {course.notes}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {!loading && filteredCourses.length > 0 && (
        <div className="courses-summary">
          Showing {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

export default Courses;