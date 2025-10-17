// Save as: frontend/pages/CourseDetail.jsx

import React, { useState, useEffect } from 'react';
import '../styles/coursedetail.css';

const CourseDetail = ({ course, currentUser, onClose }) => {
  const [posts, setPosts] = useState([]);
  const [showPostForm, setShowPostForm] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postType, setPostType] = useState('temporary');
  const [loading, setLoading] = useState(true);

  const API_BASE = 'https://fivec-maps.onrender.com/api/v1';

  useEffect(() => {
    fetchCoursePosts();
  }, [course.id]);

  const fetchCoursePosts = async () => {
    try {
      const response = await fetch(`${API_BASE}/courses/${course.id}`);
      const data = await response.json();
      setPosts(data.posts || []);
    } catch (err) {
      console.error('Failed to fetch course posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPost = async (e) => {
    e.preventDefault();

    if (currentUser.role === 'guest') {
      alert('Guests cannot post. Please create an account!');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/courses/${course.id}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          course_id: course.id,
          content: postContent,
          post_type: postType
        })
      });

      if (response.ok) {
        if (postType === 'temporary') {
          alert('✅ Review posted! It will disappear in 3 hours.');
          fetchCoursePosts();
        } else {
          alert('✅ Review submitted for admin approval!');
        }
        setPostContent('');
        setShowPostForm(false);
      }
    } catch (err) {
      console.error('Failed to submit post:', err);
      alert('Failed to submit post. Please try again.');
    }
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const posted = new Date(timestamp);
    const diff = Math.floor((now - posted) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
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

  const temporaryPosts = posts.filter(p => p.post_type === 'temporary');
  const permanentPosts = posts.filter(p => p.post_type === 'permanent');

  return (
    <div className="course-detail-container">
      <div className="course-detail-header">
        <div>
          <h2>{course.course_code}-{course.section}</h2>
          <h3 className="course-detail-title">{course.title}</h3>
          <div className="course-meta">
            <span className="course-badge">{course.department_code}</span>
            <span className="course-badge">{course.college}</span>
            <span className={`seats-badge ${course.seats_available?.includes('Closed') ? 'closed' : 'open'}`}>
              {course.seats_available || 'TBA'}
            </span>
          </div>
        </div>
        <button onClick={onClose} className="close-detail-btn">✕</button>
      </div>

      <div className="course-info-section">
        <div className="info-grid">
          <div className="info-item">
            <span className="info-icon">👨‍🏫</span>
            <div>
              <div className="info-label">Instructor</div>
              <div className="info-value">{course.instructors || 'TBA'}</div>
            </div>
          </div>

          {course.days && course.time && (
            <div className="info-item">
              <span className="info-icon">🕐</span>
              <div>
                <div className="info-label">Schedule</div>
                <div className="info-value">{formatDays(course.days)} {course.time}</div>
              </div>
            </div>
          )}

          {course.location && (
            <div className="info-item">
              <span className="info-icon">📍</span>
              <div>
                <div className="info-label">Location</div>
                <div className="info-value">{course.location.name}</div>
              </div>
            </div>
          )}

          <div className="info-item">
            <span className="info-icon">📖</span>
            <div>
              <div className="info-label">Credits</div>
              <div className="info-value">{course.credit}</div>
            </div>
          </div>
        </div>

        {course.notes && (
          <div className="course-notes-box">
            <strong>📝 Notes:</strong> {course.notes}
          </div>
        )}
      </div>

      <div className="posts-section">
        <div className="posts-header">
          <h3>💬 What Students Are Saying</h3>
          <button 
            onClick={() => setShowPostForm(!showPostForm)} 
            className="add-post-btn"
          >
            {showPostForm ? 'Cancel' : '+ Share Your Thoughts'}
          </button>
        </div>

        {showPostForm && (
          <div className="post-form">
            <form onSubmit={handleSubmitPost}>
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="How was this class? Any tips for future students?"
                maxLength="500"
                required
                rows="4"
              />
              <div className="post-form-footer">
                <div className="post-type-selector">
                  <label className={`post-type-option ${postType === 'temporary' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      value="temporary"
                      checked={postType === 'temporary'}
                      onChange={(e) => setPostType(e.target.value)}
                    />
                    <div>
                      <strong>⏱️ Quick Review</strong>
                      <small>Disappears in 3 hours (e.g., "exam next week!")</small>
                    </div>
                  </label>
                  <label className={`post-type-option ${postType === 'permanent' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      value="permanent"
                      checked={postType === 'permanent'}
                      onChange={(e) => setPostType(e.target.value)}
                    />
                    <div>
                      <strong>📌 Full Review</strong>
                      <small>Needs admin approval (e.g., course tips)</small>
                    </div>
                  </label>
                </div>
                <button type="submit" className="submit-post-btn">
                  Post Anonymously
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="loading-posts">Loading reviews...</div>
        ) : (
          <>
            {temporaryPosts.length > 0 && (
              <div className="posts-group">
                <h4>⏱️ Recent Updates</h4>
                <div className="posts-list">
                  {temporaryPosts.map(post => (
                    <div key={post.id} className="post-item temporary">
                      <div className="post-content">{post.content}</div>
                      <div className="post-footer">
                        <span className="post-author">Anonymous</span>
                        <span className="post-time">{getTimeAgo(post.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {permanentPosts.length > 0 && (
              <div className="posts-group">
                <h4>📌 Course Reviews</h4>
                <div className="posts-list">
                  {permanentPosts.map(post => (
                    <div key={post.id} className="post-item permanent">
                      <div className="post-content">{post.content}</div>
                      <div className="post-footer">
                        <span className="post-author">Anonymous</span>
                        <span className="post-time">{getTimeAgo(post.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {temporaryPosts.length === 0 && permanentPosts.length === 0 && (
              <div className="no-posts">
                <p>No reviews yet. Be the first to share your thoughts!</p>
                <p className="hint">Help future students by sharing your experience with this course</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CourseDetail;